# Sweepy Architecture

Technical reference for the Uma Musume auto-trainer internals.

## System Overview

```
main.py                          Entry point: ADB device selection, time window enforcer, uvicorn server
  bot/
    server/handler.py            FastAPI REST API (port 8071)
    engine/scheduler.py          Task queue with threading locks, cron support
    engine/executor.py           Screen capture → UI detection → handler dispatch loop
    conn/u2_ctrl.py              ADB controller: screencap, input injection, socket transport
    recog/
      image_matcher.py           Template matching with 8K-entry LRU cache, 16 workers
      ocr.py                     PaddleOCR wrapper with 12K-entry LRU cache (JP/CH/EN)
      digit_cnn.py               PyTorch CNN for stat digit recognition
      character_detector.py      HSV/LAB histogram feature extraction for support card icons
      energy_scanner.py          Pixel-level energy bar reader (row y=161, start x=227)
      training_stat_scanner.py   CNN-based stat gain OCR from training screen
    base/
      task.py                    Task model, status enum, execution modes
      purge.py                   State persistence (JSON), resource cleanup, instance locking
      resource.py                Template/UI resource loading
  module/umamusume/
    scenario/                    Scenario implementations (URA, Aoharu, MANT)
    script/cultivate_task/
      ai.py                      Training decision algorithm
      training_select.py         Training screen parsing + selection execution
      event/manifest.py          Event database lookup + weighted choice scoring
      skill_learning.py          Skill purchase logic
      race_handlers.py           Race detection and execution
  web/                           Vue.js SPA frontend
  public/                        Built frontend assets
  resource/                      Template images, event data JSON
  userdata/                      Persisted state (tasks, presets, scheduler)
```

## ADB Layer (`bot/conn/u2_ctrl.py`)

`U2AndroidController` handles all device communication:

- **Path resolution**: `_get_adb()` checks `shutil.which("adb")` first, falls back to `deps/adb/adb.exe` (Windows)
- **Screenshot capture**: Two methods:
  1. **Socket transport** (`_capture_via_socket`): Direct TCP to ADB daemon on port 5037, sends transport + exec bytes, reads raw RGBA framebuffer. Fastest path.
  2. **Subprocess fallback** (`_get_screen_subprocess`): `adb exec-out screencap` with raw output parsing. Used when socket fails.
- **Frame caching**: `_cache_max_age = 0.120s` — repeated calls within 120ms return cached frame
- **Input injection**: `adb shell input tap x y` with ±3px random drift and configurable delay (`config.bot.auto.adb.delay`, default 0.38s)
- **Screen dimensions**: Parsed from `adb shell wm size`, cached after first call

Device config from `config.yaml`:
```yaml
bot:
  auto:
    adb:
      delay: 0.38
      device_name: "192.168.240.112:5555"
    cpu_alloc: 4
```

## Task System

### Task Model (`bot/base/task.py`)

```python
class Task:
    task_id: str          # Random 5-char + timestamp
    app_name: str         # "umamusume"
    task_execute_mode: int
    task_status: int
    cron_job_config: CronJobConfig
    attachment: Any       # Scenario-specific TaskDetail
```

**Execution modes**:
| Mode | Value | Behavior |
|------|-------|----------|
| ONE_TIME | 1 | Run once, mark complete |
| CRON_JOB | 2 | Spawns ONE_TIME copies on cron schedule |
| LOOP | 3 | Reset to PENDING after completion, repeat |
| TEAM_TRIALS | 4 | Single team challenge run |
| FULL_AUTO | 5 | Like LOOP but handles TP recovery and run init |

**Status flow**: `PENDING → RUNNING → SUCCESS/FAILED/INTERRUPT`

### Scheduler (`bot/engine/scheduler.py`)

Single-threaded poll loop (1s interval):
1. Check `active` flag
2. For each task in `task_list`:
   - ONE_TIME/TEAM_TRIALS: execute if PENDING
   - FULL_AUTO/LOOP: reset to PENDING after completion
   - CRON_JOB: compare `croniter.get_next()` against current time, spawn copy
3. Every 60 iterations: `cleanup_completed_tasks()`

Thread safety via `_executor_lock` (threading.Lock) on all task list mutations.

### Executor (`bot/engine/executor.py`)

Main execution loop per task:

```
while active:
    frame = controller.get_screen()
    gray = cv2.cvtColor(frame, COLOR_BGR2GRAY)
    matched_ui = detect_ui(ui_list, gray)  # Parallel template matching
    handler = get_handler(matched_ui)
    handler.execute(context, frame)
```

UI detection uses `ThreadPoolExecutor(max_workers=cpu_alloc)` for parallel template matching across all registered UI states. First match wins (early termination via shared result list).

## Recognition Pipeline

### Template Matching (`bot/recog/image_matcher.py`)

