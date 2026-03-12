type AnyRecord = Record<string, any>;

interface ScenarioMapperOptions {
  getDefaultMantItemTiers?: () => AnyRecord;
  migrateMantTiers?: () => void;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInteger(value: unknown, fallback = 0): number {
  return Math.trunc(toFiniteNumber(value, fallback));
}

function toNumericArray(arr: unknown, expectedLen: number, fallback = 0): number[] {
  const out = Array.isArray(arr) ? arr.map((v) => toFiniteNumber(v, fallback)) : [];
  while (out.length < expectedLen) out.push(fallback);
  if (out.length > expectedLen) out.splice(expectedLen);
  return out;
}

function parseResetSkillList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter((v) => v.length > 0);
  }
  if (typeof raw !== 'string' || raw.trim().length === 0) return [];
  return raw.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
}

const DEFAULTS = Object.freeze({
  uraSkillEventWeight: Object.freeze([0, 0, 0]),
  aoharuPreliminaryRoundSelections: Object.freeze([2, 1, 1, 1]),
  aoharuTeamNameSelection: 4,
  mantTierCount: 2,
  mantWhistleThreshold: 20,
  mantWhistleFocusSummer: true,
  mantMegaSmallThreshold: 60,
  mantMegaMediumThreshold: 70,
  mantMegaLargeThreshold: 80,
  mantTrainingWeightsThreshold: 60,
});

export function buildTaskScenarioConfigPayloadFromVm(vm: AnyRecord): AnyRecord {
  return {
    ura_config: vm.selectedScenario === 1 ? {
      skillEventWeight: toNumericArray(vm.skillEventWeight, 3, 0),
      resetSkillEventWeightList: parseResetSkillList(vm.resetSkillEventWeightList),
    } : null,
    aoharu_config: vm.selectedScenario === 2 ? {
      preliminaryRoundSelections: toNumericArray(vm.preliminaryRoundSelections, 4, 1),
      aoharuTeamNameSelection: toInteger(vm.aoharuTeamNameSelection, DEFAULTS.aoharuTeamNameSelection),
    } : null,
    mant_config: vm.selectedScenario === 3 ? {
      item_tiers: { ...(vm.mantItemTiers || {}) },
      tier_count: Math.max(1, toInteger(vm.mantTierCount, DEFAULTS.mantTierCount)),
      whistle_threshold: toInteger(vm.mantWhistleThreshold, DEFAULTS.mantWhistleThreshold),
      whistle_focus_summer: vm.mantWhistleFocusSummer !== false,
      mega_small_threshold: toInteger(vm.mantMegaSmallThreshold, DEFAULTS.mantMegaSmallThreshold),
      mega_medium_threshold: toInteger(vm.mantMegaMediumThreshold, DEFAULTS.mantMegaMediumThreshold),
      mega_large_threshold: toInteger(vm.mantMegaLargeThreshold, DEFAULTS.mantMegaLargeThreshold),
      training_weights_threshold: toInteger(vm.mantTrainingWeightsThreshold, DEFAULTS.mantTrainingWeightsThreshold),
    } : null,
  };
}

export function buildPresetScenarioConfigPayloadFromVm(vm: AnyRecord): AnyRecord {
  if (vm.selectedScenario === 1) {
    return {
      ura_config: {
        skillEventWeight: toNumericArray(vm.skillEventWeight, 3, 0),
        resetSkillEventWeightList: typeof vm.resetSkillEventWeightList === 'string'
          ? vm.resetSkillEventWeightList
          : parseResetSkillList(vm.resetSkillEventWeightList).join(', '),
      },
    };
  }
  if (vm.selectedScenario === 2) {
    return {
      aoharu_config: {
        preliminaryRoundSelections: toNumericArray(vm.preliminaryRoundSelections, 4, 1),
        aoharuTeamNameSelection: toInteger(vm.aoharuTeamNameSelection, DEFAULTS.aoharuTeamNameSelection),
      },
    };
  }
  if (vm.selectedScenario === 3) {
    return {
      mant_config: {
        item_tiers: { ...(vm.mantItemTiers || {}) },
        tier_count: Math.max(1, toInteger(vm.mantTierCount, DEFAULTS.mantTierCount)),
        whistle_threshold: toInteger(vm.mantWhistleThreshold, DEFAULTS.mantWhistleThreshold),
        whistle_focus_summer: vm.mantWhistleFocusSummer !== false,
        mega_small_threshold: toInteger(vm.mantMegaSmallThreshold, DEFAULTS.mantMegaSmallThreshold),
        mega_medium_threshold: toInteger(vm.mantMegaMediumThreshold, DEFAULTS.mantMegaMediumThreshold),
        mega_large_threshold: toInteger(vm.mantMegaLargeThreshold, DEFAULTS.mantMegaLargeThreshold),
        training_weights_threshold: toInteger(vm.mantTrainingWeightsThreshold, DEFAULTS.mantTrainingWeightsThreshold),
      },
    };
  }
  return {};
}

