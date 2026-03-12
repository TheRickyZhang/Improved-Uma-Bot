import { SCORING_CONSTANTS, createScoringDefaults } from './scoringDefaults';

type AnyRecord = Record<string, any>;

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNumericArray(arr: unknown, expectedLen: number | null = null, fallback = 0): number[] {
  const out = Array.isArray(arr) ? arr.map((v) => toFiniteNumber(v, fallback)) : [];
  if (expectedLen !== null) {
    while (out.length < expectedLen) out.push(fallback);
    if (out.length > expectedLen) out.splice(expectedLen);
  }
  return out;
}

function normalizePenaltyPairs(pairs: unknown, defaults: AnyRecord): number[][] {
  if (!Array.isArray(pairs)) return defaults.statCapPenalties.map((p) => [...p]);
  const normalized = pairs
    .filter((p) => Array.isArray(p) && p.length >= 2)
    .map((p) => [toFiniteNumber(p[0], 0), toFiniteNumber(p[1], 100)]);
  return normalized.length > 0 ? normalized : defaults.statCapPenalties.map((p) => [...p]);
}

function readKey(source: AnyRecord | null | undefined, snake: string, camel?: string): unknown {
  if (!source || typeof source !== 'object') return undefined;
  if (source[snake] !== undefined) return source[snake];
  if (camel && source[camel] !== undefined) return source[camel];
  return undefined;
}

export function buildScoringPayloadFromVm(vm: AnyRecord): AnyRecord {
  const defaults = createScoringDefaults();
  return {
    base_score: toNumericArray(vm.baseScore, 5),
    score_value: [
      toNumericArray(vm.scoreValueJunior, 3),
      toNumericArray(vm.scoreValueClassic, 3),
      toNumericArray(vm.scoreValueSenior, 3),
      toNumericArray(vm.scoreValueSeniorAfterSummer, 3),
      toNumericArray(vm.scoreValueFinale, 3),
    ],
    special_training: [
      toFiniteNumber(vm.specialJunior),
      toFiniteNumber(vm.specialClassic),
      toFiniteNumber(vm.specialSenior),
      toFiniteNumber(vm.specialSeniorAfterSummer),
      toFiniteNumber(vm.specialFinale),
    ],
    stat_value_multiplier: toNumericArray(vm.statValueMultiplier, 6),
    spirit_explosion: [
      toNumericArray(vm.spiritExplosionJunior, 5),
      toNumericArray(vm.spiritExplosionClassic, 5),
      toNumericArray(vm.spiritExplosionSenior, 5),
      toNumericArray(vm.spiritExplosionSeniorAfterSummer, 5),
      toNumericArray(vm.spiritExplosionFinale, 5),
    ],
    wit_special_multiplier: [
      toFiniteNumber(vm.witSpecialJunior, 1.0),
      toFiniteNumber(vm.witSpecialClassic, 1.0),
    ],
    friendship_green_discount: toFiniteNumber(
      vm.friendshipGreenDiscount,
      SCORING_CONSTANTS.friendshipGreenDiscount,
    ),
    stat_cap_penalties: normalizePenaltyPairs(vm.statCapPenalties, defaults),
    npc_weight: toNumericArray(vm.npcWeight, 5),
    pal_friendship_score: toNumericArray(vm.palFriendshipScore, 3),
    pal_card_multiplier: toFiniteNumber(vm.palCardMultiplier, SCORING_CONSTANTS.palCardMultiplier),
    summer_score_threshold: toFiniteNumber(vm.summerScoreThreshold, SCORING_CONSTANTS.summerScoreThreshold),
    wit_race_search_threshold: toFiniteNumber(
      vm.witRaceSearchThreshold,
      SCORING_CONSTANTS.witRaceSearchThreshold,
    ),
    scoring_version: SCORING_CONSTANTS.scoringVersion,
  };
}