- **Preloading**: `preload_templates('resource')` caches all template PNGs at startup
- **Two-tier cache**:
  - `TEMPLATE_IMAGE_CACHE`: Full resolution grayscale
  - `TEMPLATE_SMALL_CACHE`: 0.5x downsampled (for templates ≥16px)
- **Result cache**: 8K entries, key = `f"{img_hash}:{template_hash}:{roi_key}"`
- **Match algorithm**: `cv2.matchTemplate` with `TM_CCOEFF_NORMED`, threshold default 0.86
- **Coarse rejection**: Threshold 0.52 on downsampled images before full-res check
- **Parallelism**: 16-worker ThreadPoolExecutor

### OCR (`bot/recog/ocr.py`)

- **Backend**: PaddleOCR (lazy-loaded per language)
- **Cache**: LRU 12K entries, key = `f"{lang}:{hash(img.tobytes())}"`
- **GPU**: Controlled by `CONFIG.bot.gpu.enabled` (auto/true/false), `memory_fraction` for VRAM allocation
- **Languages**: JP (game text), CH (events), EN (numbers/labels)

### Stat Recognition (`bot/recog/digit_cnn.py`)

PyTorch CNN classifier for digit recognition from training stat images:
- Input: Grayscale cropped digit images
- Output: Digit class (0-9)
- Model: Loaded from `resource/` directory

### Energy Scanner (`bot/recog/energy_scanner.py`)

Pixel-level analysis:
- Reference row at y=161, scanning from x=227
- Detects bar end by finding gray pixels (117,117,117) after colored bar
- Compares current length to reference (0-energy) length
- Returns integer energy percentage

### Character Detection (`bot/recog/character_detector.py`)

Support card icon identification:
1. Circle validation via Canny edge detection (ring mask, edge ratio ≤0.15 = no circle)
2. Feature extraction: HSV histogram (30+12 bins), LAB histogram (12×3 bins), grayscale histogram
3. Regional masks: hair, face, body, ears with quadrant weights [1.5, 1.5, 0.5, 0.5]
4. Icons extracted to 92×92px for matching against baked templates

## Training AI (`module/umamusume/script/cultivate_task/ai.py`)

Decision tree evaluated each turn:

```
1. if energy ≤ 80 and medic_available → MEDIC
2. if mood < threshold and energy < 80 → TRIP (check PAL recreation first)
3. if energy ≤ rest_threshold (default 48) → REST (override with PAL if conditions met)
4. if debut_race available at dates 73-99 → RACE
5. else → score all 5 training types, pick highest
```

### Training Scoring

Per training facility, for each support card present:

```python
score = 0.0
w_lv1, w_lv2 = weights_for_date(current_date)
# Junior: (0.11, 0.10), Classic: (0.11, 0.10), Senior early: (0.11, 0.10), Senior late: (0.03, 0.05)

for card in facility.support_cards:
    if card.favor == LEVEL_1: score += w_lv1
    elif card.favor == LEVEL_2: score += w_lv2
    # LEVEL_3/4: no contribution (already maxed)

if compensate_failure:
    score *= (1.0 - failure_rate / 50.0)

if card.type == NPC:
    score += 0.05
```

### Key Constants

```python
DATE_JUNIOR_END = 24
DATE_CLASSIC_END = 48
SUMMER_CONSERVE_DATES = (35, 36, 59, 60)
SUMMER_CONSERVE_ENERGY = 60
ENERGY_FAST_MEDIC = 80
ENERGY_REST_EXTRA_DAY = 65
DEFAULT_REST_THRESHOLD = 48
DEFAULT_BASE_SCORES = [0.0, 0.0, 0.0, 0.0, 0.07]  # Wits gets slight base bonus
DEFAULT_SPIRIT_EXPLOSION = [0.16, 0.16, 0.16, 0.06, 0.11]
```

## Event System (`module/umamusume/script/cultivate_task/event/manifest.py`)

Event choice resolution order:

1. **Manual overrides**: `task.detail.event_overrides[event_name] → int`
2. **Hardcoded map**: Named events with static choices or callable handlers
3. **Database lookup**: `resource/umamusume/data/event_data.json`
4. **Weighted scoring**: For each choice, compute:

```python
score = sum(stat_value[key] * weight[key] for key in stats)

# Default weights:
# Power: 10, Speed: 10, Guts: 20, Stamina: 10, Wisdom: 1
# Friendship: 15 (junior) / 0 (senior)
# Mood: 9999 (unless already level 5)
# Max Energy: 50 (unless senior)
# HP: 16 (adjusted by current energy: 0 if >84, 30 if 40-60)
# Skill Hint: 100, Skill Points: 10
```

5. **Fallback**: Choice 2

Custom per-year weights configurable via `task.detail.event_weights`.

## Scenario System

### Registration (`module/umamusume/scenario/registry.py`)

Decorator-based registry:
```python
@register(ScenarioType.SCENARIO_TYPE_URA)
class URAScenario(BaseScenario): ...
```

### BaseScenario Interface

