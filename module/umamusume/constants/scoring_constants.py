# Scoring system v2: all weights at human-readable scale (~1.0 average)
# 1 stat point ≈ 1.0 score by default
SCORING_VERSION = 2

DEFAULT_BASE_SCORES = [0.0, 0.0, 0.0, 0.0, 0.0]

# Per-period weights: [friendship, energy_change, hint]
# friendship: score per support card (blue). Green cards get (100 - green_discount)% of this.
# energy_change: score per energy point gained/lost
# hint: score per hint available
DEFAULT_SCORE_VALUE = [
    [11, 0.6, 9],    # Junior
    [11, 0.6, 9],    # Classic
    [11, 0.6, 9],    # Senior early
    [3,  0.6, 9],    # Senior late
    [0,  0.6, 0],    # Post-URA
]

# Percentage discount for green (lv2) friendship cards vs blue (lv1)
DEFAULT_FRIENDSHIP_GREEN_DISCOUNT = 10  # percent

# Score per stat point gained [speed, stamina, power, guts, wits, skill_points]
DEFAULT_STAT_VALUE_MULTIPLIER = [1.0, 1.0, 1.0, 1.0, 1.0, 0.5]

# Aoharu scenario: spirit explosion weight per training type
DEFAULT_SPIRIT_EXPLOSION = [16, 16, 16, 6, 11]

# Aoharu scenario: special training count weight per period
DEFAULT_SPECIAL_WEIGHTS = [15, 12, 9, 7, 0]

# Score per NPC card present, by period
DEFAULT_NPC_WEIGHT = [5, 5, 5, 3, 0]

# Pal friendship score by favor level [blue, green, max]
DEFAULT_PAL_FRIENDSHIP_SCORES = [8.0, 5.7, 1.8]

# Pal card multiplier (percentage boost when pal card present)
DEFAULT_PAL_CARD_MULTIPLIER = 10  # percent

DEFAULT_REST_THRESHOLD = 48

DEFAULT_SUMMER_SCORE_THRESHOLD = 34

DEFAULT_WIT_SPECIAL_MULTIPLIER = [1.0, 1.0]

DEFAULT_FAILURE_RATE_DIVISOR = 50.0

# Stat cap penalties: when current_stat/target_stat reaches these ratios,
# apply these multipliers (as percentages) to the training score
DEFAULT_STAT_CAP_PENALTIES = [
    [95, 0],    # >=95% of target: score zeroed
    [90, 70],   # >=90%: 70% of score
    [80, 80],   # >=80%: 80% of score
    [70, 90],   # >=70%: 90% of score
]
