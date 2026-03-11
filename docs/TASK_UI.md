# Task UI and Save Model

This document describes how task settings are organized in the UI, how running-task edits work, and how save durability is handled.

## UI Organization

Task settings are grouped into six sections in the task modal:

1. `General`
2. `Decision Docs`
3. `Preset & Support`
4. `Career`
5. `Race`
6. `Skills`
7. `Events`

`Decision Docs` provides in-UI reference for:
- training score formula
- component/multiplier sources
- pre-training operation priority
- tie-break and period behavior
- where runtime weights are sourced (UI/preset/defaults)

Inside `Career`, advanced scoring controls are split into collapsible blocks:

1. `Training Multipliers`
2. `Period Weights`
3. `Caps, NPC, and Stat Value`
4. `Aoharu Scenario Weights` (Aoharu only)
5. `Training Thresholds`

This keeps high-frequency options visible while keeping low-frequency tuning concise.

## Editing a Running Task

Running tasks can be edited directly from the `Running Task` panel.

Behavior:

1. UI opens in `Edit Task` mode (non-destructive, no delete/recreate).
2. Save uses `PUT /task` with the existing `task_id`.
3. For currently running tasks, execution mode is locked during edit.
4. Updated settings are written to scheduler persistence immediately.
5. Backend applies live-safe runtime fields to both:
   - the scheduled task detail (future persistence/restarts)
   - the in-memory running context (current run)

Notes:

- Edits are guaranteed to persist to disk on save.
- Full edited task detail is saved even when task is running.
- Live apply is limited to fields declared safe; non-safe fields take effect on next run.

### Live-applied safe fields

The following task detail fields are applied live while a task is already running:

- `allow_recover_tp`
- `base_score`
- `compensate_failure`
- `cure_asap_conditions`
- `event_overrides`
- `event_weights`
- `extra_weight`
- `failure_rate_divisor`
- `friendship_green_discount`
- `friendship_score_groups`
- `hint_boost_characters`
- `hint_boost_multiplier`
- `learn_skill_only_user_provided`
- `learn_skill_threshold`
- `manual_purchase_at_end`
- `motivation_threshold_year1`
- `motivation_threshold_year2`
- `motivation_threshold_year3`
- `npc_weight`
- `override_insufficient_fans_forced_races`
- `pal_card_multiplier`
- `pal_friendship_score`
- `pal_name`
- `pal_thresholds`
- `prioritize_recreation`
- `rest_threshold`
- `score_value`
- `skip_double_circle_unless_high_hint`
- `spirit_explosion`
- `stat_cap_penalties`
- `stat_value_multiplier`
- `summer_score_threshold`
- `use_last_parents`
- `wit_race_search_threshold`
- `wit_special_multiplier`

### `PUT /task` response contract

`PUT /task` returns:

- `ok`: request succeeded
- `running_limited`: update targeted a currently running task
- `live_applied`: safe runtime fields were applied to the live context

UI save toast messaging should use these flags.

## Save Durability and Error Handling

### Task saves

- `PUT /task` updates an existing scheduler task in place.
- `POST /task`, `PUT /task`, and `DELETE /task` all persist immediately to `userdata/saved_tasks.json`.
- Persistence uses atomic write-replace (`write_json` temp file + `os.replace`).
- If persistence fails after retry, API returns HTTP 500 with an explicit error.

### Preset saves

- Preset writes use atomic file replacement (temp file + `os.replace`).
- Invalid preset payloads are rejected with explicit HTTP errors.
- Delete operations return structured errors when blocked/missing.

### UI resilience

- Task and preset save actions are locked while a save is in flight.
- Save failures are surfaced in toast messages (no silent failure).
- Modal edit/create context is reset on close to prevent stale-state saves.

## API Summary

- `POST /task`: create task
- `PUT /task`: update task by `task_id`
- `DELETE /task`: delete task
- `POST /umamusume/get-presets`: list presets
- `POST /umamusume/add-presets`: create/overwrite preset
- `POST /umamusume/delete-preset`: delete preset