Each scenario implements:
- `parse_training_result(img) → [speed, stamina, power, guts, wits, sp]` — pixel regions for stat OCR
- `parse_training_support_card(img) → [SupportCardInfo]` — card detection geometry
- `get_stat_areas() → dict` — pixel coordinate regions per stat
- `compute_scenario_bonuses(...) → (bonus_mult, stat_mult, bonused_indices, stat_list)` — scenario-specific scoring modifiers
- `get_ui_handlers() → dict` — scenario-specific screen handlers

### Stat Areas (pixel coordinates)

**URA**: Speed (30-140), Stamina (140-250), Power (250-360), Guts (360-470), Wits (470-580), SP (588-695) — all y: 770-826

**Aoharu**: Similar layout, y: 798-831

### Scenario Configs

**Aoharu** (`AoharuConfig`):
- `preliminary_round_selections`: Opponent indices per round
- `aoharu_team_name_selection`: Team name index (0-4, default 4)

**MANT** (`MantConfig`):
- `item_tiers`: Item type → tier mapping
- `whistle_threshold`: Energy threshold for whistle use
- `mega_*_threshold`: Megaphone effectiveness thresholds

## Persistence (`bot/base/purge.py`)

### Saved State

| File | Contents | Lifecycle |
|------|----------|-----------|
| `userdata/saved_tasks.json` | Task queue (non-completed) | Written on shutdown, deleted after load |
| `userdata/scheduler_state.json` | `{"active": bool}` | Written on shutdown, deleted after load |
| `userdata/last_task.json` | Last task status snapshot | Overwritten each task |
| `userdata/instance.lock` | PID for single-instance enforcement | Deleted on exit |
| `userdata/umamusume/presets/*.json` | Training presets | User-managed |

### Resource Cleanup (`purge_all()`)

Called between task runs:
1. Reset PaddleOCR instances, clear 12K OCR cache
2. Clear 8K image matching cache
3. Clear parse operation caches
4. Release controller references
5. `cv2.destroyAllWindows()`
6. `gc.collect()` (twice)
7. Windows-only: `SetProcessWorkingSetSize(-1, -1)` via ctypes
8. `importlib.invalidate_caches()`
9. Sleep `UAT_PURGE_PAUSE_SEC` (default 0.15s)

## REST API (`bot/server/handler.py`)

FastAPI on `127.0.0.1:8071`, CORS enabled for all origins.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/task` | Create task |
| DELETE | `/task` | Delete task by ID |
| GET | `/task` | List all tasks |
| POST | `/action/bot/start` | Start scheduler |
| POST | `/action/bot/stop` | Stop scheduler |
| GET | `/action/bot/status` | Bot state |
| POST | `/action/bot/reset-task` | Reset task to PENDING |
| GET | `/log/{task_id}` | Task log output |
| GET | `/api/runtime-state` | Repetitive click / watchdog state |
| POST | `/api/runtime-thresholds` | Set watchdog thresholds |
| GET | `/api/detected-skills` | Skills found in current run |
| GET | `/api/detected-portraits` | Support card icons detected |
| GET | `/api/training-characters` | Available training icon names |
| GET | `/api/update-status` | Git fetch + compare for updates |
| POST | `/api/manual-skill-notification` | Trigger manual skill purchase |
| GET | `/api/pal-defaults` | PAL card defaults |

## Preset Format

```json
{
  "name": "Front Mile Aoharu",
  "scenario": 2,
  "expect_attribute": [20, 20, 20, 20, 20],
  "follow_support_card_name": "card_name",
  "follow_support_card_level": 3,
  "extra_race_list": [],
  "learn_skill_list": [],
  "learn_skill_blacklist": [],
  "tactic_list": [],
  "clock_use_limit": 0,
  "learn_skill_threshold": 0,
  "learn_skill_only_user_provided": false,
  "allow_recover_tp": true,
  "extra_weight": [0, 0, 0, 0, 0],
  "spirit_explosion": [0.16, 0.16, 0.16, 0.06, 0.11],
  "compensate_failure": true,
  "pal_name": "",
  "pal_thresholds": [],
  "motivation_threshold_year1": 2,
  "motivation_threshold_year2": 2,
  "motivation_threshold_year3": 2,
  "prioritize_recreation": false,
  "event_weights": {},
  "event_overrides": {},
  "scenario_config": {}
}
```

Stored in `userdata/umamusume/presets/`. User presets override starter presets with the same name.

## Platform Support

Originally Windows-only. Cross-platform changes:
- ADB: `shutil.which("adb")` → system binary, fallback to `deps/adb/adb.exe`
- VC++ error: Gated behind `sys.platform == "win32"`
- Memory cleanup: Windows ctypes calls gated behind `os.name == 'nt'`
- `start.sh` provided for Linux (equivalent of `start.bat`)

### Linux (Waydroid) Setup

Requires: `android-tools` (adb), `waydroid` with GApps + libhoudini (ARM translation), Python 3.12.
