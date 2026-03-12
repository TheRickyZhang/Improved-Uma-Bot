type SkillAssignments = Record<string, number>;

interface SkillSelectionState {
  selectedSkills: string[];
  blacklistedSkills: string[];
  skillAssignments: SkillAssignments;
  activePriorities: number[];
}

type AnyRecord = Record<string, any>;

function toSkillName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function parseCsvSkills(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim().length === 0) return [];
  return value
    .split(',')
    .map((v) => toSkillName(v))
    .filter((v) => v.length > 0);
}

function normalizePriority(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return Math.floor(n);
}

function uniqueSkills(list: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const source = Array.isArray(list) ? list : [];
  for (const raw of source) {
    const skill = toSkillName(raw);
    if (!skill || seen.has(skill)) continue;
    seen.add(skill);
    out.push(skill);
  }
  return out;
}

export function normalizeSkillSelectionState(rawState: AnyRecord | null | undefined): SkillSelectionState {
  const selectedInput = uniqueSkills(rawState?.selectedSkills || []);
  const blacklisted = uniqueSkills(rawState?.blacklistedSkills || []);
  const blacklistSet = new Set(blacklisted);
  const selectedSkills = selectedInput.filter((name) => !blacklistSet.has(name));

  const assignmentsRaw = rawState?.skillAssignments && typeof rawState.skillAssignments === 'object'
    ? rawState.skillAssignments
    : {};
  const skillAssignments: SkillAssignments = {};
  const assignmentPriorities = new Set<number>([0]);
  for (const skillName of selectedSkills) {
    const priority = normalizePriority(assignmentsRaw[skillName]);
    skillAssignments[skillName] = priority;
    assignmentPriorities.add(priority);
  }

  const activeSet = new Set<number>([0, ...assignmentPriorities]);
  if (Array.isArray(rawState?.activePriorities)) {
    for (const priority of rawState.activePriorities) {
      activeSet.add(normalizePriority(priority));
    }
  }
  const activePriorities = Array.from(activeSet).sort((a, b) => a - b);

  return {
    selectedSkills,
    blacklistedSkills: blacklisted,
    skillAssignments,
    activePriorities,
  };
}

function groupSkillsByPriority(state: SkillSelectionState): Map<number, string[]> {
  const grouped = new Map<number, string[]>();
  for (const skillName of state.selectedSkills) {
    const priority = normalizePriority(state.skillAssignments[skillName]);
    if (!grouped.has(priority)) grouped.set(priority, []);
    const bucket = grouped.get(priority);
    if (bucket) bucket.push(skillName);
  }
  return grouped;
}

function getMaxPriority(state: SkillSelectionState, grouped: Map<number, string[]>): number {
  const fromActive = state.activePriorities.length > 0 ? Math.max(...state.activePriorities) : 0;
  const fromGrouped = grouped.size > 0 ? Math.max(...grouped.keys()) : 0;
  return Math.max(0, fromActive, fromGrouped);
}

export function buildLegacySkillPriorityRowsFromState(stateLike: AnyRecord | null | undefined): string[] {
  const state = normalizeSkillSelectionState(stateLike);
  const grouped = groupSkillsByPriority(state);
  const maxPriority = getMaxPriority(state, grouped);
  const rows: string[] = [];
  for (let priority = 0; priority <= maxPriority; priority++) {
    rows.push((grouped.get(priority) || []).join(', '));
  }
  return rows;
}

export function buildTaskSkillPayloadFromVm(vm: AnyRecord): AnyRecord {
  const state = normalizeSkillSelectionState({
    selectedSkills: vm.selectedSkills,
    blacklistedSkills: vm.blacklistedSkills,
    skillAssignments: vm.skillAssignments,
    activePriorities: vm.activePriorities,
  });
  const grouped = groupSkillsByPriority(state);
  const maxPriority = getMaxPriority(state, grouped);
  const learn_skill_list: string[][] = [];
  for (let priority = 0; priority <= maxPriority; priority++) {
    learn_skill_list.push([...(grouped.get(priority) || [])]);
  }
  return {
    learn_skill_list,
    learn_skill_blacklist: [...state.blacklistedSkills],
  };
}