export function applyScenarioConfigSourceToVm(
  vm: AnyRecord,
  source: AnyRecord | null | undefined,
  options: ScenarioMapperOptions = {},
): void {
  const getDefaultMantItemTiers = typeof options.getDefaultMantItemTiers === 'function'
    ? options.getDefaultMantItemTiers
    : (() => ({}));
  const migrateMantTiers = typeof options.migrateMantTiers === 'function'
    ? options.migrateMantTiers
    : null;

  const uraConfig = source?.ura_config;
  if (uraConfig && typeof uraConfig === 'object') {
    vm.skillEventWeight = toNumericArray(uraConfig.skillEventWeight, 3, 0);
    const raw = uraConfig.resetSkillEventWeightList;
    vm.resetSkillEventWeightList = Array.isArray(raw)
      ? raw.map((v) => String(v).trim()).filter((v) => v.length > 0).join(', ')
      : (typeof raw === 'string' ? raw : '');
  } else {
    vm.skillEventWeight = [...DEFAULTS.uraSkillEventWeight];
    vm.resetSkillEventWeightList = '';
  }

  const aoharuConfig: AnyRecord | null | undefined = source?.aoharu_config || source?.auharuhai_config;
  if (aoharuConfig && typeof aoharuConfig === 'object') {
    vm.preliminaryRoundSelections = toNumericArray(
      aoharuConfig.preliminaryRoundSelections,
      4,
      1,
    );
    vm.aoharuTeamNameSelection = toInteger(
      aoharuConfig.aoharuTeamNameSelection,
      DEFAULTS.aoharuTeamNameSelection,
    );
  } else {
    vm.preliminaryRoundSelections = [...DEFAULTS.aoharuPreliminaryRoundSelections];
    vm.aoharuTeamNameSelection = DEFAULTS.aoharuTeamNameSelection;
  }

  const mantConfig: AnyRecord | null | undefined = source?.mant_config;
  if (mantConfig && typeof mantConfig === 'object' && mantConfig.item_tiers) {
    vm.mantItemTiers = { ...mantConfig.item_tiers };
    vm.mantTierCount = Math.max(1, toInteger(mantConfig.tier_count, DEFAULTS.mantTierCount));
    if (migrateMantTiers) migrateMantTiers();
    vm.mantWhistleThreshold = toInteger(mantConfig.whistle_threshold, DEFAULTS.mantWhistleThreshold);
    vm.mantWhistleFocusSummer = mantConfig.whistle_focus_summer !== false;
    vm.mantMegaSmallThreshold = toInteger(mantConfig.mega_small_threshold, DEFAULTS.mantMegaSmallThreshold);
    vm.mantMegaMediumThreshold = toInteger(mantConfig.mega_medium_threshold, DEFAULTS.mantMegaMediumThreshold);
    vm.mantMegaLargeThreshold = toInteger(mantConfig.mega_large_threshold, DEFAULTS.mantMegaLargeThreshold);
    vm.mantTrainingWeightsThreshold = toInteger(
      mantConfig.training_weights_threshold,
      DEFAULTS.mantTrainingWeightsThreshold,
    );
  } else {
    vm.mantItemTiers = getDefaultMantItemTiers();
    vm.mantTierCount = DEFAULTS.mantTierCount;
    if (migrateMantTiers) migrateMantTiers();
    vm.mantWhistleThreshold = DEFAULTS.mantWhistleThreshold;
    vm.mantWhistleFocusSummer = DEFAULTS.mantWhistleFocusSummer;
    vm.mantMegaSmallThreshold = DEFAULTS.mantMegaSmallThreshold;
    vm.mantMegaMediumThreshold = DEFAULTS.mantMegaMediumThreshold;
    vm.mantMegaLargeThreshold = DEFAULTS.mantMegaLargeThreshold;
    vm.mantTrainingWeightsThreshold = DEFAULTS.mantTrainingWeightsThreshold;
  }
}
