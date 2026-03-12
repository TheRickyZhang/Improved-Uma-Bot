import { buildScoringPayloadFromVm } from './scoringMapper';
import { buildEventWeightsPayloadFromVm } from './eventWeightsMapper';
import { buildPresetSkillPayloadFromVm } from './skillSelectionMapper';
import { buildEventChoicesPayloadFromSelection } from './eventChoicesMapper';
import { buildPresetPalConfigPayloadFromVm } from './palConfigMapper';
import { buildPresetScenarioConfigPayloadFromVm } from './scenarioConfigMapper';

function clampExtraWeightRow(row) {
  if (!Array.isArray(row)) return [0, 0, 0, 0, 0];
  return row.map((value) => Math.max(-1, Math.min(1, Number(value) || 0)));
}

function normalizeFriendshipScoreGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map((group) => ({
    characters: Array.isArray(group?.characters) ? [...group.characters] : [],
    multiplier: Number(group?.multiplier) || 100,
  }));
}

export function buildPresetPayloadFromVm(vm, name) {
  const presetSkillPayload = buildPresetSkillPayloadFromVm(vm);
  const preset = {
    name,
    event_overrides: buildEventChoicesPayloadFromSelection(vm.eventChoicesSelected),
    compensate_failure: vm.compensateFailure,
    failure_rate_divisor: vm.failureRateDivisor,
    use_last_parents: vm.useLastParents,
    override_insufficient_fans_forced_races: vm.overrideInsufficientFansForcedRaces,
    scenario: vm.selectedScenario,
    race_list: vm.extraRace,
    skill_priority_list: presetSkillPayload.skill_priority_list,
    skill_blacklist: presetSkillPayload.skill_blacklist,
    event_weights: buildEventWeightsPayloadFromVm(vm),
    cureAsapConditions: vm.cureAsapConditions,
    expect_attribute: [
      vm.expectSpeedValue,
      vm.expectStaminaValue,
      vm.expectPowerValue,
      vm.expectWillValue,
      vm.expectIntelligenceValue,
    ],
    follow_support_card: vm.selectedSupportCard,
    follow_support_card_level: vm.supportCardLevel,
    clock_use_limit: vm.clockUseLimit,
    rest_threshold: vm.restTreshold,
    learn_skill_threshold: vm.learnSkillThreshold,
    learn_skill_only_user_provided: vm.learnSkillOnlyUserProvided,
    allow_recover_tp: vm.recoverTP,
    manual_purchase_at_end: vm.manualPurchase,
    skip_double_circle_unless_high_hint: vm.skipDoubleCircleUnlessHighHint,
    hint_boost_characters: [...vm.hintBoostCharacters],
    hint_boost_multiplier: vm.hintBoostMultiplier,
    friendship_score_groups: normalizeFriendshipScoreGroups(vm.friendshipScoreGroups),
    race_tactic_1: vm.selectedRaceTactic1,
    race_tactic_2: vm.selectedRaceTactic2,
    race_tactic_3: vm.selectedRaceTactic3,
    tactic_actions: vm.raceTacticConditions,
    extraWeight: [
      clampExtraWeightRow(vm.extraWeight1),
      clampExtraWeightRow(vm.extraWeight2),
      clampExtraWeightRow(vm.extraWeight3),
      clampExtraWeightRow(vm.extraWeightSummer),
    ],
    ...buildScoringPayloadFromVm(vm),
    motivation_threshold_year1: vm.motivationThresholdYear1,
    motivation_threshold_year2: vm.motivationThresholdYear2,
    motivation_threshold_year3: vm.motivationThresholdYear3,
    ...buildPresetPalConfigPayloadFromVm(vm),
    selectedSkills: [...presetSkillPayload.selectedSkills],
    blacklistedSkills: [...presetSkillPayload.blacklistedSkills],
    skillAssignments: { ...presetSkillPayload.skillAssignments },
    activePriorities: [...presetSkillPayload.activePriorities],
  };
  Object.assign(preset, buildPresetScenarioConfigPayloadFromVm(vm));
  return preset;
}
