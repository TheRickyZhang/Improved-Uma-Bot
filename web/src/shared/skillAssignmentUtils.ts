type SkillAssignments = Record<string, number>;

interface SkillState {
  selectedSkills: string[];
  blacklistedSkills: string[];
  skillAssignments: SkillAssignments;
  activePriorities: number[];
}

function normalizePriority(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function normalizeSkillNames(skillNames: unknown): string[] {
  if (!Array.isArray(skillNames)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of skillNames) {
    if (typeof raw !== 'string') continue;
    const name = raw.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function removeSkillFromArray(skillArray: string[], skillName: string): void {
  const idx = skillArray.indexOf(skillName);
  if (idx >= 0) skillArray.splice(idx, 1);
}

function cloneSkillState(state?: Partial<SkillState> | null): SkillState {
  return {
    selectedSkills: Array.isArray(state?.selectedSkills)
      ? state.selectedSkills.filter((skillName) => typeof skillName === 'string')
      : [],
    blacklistedSkills: Array.isArray(state?.blacklistedSkills)
      ? state.blacklistedSkills.filter((skillName) => typeof skillName === 'string')
      : [],
    skillAssignments: state?.skillAssignments && typeof state.skillAssignments === 'object'
      ? { ...state.skillAssignments }
      : {},
    activePriorities: Array.isArray(state?.activePriorities) ? [...state.activePriorities] : [0],
  };
}

export function getSortedPriorities(activePriorities: unknown): number[] {
  const normalized = [0, ...(Array.isArray(activePriorities) ? activePriorities : [])]
    .map((value) => normalizePriority(value, 0));
  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

export function getHighestPriority(activePriorities: unknown): number {
  const sorted = getSortedPriorities(activePriorities);
  return sorted[sorted.length - 1];
}

export function getSkillsForPriority(
  selectedSkills: unknown,
  skillAssignments: unknown,
  priority: unknown,
): string[] {
  const targetPriority = normalizePriority(priority, 0);
  const selected = Array.isArray(selectedSkills) ? selectedSkills : [];
  const assignments = skillAssignments && typeof skillAssignments === 'object' ? skillAssignments : {};
  return selected.filter((skillName) => normalizePriority(assignments[skillName], 0) === targetPriority);
}

export function selectSkillsAtPriority(
  state: Partial<SkillState> | null | undefined,
  skillNames: unknown,
  priority: unknown,
): SkillState {
  const next = cloneSkillState(state);
  const targetPriority = normalizePriority(priority, getHighestPriority(next.activePriorities));
  for (const skillName of normalizeSkillNames(skillNames)) {
    removeSkillFromArray(next.blacklistedSkills, skillName);
    if (!next.selectedSkills.includes(skillName)) next.selectedSkills.push(skillName);
    next.skillAssignments[skillName] = targetPriority;
  }
  return next;
}

export function blacklistSkills(
  state: Partial<SkillState> | null | undefined,
  skillNames: unknown,
): SkillState {
  const next = cloneSkillState(state);
  for (const skillName of normalizeSkillNames(skillNames)) {
    removeSkillFromArray(next.selectedSkills, skillName);
    delete next.skillAssignments[skillName];
    if (!next.blacklistedSkills.includes(skillName)) next.blacklistedSkills.push(skillName);
  }
  return next;
}

export function clearSelectedSkills(
  state: Partial<SkillState> | null | undefined,
  skillNames: unknown,
): SkillState {
  const next = cloneSkillState(state);
  for (const skillName of normalizeSkillNames(skillNames)) {
    removeSkillFromArray(next.selectedSkills, skillName);
    delete next.skillAssignments[skillName];
  }
  return next;
}

export function unblacklistSkills(
  state: Partial<SkillState> | null | undefined,
  skillNames: unknown,
): SkillState {
  const next = cloneSkillState(state);
  const toRemove = new Set(normalizeSkillNames(skillNames));
  next.blacklistedSkills = next.blacklistedSkills.filter((skillName) => !toRemove.has(skillName));
  return next;
}

export function deselectSkillEverywhere(
  state: Partial<SkillState> | null | undefined,
  skillName: unknown,
): SkillState {
  const next = cloneSkillState(state);
  if (typeof skillName !== 'string' || skillName.trim().length === 0) return next;
  removeSkillFromArray(next.selectedSkills, skillName);
  removeSkillFromArray(next.blacklistedSkills, skillName);
  delete next.skillAssignments[skillName];
  return next;
}

export function toggleSkillSelection(
  state: Partial<SkillState> | null | undefined,
  skillName: unknown,
): SkillState {
  const next = cloneSkillState(state);
  if (typeof skillName !== 'string' || skillName.trim().length === 0) return next;
  if (next.selectedSkills.includes(skillName)) {
    removeSkillFromArray(next.selectedSkills, skillName);
    delete next.skillAssignments[skillName];
    return next;
  }
  next.selectedSkills.push(skillName);
  next.skillAssignments[skillName] = getHighestPriority(next.activePriorities);
  return next;
}

export function toggleSkillBlacklist(
  state: Partial<SkillState> | null | undefined,
  skillName: unknown,
): SkillState {
  const next = cloneSkillState(state);
  if (typeof skillName !== 'string' || skillName.trim().length === 0) return next;
  if (next.blacklistedSkills.includes(skillName)) {
    removeSkillFromArray(next.blacklistedSkills, skillName);
    return next;
  }
  if (!next.blacklistedSkills.includes(skillName)) next.blacklistedSkills.push(skillName);
  removeSkillFromArray(next.selectedSkills, skillName);
  delete next.skillAssignments[skillName];
  return next;
}

export function addPriorityLevel(state: Partial<SkillState> | null | undefined): SkillState {
  const next = cloneSkillState(state);
  next.activePriorities = [...getSortedPriorities(next.activePriorities), getHighestPriority(next.activePriorities) + 1];
  return next;
}

export function removeLastPriorityLevel(state: Partial<SkillState> | null | undefined): SkillState {
  const next = cloneSkillState(state);
  const sorted = getSortedPriorities(next.activePriorities);
  if (sorted.length <= 1) return next;
  const removedPriority = sorted[sorted.length - 1];
  const activePriorities = sorted.slice(0, -1);
  const newHighestPriority = activePriorities[activePriorities.length - 1];
  for (const skillName of Object.keys(next.skillAssignments)) {
    if (normalizePriority(next.skillAssignments[skillName], 0) === removedPriority) {
      next.skillAssignments[skillName] = newHighestPriority;
    }
  }
  next.activePriorities = activePriorities;
  return next;
}

export function clearPrioritySelection(
  state: Partial<SkillState> | null | undefined,
  priority: unknown,
): SkillState {
  const targetPriority = normalizePriority(priority, 0);
  return clearSelectedSkills(
    state,
    getSkillsForPriority(state?.selectedSkills, state?.skillAssignments, targetPriority),
  );
}
