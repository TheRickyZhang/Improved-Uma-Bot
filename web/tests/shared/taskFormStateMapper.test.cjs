const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./moduleLoader.cjs');

const { applyTaskFormStateFromSource } = loadModule('taskFormStateMapper');

function makeVm() {
  return {
    selectedScenario: 1,
    extraRace: [],
    expectSpeedValue: 0,
    expectStaminaValue: 0,
    expectPowerValue: 0,
    expectWillValue: 0,
    expectIntelligenceValue: 0,
    selectedSupportCard: null,
    supportCardLevel: 50,
    clockUseLimit: 99,
    restTreshold: 48,
    compensateFailure: true,
    failureRateDivisor: 50,
    useLastParents: false,
    overrideInsufficientFansForcedRaces: false,
    learnSkillOnlyUserProvided: false,
    recoverTP: 0,
    manualPurchase: false,
    skipDoubleCircleUnlessHighHint: false,
    hintBoostCharacters: [],
    hintBoostMultiplier: 100,
    friendshipScoreGroups: [],
    learnSkillThreshold: 888,
    cureAsapConditions: '',
    motivationThresholdYear1: 3,
    motivationThresholdYear2: 4,
    motivationThresholdYear3: 4,
    selectedRaceTactic1: 3,
    selectedRaceTactic2: 3,
    selectedRaceTactic3: 3,
    raceTacticConditions: [],
    extraWeight1: [],
    extraWeight2: [],
    extraWeight3: [],
    extraWeightSummer: [],
  };
}

test('applyTaskFormStateFromSource maps core fields and clamps weights', () => {
  const vm = makeVm();
  applyTaskFormStateFromSource(vm, {
    scenario: 2,
    extra_race_list: [11, 12],
    expect_attribute: [1, 2, 3, 4, 5],
    follow_support_card: { id: 1, name: 'Card' },
    follow_support_card_level: 45,
    clock_use_limit: 4,
    rest_threshold: 55,
    compensate_failure: false,
    failure_rate_divisor: 60,
    use_last_parents: true,
    override_insufficient_fans_forced_races: true,
    learn_skill_only_user_provided: true,
    allow_recover_tp: 2,
    manual_purchase_at_end: true,
    skip_double_circle_unless_high_hint: true,
    hint_boost_characters: ['A'],
    hint_boost_multiplier: 125,
    friendship_score_groups: [{ characters: ['X'], multiplier: 150 }],
    learn_skill_threshold: 777,
    cure_asap_conditions: 'X,Y',
    motivation_threshold_year1: 2,
    motivation_threshold_year2: 3,
    motivation_threshold_year3: 5,
    race_tactic_1: 1,
    race_tactic_2: 2,
    race_tactic_3: 4,
    extraWeight: [[2, -2, 0.2], [1.2], [-1.2], [0, 0, 0, 0, 0.9]],
  });

  assert.equal(vm.selectedScenario, 2);
  assert.deepEqual(vm.extraRace, [11, 12]);
  assert.deepEqual(
    [vm.expectSpeedValue, vm.expectStaminaValue, vm.expectPowerValue, vm.expectWillValue, vm.expectIntelligenceValue],
    [1, 2, 3, 4, 5],
  );
  assert.equal(vm.selectedSupportCard.name, 'Card');
  assert.equal(vm.supportCardLevel, 45);
  assert.equal(vm.compensateFailure, false);
  assert.equal(vm.learnSkillOnlyUserProvided, true);
  assert.equal(vm.hintBoostMultiplier, 125);
  assert.equal(vm.friendshipScoreGroups.length, 1);
  assert.deepEqual(vm.extraWeight1, [1, -1, 0.2, 0, 0]);
  assert.deepEqual(vm.extraWeight2, [1, 0, 0, 0, 0]);
  assert.deepEqual(vm.extraWeight3, [-1, 0, 0, 0, 0]);
  assert.deepEqual(vm.extraWeightSummer, [0, 0, 0, 0, 0.9]);
});

test('applyTaskFormStateFromSource uses tactic_actions when present', () => {
  const vm = makeVm();
  applyTaskFormStateFromSource(vm, {
    tactic_actions: [{ op: '>', val: 48, val2: 0, tactic: 4 }],
    race_tactic_1: 1,
    race_tactic_2: 2,
    race_tactic_3: 3,
  });
  assert.deepEqual(vm.raceTacticConditions, [{ op: '>', val: 48, val2: 0, tactic: 4 }]);
  assert.deepEqual([vm.selectedRaceTactic1, vm.selectedRaceTactic2, vm.selectedRaceTactic3], [1, 2, 3]);
});

test('applyTaskFormStateFromSource builds default tactic actions when missing', () => {
  const vm = makeVm();
  applyTaskFormStateFromSource(vm, {}, { defaultRaceTactics: [3, 3, 3] });
  assert.deepEqual(vm.raceTacticConditions, [
    { op: 'range', val: 0, val2: 25, tactic: 3 },
    { op: 'range', val: 24, val2: 49, tactic: 3 },
    { op: '>', val: 48, val2: 0, tactic: 3 },
  ]);
});
