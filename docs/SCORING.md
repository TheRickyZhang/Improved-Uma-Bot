# Training Scoring System

How the bot decides which training to pick each turn.

## Overview

Each turn, all 5 trainings (Speed, Stamina, Power, Guts, Wit) get a score. The highest score wins. The score is built from **additive components** summed together, then multiplied by **multiplicative modifiers**.

```
final_score = (base + stats + friendship + energy + npc + hint + scenario) × pal × fail × cap × weight
```

## Decision Flow

There are **two scoring paths**:

1. **Full scoring** (`training_select.py`): The main scoring loop. Runs every turn when the training screen is shown. Produces detailed per-training logs.

2. **Quick scoring** (`ai.py`): A simplified version used only for pre-training decisions (should we rest? go on a trip? enter a race?). Only considers friendship + NPC + failure rate — no stats, energy, hints, or scenario bonuses.

## Additive Components

### Base Score
`base_score` — Per-training constant added before anything else.
Default: `[0, 0, 0, 0, 0]`
Config key: `base_score`

### Stat Gains
Each stat point gained from training is multiplied by `stat_value_multiplier[stat_index]`.
Default: `[1.0, 1.0, 1.0, 1.0, 1.0, 0.5]` (speed, stamina, power, guts, wits, skill_pts)
Config key: `stat_value_multiplier`

The 6th value is for skill points, which are worth half a stat point by default.

### Friendship (Support Cards)
Each support card present on a training adds score based on favor level:
- **Blue (lv1)**: `w_friendship` (the first value in score_value for the current period)
- **Green (lv2)**: `w_friendship × (1 - green_discount/100)`

