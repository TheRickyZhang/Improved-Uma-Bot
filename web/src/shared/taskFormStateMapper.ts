type AnyRecord = Record<string, any>;

interface TaskFormMapperOptions {
  defaultRaceTactics?: number[];
}

function readField(source: AnyRecord | null | undefined, keys: string[], fallback: any): any {
  if (!source || typeof source !== 'object') return fallback;
  for (const key of keys) {
    if (source[key] !== undefined) return source[key];
  }
  return fallback;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined) return fallback;
  return !!value;
}

function normalizeFriendshipScoreGroups(value: unknown): AnyRecord[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      { characters: [], multiplier: 100, search: '', expanded: false },
      { characters: [], multiplier: 100, search: '', expanded: false },
    ];
  }
  return value.map((group) => ({
    characters: Array.isArray(group?.characters) ? [...group.characters] : [],
    multiplier: group?.multiplier !== undefined ? Number(group.multiplier) || 100 : 100,
    search: '',
    expanded: false,
  }));
}

function clampExtraWeightRow(row: unknown): number[] {
  const source = Array.isArray(row) ? row : [];
  const out: number[] = [];
  for (let i = 0; i < 5; i++) {
    const n = toFiniteNumber(source[i], 0);
    out.push(Math.max(-1, Math.min(1, n)));
  }
  return out;
}

function normalizeExtraWeightMatrix(source: unknown): number[][] {
  if (!Array.isArray(source)) {
    return [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];
  }
  return [
    clampExtraWeightRow(source[0]),
    clampExtraWeightRow(source[1]),
    clampExtraWeightRow(source[2]),
    clampExtraWeightRow(source[3]),
  ];
}

function normalizeLegacyTactics(source: AnyRecord, fallbackTactics: number[]): number[] {
  const tacticList = readField(source, ['tactic_list'], null);
  if (Array.isArray(tacticList) && tacticList.length >= 3) {
    return [
      toFiniteNumber(tacticList[0], fallbackTactics[0]),
      toFiniteNumber(tacticList[1], fallbackTactics[1]),
      toFiniteNumber(tacticList[2], fallbackTactics[2]),
    ];
  }
  return [
    toFiniteNumber(readField(source, ['race_tactic_1'], fallbackTactics[0]), fallbackTactics[0]),
    toFiniteNumber(readField(source, ['race_tactic_2'], fallbackTactics[1]), fallbackTactics[1]),
    toFiniteNumber(readField(source, ['race_tactic_3'], fallbackTactics[2]), fallbackTactics[2]),
  ];
}

function normalizeTacticActions(source: AnyRecord, legacyTactics: number[]): AnyRecord[] {
  const actions = readField(source, ['tactic_actions'], null);
  if (Array.isArray(actions) && actions.length > 0) {
    return actions
      .filter((action) => action && typeof action === 'object')
      .map((action) => ({ ...action }));
  }
  return [
    { op: 'range', val: 0, val2: 25, tactic: legacyTactics[0] },
    { op: 'range', val: 24, val2: 49, tactic: legacyTactics[1] },
    { op: '>', val: 48, val2: 0, tactic: legacyTactics[2] },
  ];
}

