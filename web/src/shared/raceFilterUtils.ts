function toNormalizedString(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

export function isRaceCompatibleWithCharacter(
  race,
  selectedCharacter,
  characterList,
  characterTrainingPeriods,
) {
  if (!selectedCharacter) return true;
  const character = Array.isArray(characterList)
    ? characterList.find((entry) => entry && entry.name === selectedCharacter)
    : null;
  if (!character) return true;

  const matchesTerrain = race?.terrain === character.terrain;
  const characterDistances = typeof character.distance === 'string'
    ? character.distance.split(',').map((distance) => distance.trim()).filter(Boolean)
    : [];
  const matchesDistance = characterDistances.includes(race?.distance);
  if (!matchesTerrain || !matchesDistance) return false;

  const periods = characterTrainingPeriods && typeof characterTrainingPeriods === 'object'
    ? characterTrainingPeriods[selectedCharacter]
    : null;
  if (!periods || typeof periods !== 'object') return true;

  return (
    (Array.isArray(periods['Junior Year']) && periods['Junior Year'].includes(race?.date)) ||
    (Array.isArray(periods['Classic Year']) && periods['Classic Year'].includes(race?.date)) ||
    (Array.isArray(periods['Senior Year']) && periods['Senior Year'].includes(race?.date))
  );
}

function matchesGradeFilter(race, filters) {
  if (race.type === 'G1') return !!filters.showGI;
  if (race.type === 'G2') return !!filters.showGII;
  if (race.type === 'G3') return !!filters.showGIII;
  if (race.type === 'OP') return !!filters.showOP;
  if (race.type === 'PRE-OP') return !!filters.showPREOP;
  return false;
}

function matchesTerrainFilter(race, filters) {
  if (race.terrain === 'Turf') return !!filters.showTurf;
  if (race.terrain === 'Dirt') return !!filters.showDirt;
  return false;
}

function matchesDistanceFilter(race, filters) {
  if (race.distance === 'Sprint') return !!filters.showSprint;
  if (race.distance === 'Mile') return !!filters.showMile;
  if (race.distance === 'Medium') return !!filters.showMedium;
  if (race.distance === 'Long') return !!filters.showLong;
  return false;
}

function matchesSearchFilter(race, search) {
  const query = toNormalizedString(search).trim();
  if (!query) return true;
  const raceName = toNormalizedString(race?.name);
  const raceDate = toNormalizedString(race?.date);
  return raceName.includes(query) || raceDate.includes(query);
}

export function filterRacesForUi(races, filters) {
  const raceList = Array.isArray(races) ? races : [];
  return raceList.filter((race) => {
    if (!matchesSearchFilter(race, filters.raceSearch)) return false;
    if (!matchesGradeFilter(race, filters)) return false;
    if (!matchesTerrainFilter(race, filters)) return false;
    if (!matchesDistanceFilter(race, filters)) return false;
    return isRaceCompatibleWithCharacter(
      race,
      filters.selectedCharacter,
      filters.characterList,
      filters.characterTrainingPeriods,
    );
  });
}
