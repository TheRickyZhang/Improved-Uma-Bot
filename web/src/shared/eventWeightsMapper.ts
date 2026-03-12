function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const EVENT_WEIGHT_DEFAULTS = Object.freeze({
  junior: Object.freeze({
    Friendship: 35,
    Speed: 10,
    Stamina: 10,
    Power: 10,
    Guts: 20,
    Wits: 1,
    Hint: 100,
    'Skill Points': 10,
  }),
  classic: Object.freeze({
    Friendship: 20,
    Speed: 10,
    Stamina: 10,
    Power: 10,
    Guts: 20,
    Wits: 1,
    Hint: 100,
    'Skill Points': 10,
  }),
  senior: Object.freeze({
    Friendship: 0,
    Speed: 10,
    Stamina: 10,
    Power: 10,
    Guts: 20,
    Wits: 1,
    Hint: 100,
    'Skill Points': 10,
  }),
});

function clonePeriodWeights(period) {
  return {
    Friendship: period.Friendship,
    Speed: period.Speed,
    Stamina: period.Stamina,
    Power: period.Power,
    Guts: period.Guts,
    Wits: period.Wits,
    Hint: period.Hint,
    'Skill Points': period['Skill Points'],
  };
}

function normalizePeriod(source, defaults) {
  const src = source && typeof source === 'object' ? source : {};
  return {
    Friendship: toFiniteNumber(src.Friendship, defaults.Friendship),
    Speed: toFiniteNumber(src.Speed, defaults.Speed),
    Stamina: toFiniteNumber(src.Stamina, defaults.Stamina),
    Power: toFiniteNumber(src.Power, defaults.Power),
    Guts: toFiniteNumber(src.Guts, defaults.Guts),
    Wits: toFiniteNumber(src.Wits ?? src.Wisdom, defaults.Wits),
    Hint: toFiniteNumber(src.Hint ?? src['Skill Hint'], defaults.Hint),
    'Skill Points': toFiniteNumber(src['Skill Points'] ?? src['Skill Pts'], defaults['Skill Points']),
  };
}

function toWirePeriod(period, defaults) {
  const normalized = normalizePeriod(period, defaults);
  return {
    Friendship: normalized.Friendship,
    Speed: normalized.Speed,
    Stamina: normalized.Stamina,
    Power: normalized.Power,
    Guts: normalized.Guts,
    Wisdom: normalized.Wits,
    'Skill Hint': normalized.Hint,
    'Skill Pts': normalized['Skill Points'],
  };
}

export function createEventWeightDefaults() {
  return {
    junior: clonePeriodWeights(EVENT_WEIGHT_DEFAULTS.junior),
    classic: clonePeriodWeights(EVENT_WEIGHT_DEFAULTS.classic),
    senior: clonePeriodWeights(EVENT_WEIGHT_DEFAULTS.senior),
  };
}

export function buildEventWeightsPayloadFromVm(vm) {
  const defaults = createEventWeightDefaults();
  return {
    junior: toWirePeriod(vm.eventWeightsJunior, defaults.junior),
    classic: toWirePeriod(vm.eventWeightsClassic, defaults.classic),
    senior: toWirePeriod(vm.eventWeightsSenior, defaults.senior),
  };
}

export function applyEventWeightsSourceToVm(vm, source, defaults = createEventWeightDefaults()) {
  vm.eventWeightsJunior = normalizePeriod(source?.junior, defaults.junior);
  vm.eventWeightsClassic = normalizePeriod(source?.classic, defaults.classic);
  vm.eventWeightsSenior = normalizePeriod(source?.senior, defaults.senior);
}