export function buildPresetSkillPayloadFromVm(vm: AnyRecord): AnyRecord {
  const state = normalizeSkillSelectionState({
    selectedSkills: vm.selectedSkills,
    blacklistedSkills: vm.blacklistedSkills,
    skillAssignments: vm.skillAssignments,
    activePriorities: vm.activePriorities,
  });
  return {
    skill_priority_list: buildLegacySkillPriorityRowsFromState(state).map((row) => [row]),
    skill_blacklist: state.blacklistedSkills.join(', '),
    selectedSkills: [...state.selectedSkills],
    blacklistedSkills: [...state.blacklistedSkills],
    skillAssignments: { ...state.skillAssignments },
    activePriorities: [...state.activePriorities],
  };
}

function parseTaskSkillSource(source: AnyRecord | null | undefined): SkillSelectionState {
  const selectedSkills: string[] = [];
  const skillAssignments: SkillAssignments = {};
  if (Array.isArray(source?.learn_skill_list)) {
    source.learn_skill_list.forEach((skills, priority) => {
      if (!Array.isArray(skills)) return;
      for (const rawSkill of skills) {
        const skillName = toSkillName(rawSkill);
        if (!skillName || selectedSkills.includes(skillName)) continue;
        selectedSkills.push(skillName);
        skillAssignments[skillName] = normalizePriority(priority);
      }
    });
  }
  return normalizeSkillSelectionState({
    selectedSkills,
    blacklistedSkills: Array.isArray(source?.learn_skill_blacklist) ? source.learn_skill_blacklist : [],
    skillAssignments,
    activePriorities: [],
  });
}

function parseLegacyPresetSkillSource(source: AnyRecord | null | undefined): SkillSelectionState {
  const blacklistedSkills = parseCsvSkills(source?.skill_blacklist || '');
  const selectedSkills: string[] = [];
  const skillAssignments: SkillAssignments = {};

  if (Array.isArray(source?.skill_priority_list)) {
    source.skill_priority_list.forEach((priorityEntry, priority) => {
      const text = Array.isArray(priorityEntry)
        ? String(priorityEntry[0] ?? '')
        : String(priorityEntry ?? '');
      for (const skillName of parseCsvSkills(text)) {
        if (blacklistedSkills.includes(skillName) || selectedSkills.includes(skillName)) continue;
        selectedSkills.push(skillName);
        skillAssignments[skillName] = normalizePriority(priority);
      }
    });
  } else if (typeof source?.skill === 'string' && source.skill.trim().length > 0) {
    for (const skillName of parseCsvSkills(source.skill)) {
      if (blacklistedSkills.includes(skillName) || selectedSkills.includes(skillName)) continue;
      selectedSkills.push(skillName);
      skillAssignments[skillName] = 0;
    }
  }

  return normalizeSkillSelectionState({
    selectedSkills,
    blacklistedSkills,
    skillAssignments,
    activePriorities: [],
  });
}

export function parseSkillSelectionFromSource(source: AnyRecord | null | undefined): SkillSelectionState {
  const hasNewFormat = Array.isArray(source?.selectedSkills)
    && Array.isArray(source?.blacklistedSkills)
    && source?.skillAssignments
    && typeof source.skillAssignments === 'object'
    && Array.isArray(source?.activePriorities);
  if (hasNewFormat) {
    return normalizeSkillSelectionState(source);
  }

  const hasTaskFormat = Array.isArray(source?.learn_skill_list) || Array.isArray(source?.learn_skill_blacklist);
  if (hasTaskFormat) {
    return parseTaskSkillSource(source);
  }

  return parseLegacyPresetSkillSource(source || {});
}

export function applySkillSelectionStateToVm(vm: AnyRecord, stateLike: AnyRecord | null | undefined): void {
  const state = normalizeSkillSelectionState(stateLike);
  vm.selectedSkills = [...state.selectedSkills];
  vm.blacklistedSkills = [...state.blacklistedSkills];
  vm.skillAssignments = { ...state.skillAssignments };
  vm.activePriorities = [...state.activePriorities];
}