export function applyTaskFormStateFromSource(
  vm: AnyRecord,
  source: AnyRecord | null | undefined,
  options: TaskFormMapperOptions = {},
): void {
  const data = source && typeof source === 'object' ? source : {};
  const fallbackTactics = Array.isArray(options.defaultRaceTactics) && options.defaultRaceTactics.length >= 3
    ? options.defaultRaceTactics
    : [vm.selectedRaceTactic1, vm.selectedRaceTactic2, vm.selectedRaceTactic3];

  vm.selectedScenario = toFiniteNumber(readField(data, ['scenario'], 1), 1);
  vm.extraRace = Array.isArray(readField(data, ['extra_race_list', 'race_list'], null))
    ? [...readField(data, ['extra_race_list', 'race_list'], [])]
    : [];

  const expectAttribute = readField(data, ['expect_attribute'], null);
  if (Array.isArray(expectAttribute) && expectAttribute.length >= 5) {
    vm.expectSpeedValue = expectAttribute[0];
    vm.expectStaminaValue = expectAttribute[1];
    vm.expectPowerValue = expectAttribute[2];
    vm.expectWillValue = expectAttribute[3];
    vm.expectIntelligenceValue = expectAttribute[4];
  }

  const followSupportCard = readField(data, ['follow_support_card'], null);
  if (followSupportCard && typeof followSupportCard === 'object') {
    vm.selectedSupportCard = followSupportCard;
  } else {
    const supportCardName = readField(data, ['follow_support_card_name'], null);
    if (typeof supportCardName === 'string' && supportCardName.length > 0) {
      vm.selectedSupportCard = { name: supportCardName };
    }
  }

  vm.supportCardLevel = toFiniteNumber(
    readField(data, ['follow_support_card_level'], vm.supportCardLevel),
    vm.supportCardLevel,
  );
  vm.clockUseLimit = toFiniteNumber(readField(data, ['clock_use_limit'], vm.clockUseLimit), vm.clockUseLimit);
  vm.restTreshold = toFiniteNumber(
    readField(data, ['rest_threshold', 'rest_treshold', 'fast_path_energy_limit'], vm.restTreshold),
    vm.restTreshold,
  );
  vm.compensateFailure = readField(data, ['compensate_failure'], true) !== false;
  vm.failureRateDivisor = toFiniteNumber(
    readField(data, ['failure_rate_divisor'], vm.failureRateDivisor),
    vm.failureRateDivisor,
  );
  vm.useLastParents = normalizeBoolean(readField(data, ['use_last_parents'], vm.useLastParents), false);
  vm.overrideInsufficientFansForcedRaces = normalizeBoolean(
    readField(data, ['override_insufficient_fans_forced_races'], vm.overrideInsufficientFansForcedRaces),
    false,
  );
  vm.learnSkillOnlyUserProvided = normalizeBoolean(
    readField(data, ['learn_skill_only_user_provided'], vm.learnSkillOnlyUserProvided),
    false,
  );
  vm.recoverTP = toFiniteNumber(readField(data, ['allow_recover_tp'], vm.recoverTP), vm.recoverTP);
  vm.manualPurchase = normalizeBoolean(readField(data, ['manual_purchase_at_end'], vm.manualPurchase), false);
  vm.skipDoubleCircleUnlessHighHint = normalizeBoolean(
    readField(data, ['skip_double_circle_unless_high_hint'], vm.skipDoubleCircleUnlessHighHint),
    false,
  );
  vm.hintBoostCharacters = Array.isArray(readField(data, ['hint_boost_characters'], null))
    ? [...readField(data, ['hint_boost_characters'], [])]
    : [];
  vm.hintBoostMultiplier = toFiniteNumber(
    readField(data, ['hint_boost_multiplier'], 100),
    100,
  );
  vm.friendshipScoreGroups = normalizeFriendshipScoreGroups(
    readField(data, ['friendship_score_groups'], null),
  );
  vm.learnSkillThreshold = toFiniteNumber(
    readField(data, ['learn_skill_threshold'], vm.learnSkillThreshold),
    vm.learnSkillThreshold,
  );
  vm.cureAsapConditions = readField(data, ['cure_asap_conditions', 'cureAsapConditions'], vm.cureAsapConditions);
  vm.motivationThresholdYear1 = toFiniteNumber(
    readField(data, ['motivation_threshold_year1'], 3),
    3,
  );
  vm.motivationThresholdYear2 = toFiniteNumber(
    readField(data, ['motivation_threshold_year2'], 4),
    4,
  );
  vm.motivationThresholdYear3 = toFiniteNumber(
    readField(data, ['motivation_threshold_year3'], 4),
    4,
  );

  const legacyTactics = normalizeLegacyTactics(data, fallbackTactics);
  vm.selectedRaceTactic1 = legacyTactics[0];
  vm.selectedRaceTactic2 = legacyTactics[1];
  vm.selectedRaceTactic3 = legacyTactics[2];
  vm.raceTacticConditions = normalizeTacticActions(data, legacyTactics);

  const extraWeight = readField(data, ['extra_weight', 'extraWeight'], null);
  const [year1, year2, year3, summer] = normalizeExtraWeightMatrix(extraWeight);
  vm.extraWeight1 = year1;
  vm.extraWeight2 = year2;
  vm.extraWeight3 = year3;
  vm.extraWeightSummer = summer;
}