export function applyScoringSourceToVm(
  vm: AnyRecord,
  source: AnyRecord | null | undefined,
  defaults: AnyRecord = createScoringDefaults(),
): void {
  const scoreValue = readKey(source, 'score_value', 'scoreValue');
  if (Array.isArray(scoreValue) && scoreValue.length >= 5) {
    vm.scoreValueJunior = toNumericArray(scoreValue[0], 3);
    vm.scoreValueClassic = toNumericArray(scoreValue[1], 3);
    vm.scoreValueSenior = toNumericArray(scoreValue[2], 3);
    vm.scoreValueSeniorAfterSummer = toNumericArray(scoreValue[3], 3);
    vm.scoreValueFinale = toNumericArray(scoreValue[4], 3);
  } else {
    vm.scoreValueJunior = [...defaults.scoreValueJunior];
    vm.scoreValueClassic = [...defaults.scoreValueClassic];
    vm.scoreValueSenior = [...defaults.scoreValueSenior];
    vm.scoreValueSeniorAfterSummer = [...defaults.scoreValueSeniorAfterSummer];
    vm.scoreValueFinale = [...defaults.scoreValueFinale];
  }

  const specialTraining = readKey(source, 'special_training', 'specialTraining');
  if (Array.isArray(specialTraining) && specialTraining.length >= 5) {
    vm.specialJunior = toFiniteNumber(specialTraining[0]);
    vm.specialClassic = toFiniteNumber(specialTraining[1]);
    vm.specialSenior = toFiniteNumber(specialTraining[2]);
    vm.specialSeniorAfterSummer = toFiniteNumber(specialTraining[3]);
    vm.specialFinale = toFiniteNumber(specialTraining[4]);
  } else {
    vm.specialJunior = defaults.specialJunior;
    vm.specialClassic = defaults.specialClassic;
    vm.specialSenior = defaults.specialSenior;
    vm.specialSeniorAfterSummer = defaults.specialSeniorAfterSummer;
    vm.specialFinale = defaults.specialFinale;
  }

  const baseScore = readKey(source, 'base_score', 'baseScore');
  vm.baseScore = Array.isArray(baseScore) ? toNumericArray(baseScore, 5) : [...defaults.baseScore];

  const statValueMultiplier = readKey(source, 'stat_value_multiplier', 'statValueMultiplier');
  vm.statValueMultiplier = Array.isArray(statValueMultiplier)
    ? toNumericArray(statValueMultiplier, 6)
    : [...defaults.statValueMultiplier];

  const witSpecialMultiplier = readKey(source, 'wit_special_multiplier', 'witSpecialMultiplier');
  if (Array.isArray(witSpecialMultiplier) && witSpecialMultiplier.length >= 2) {
    vm.witSpecialJunior = toFiniteNumber(witSpecialMultiplier[0], defaults.witSpecialJunior);
    vm.witSpecialClassic = toFiniteNumber(witSpecialMultiplier[1], defaults.witSpecialClassic);
  } else {
    vm.witSpecialJunior = defaults.witSpecialJunior;
    vm.witSpecialClassic = defaults.witSpecialClassic;
  }

  const spiritExplosion = readKey(source, 'spirit_explosion', 'spiritExplosion');
  if (Array.isArray(spiritExplosion) && spiritExplosion.length > 0 && Array.isArray(spiritExplosion[0])) {
    vm.spiritExplosionJunior = toNumericArray(spiritExplosion[0], 5);
    vm.spiritExplosionClassic = toNumericArray(spiritExplosion[1] ?? defaults.spiritExplosionClassic, 5);
    vm.spiritExplosionSenior = toNumericArray(spiritExplosion[2] ?? defaults.spiritExplosionSenior, 5);
    vm.spiritExplosionSeniorAfterSummer = toNumericArray(spiritExplosion[3] ?? defaults.spiritExplosionSeniorAfterSummer, 5);
    vm.spiritExplosionFinale = toNumericArray(spiritExplosion[4] ?? defaults.spiritExplosionFinale, 5);
  } else if (Array.isArray(spiritExplosion)) {
    const single = toNumericArray(spiritExplosion, 5);
    vm.spiritExplosionJunior = [...single];
    vm.spiritExplosionClassic = [...single];
    vm.spiritExplosionSenior = [...single];
    vm.spiritExplosionSeniorAfterSummer = [...single];
    vm.spiritExplosionFinale = [...single];
  } else {
    vm.spiritExplosionJunior = [...defaults.spiritExplosionJunior];
    vm.spiritExplosionClassic = [...defaults.spiritExplosionClassic];
    vm.spiritExplosionSenior = [...defaults.spiritExplosionSenior];
    vm.spiritExplosionSeniorAfterSummer = [...defaults.spiritExplosionSeniorAfterSummer];
    vm.spiritExplosionFinale = [...defaults.spiritExplosionFinale];
  }

  const palFriendshipScore = readKey(source, 'pal_friendship_score', 'palFriendshipScore');
  vm.palFriendshipScore = Array.isArray(palFriendshipScore)
    ? toNumericArray(palFriendshipScore, 3)
    : [...defaults.palFriendshipScore];

  const palCardMultiplier = readKey(source, 'pal_card_multiplier', 'palCardMultiplier');
  vm.palCardMultiplier = palCardMultiplier !== undefined
    ? toFiniteNumber(palCardMultiplier, defaults.palCardMultiplier)
    : defaults.palCardMultiplier;

  const npcWeight = readKey(source, 'npc_weight', 'npcWeight');
  vm.npcWeight = Array.isArray(npcWeight) ? toNumericArray(npcWeight, 5) : [...defaults.npcWeight];

  const friendshipGreenDiscount = readKey(source, 'friendship_green_discount', 'friendshipGreenDiscount');
  vm.friendshipGreenDiscount = friendshipGreenDiscount !== undefined
    ? toFiniteNumber(friendshipGreenDiscount, defaults.friendshipGreenDiscount)
    : defaults.friendshipGreenDiscount;

  const statCapPenalties = readKey(source, 'stat_cap_penalties', 'statCapPenalties');
  vm.statCapPenalties = normalizePenaltyPairs(statCapPenalties, defaults);

  const summerThreshold = readKey(source, 'summer_score_threshold', 'summerScoreThreshold');
  vm.summerScoreThreshold = summerThreshold !== undefined
    ? toFiniteNumber(summerThreshold, defaults.summerScoreThreshold)
    : defaults.summerScoreThreshold;

  const witRaceThreshold = readKey(source, 'wit_race_search_threshold', 'witRaceSearchThreshold');
  vm.witRaceSearchThreshold = witRaceThreshold !== undefined
    ? toFiniteNumber(witRaceThreshold, defaults.witRaceSearchThreshold)
    : defaults.witRaceSearchThreshold;
}