The `friendship_score_groups` config lets you set per-character multipliers (e.g., boost a specific card's friendship weight by 150%).

Config keys: `score_value` (per-period `[friendship, energy, hint]`), `friendship_green_discount` (percent)

### Energy Change
`energy_change × w_energy_change`
A training that costs 20 energy contributes `-20 × w_energy_change`.
Wit training (which restores energy) gets a positive contribution.
Config: Second value in each `score_value` period array. Default: `0.6`

### NPC Cards
Each NPC (non-support-card character) present adds `npc_weight[period]`.
Default: `[5, 5, 5, 3, 0]` (Junior, Classic, Senior, Senior Late, Finale)
Config key: `npc_weight`

### Hints
If a support card has a hint available: adds `w_hint` (third value in `score_value`).
`hint_boost_characters` can multiply this for specific characters.
Default hint weight: `9` per period.

### Pal (Friend Card) Friendship
Separate from regular support cards. Uses `pal_friendship_score` by favor level:
- Blue (lv1): `8.0`, Green (lv2): `5.7`, Max (lv3+): `1.8`
Config key: `pal_friendship_score`

### Scenario Bonuses (Aoharu only)
- **Special Training**: Cards that can increment special training add `special_training[period] × count`. Wit gets an extra multiplier (`wit_special_multiplier`).
  Default special weights: `[15, 12, 9, 7, 0]`
- **Spirit Explosion**: Cards with spirit explosion add `spirit_explosion[training_type] × count`.
  Default: `[16, 16, 16, 6, 11]` (per training type, or per-period 5×5 matrix)

## Multiplicative Modifiers

Applied after all additive components are summed. Each is independent.

### Pal Card Multiplier
If a pal (friend) card is present on the training: `score × (1 + pal_card_multiplier/100)`.
Default: `10` → 1.10× multiplier.
Config key: `pal_card_multiplier`

### Failure Rate Compensation
`score × max(0, 1 - failure_rate / failure_rate_divisor)`
At 20% failure with divisor 50: `score × 0.6`.
At 50% failure: `score × 0.0` (zeroed out).
Config keys: `compensate_failure` (bool), `failure_rate_divisor` (default 50)

### Stat Cap Penalty
When current stat approaches the target (`expect_attribute`), the training score for that type is reduced. Uses a configurable threshold table:

| Current/Target ratio | Score multiplier |
|---|---|
| ≥95% | 0% (zeroed) |
| ≥90% | 70% |
| ≥80% | 80% |
| ≥70% | 90% |
| <70% | 100% (no penalty) |

Config key: `stat_cap_penalties` — list of `[threshold_pct, multiplier_pct]` pairs

### Extra Weight
Per-training multiplier from `extra_weight`. Applied as `score × (1 + extra_weight[idx])`.
Setting to `-1` completely disables a training (score = -infinity).
Default: `[[0,0,0,0,0], ...]` (no effect)

## Period System

The game is divided into 5 periods that change weight behavior:

| Period | Dates | Description |
|---|---|---|
| 0 - Junior | 1-24 | Early game, friendship matters most |
| 1 - Classic | 25-48 | Mid game |
| 2 - Senior | 49-60 | Senior before summer |
| 3 - Senior Late | 61-72 | After summer camp |
| 4 - Finale | 73+ | URA/finals, friendship irrelevant |

Default score_value per period:
```
Junior:      [11,  0.6, 9]   # friendship=11, energy=0.6, hint=9
Classic:     [11,  0.6, 9]
Senior:      [11,  0.6, 9]
Senior Late: [3,   0.6, 9]   # friendship drops
Finale:      [0,   0.6, 0]   # friendship/hints irrelevant
```

## Pre-Training Decisions (`ai.py`)

Before scoring trainings, the bot checks these in order:

1. **Mood check**: If mood is below threshold for current year, go on a trip (outing).
   Config: `motivation_threshold_year1/2/3` (default 3/4/4, where 5=best mood)

2. **Rest check**: If energy ≤ `rest_threshold` (default 48), rest.
   Exception: if `prioritize_recreation` is on and PAL outing conditions are met, trip instead.

3. **Race check**: Mandatory races, URA championship races, user-selected extra races.

4. **Summer camp**: During summer camp periods, a `summer_score_threshold` (default 34) determines if the bot should train or search for races.

5. **Quick score comparison**: Uses simplified friendship+NPC scoring to decide between training and other actions.

## Event Choice System

Separate from training scoring. When events occur:

- `event_overrides`: Force specific choices for named events (e.g., `{"Always on Stage ☆": 1}`)
- `event_weights`: Per-period weights for event outcome types (Friendship, Speed, Stamina, Power, Guts, Wisdom, Skill Hint, Skill Pts). The bot picks the choice whose outcomes score highest.

## Log Format

Each turn logs one line per training:
```
Speed: 45.2 = [stats:+32.0 friend(2):+22.0 nrg(-18):-10.8 npc(1):+5.0 | fail:x0.80 cap:x0.90] | spd:12 pow:8 ski:4 | nrg:-18
```

Components: `base`, `stats`, `friend(count)`, `nrg(change)`, `npc(count)`, `hint(count)`, `special(count)`, `spirit(count)`
Multipliers after `|`: `pal`, `fail`, `cap`, `wt` (extra weight), `witspc` (wit special)

## All Configurable Parameters

| Parameter | Default | Description |
|---|---|---|
| `base_score` | `[0,0,0,0,0]` | Per-training base score |
| `score_value` | See above | Per-period `[friendship, energy, hint]` |
| `friendship_green_discount` | `10` | % less for green vs blue friendship |
| `stat_value_multiplier` | `[1,1,1,1,1,0.5]` | Score per stat point by type |
| `npc_weight` | `[5,5,5,3,0]` | NPC score per period |
| `pal_friendship_score` | `[8.0, 5.7, 1.8]` | Pal card friendship by favor |
| `pal_card_multiplier` | `10` | % bonus when pal present |
| `spirit_explosion` | `[16,16,16,6,11]` | Aoharu spirit weight per type |
| `special_training` | `[15,12,9,7,0]` | Aoharu special weight per period |
| `wit_special_multiplier` | `[1.0, 1.0]` | Extra mult for Wit special [junior, classic] |
| `compensate_failure` | `true` | Enable failure rate penalty |
| `failure_rate_divisor` | `50` | Failure rate → multiplier divisor |
| `stat_cap_penalties` | `[[95,0],[90,70],[80,80],[70,90]]` | Stat cap threshold table |
| `extra_weight` | `[[0,0,0,0,0],...]` | Per-period per-training multiplier |
| `rest_threshold` | `48` | Energy below this → rest |
| `summer_score_threshold` | `34` | Summer camp race search threshold |
| `wit_race_search_threshold` | `15` | Wit/race-search fallback threshold |
| `motivation_threshold_year1` | `3` | Mood threshold for trip (year 1) |
| `motivation_threshold_year2` | `4` | Mood threshold for trip (year 2) |
| `motivation_threshold_year3` | `4` | Mood threshold for trip (year 3) |
| `hint_boost_characters` | `[]` | Characters with boosted hint weight |
| `hint_boost_multiplier` | `100` | % multiplier for boosted hints |
| `friendship_score_groups` | `[]` | Per-character friendship multipliers |
| `event_weights` | per-period | Event outcome type weights |
| `event_overrides` | `{}` | Force specific event choices |
