const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./moduleLoader.cjs');

const {
  getSortedPriorities,
  getSkillsForPriority,
  selectSkillsAtPriority,
  blacklistSkills,
  toggleSkillSelection,
  toggleSkillBlacklist,
  addPriorityLevel,
  removeLastPriorityLevel,
  clearPrioritySelection,
} = loadModule('skillAssignmentUtils');

function baseState() {
  return {
    selectedSkills: ['A'],
    blacklistedSkills: ['Z'],
    skillAssignments: { A: 0 },
    activePriorities: [0, 1],
  };
}

test('priority helpers normalize and sort values', () => {
  assert.deepEqual(getSortedPriorities([3, 1, 0, 1]), [0, 1, 3]);
});

test('selectSkillsAtPriority moves skills out of blacklist and assigns priority', () => {
  const next = selectSkillsAtPriority(baseState(), ['Z', 'B'], 1);
  assert.deepEqual(next.blacklistedSkills, []);
  assert.deepEqual(next.selectedSkills.sort(), ['A', 'B', 'Z']);
  assert.equal(next.skillAssignments.Z, 1);
  assert.equal(next.skillAssignments.B, 1);
});

test('blacklistSkills removes from selected and assignments', () => {
  const next = blacklistSkills(baseState(), ['A']);
  assert.deepEqual(next.selectedSkills, []);
  assert.equal(next.skillAssignments.A, undefined);
  assert.deepEqual(next.blacklistedSkills.sort(), ['A', 'Z']);
});

test('toggleSkillSelection toggles selected state with highest priority assignment', () => {
  const added = toggleSkillSelection(baseState(), 'B');
  assert.equal(added.skillAssignments.B, 1);
  const removed = toggleSkillSelection(added, 'B');
  assert.equal(removed.selectedSkills.includes('B'), false);
});

test('toggleSkillBlacklist toggles blacklist and clears selection if needed', () => {
  const blacklisted = toggleSkillBlacklist(baseState(), 'A');
  assert.equal(blacklisted.selectedSkills.includes('A'), false);
  assert.equal(blacklisted.blacklistedSkills.includes('A'), true);
  const unblacklisted = toggleSkillBlacklist(blacklisted, 'A');
  assert.equal(unblacklisted.blacklistedSkills.includes('A'), false);
});

test('add/remove priority level and clearPrioritySelection keep assignments consistent', () => {
  const withNew = addPriorityLevel(baseState());
  assert.deepEqual(withNew.activePriorities, [0, 1, 2]);

  const withExtraAssignments = selectSkillsAtPriority(withNew, ['B'], 2);
  const removed = removeLastPriorityLevel(withExtraAssignments);
  assert.deepEqual(removed.activePriorities, [0, 1]);
  assert.equal(removed.skillAssignments.B, 1);

  const cleared = clearPrioritySelection(withExtraAssignments, 2);
  assert.equal(getSkillsForPriority(cleared.selectedSkills, cleared.skillAssignments, 2).length, 0);
});
