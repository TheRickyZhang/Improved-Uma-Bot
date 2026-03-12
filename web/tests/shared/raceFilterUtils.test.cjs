const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./moduleLoader.cjs');

const { isRaceCompatibleWithCharacter, filterRacesForUi } = loadModule('raceFilterUtils');

test('isRaceCompatibleWithCharacter respects terrain, distance, and period', () => {
  const race = {
    name: 'Race A',
    date: 'Junior Year Jan Early',
    terrain: 'Turf',
    distance: 'Mile',
  };
  const characterList = [{ name: 'Spe', terrain: 'Turf', distance: 'Mile, Medium' }];
  const periods = {
    Spe: {
      'Junior Year': ['Junior Year Jan Early'],
      'Classic Year': [],
      'Senior Year': [],
    },
  };
  assert.equal(isRaceCompatibleWithCharacter(race, 'Spe', characterList, periods), true);
  assert.equal(
    isRaceCompatibleWithCharacter({ ...race, terrain: 'Dirt' }, 'Spe', characterList, periods),
    false,
  );
  assert.equal(
    isRaceCompatibleWithCharacter({ ...race, date: 'Senior Year Jan Early' }, 'Spe', characterList, periods),
    false,
  );
});

test('filterRacesForUi applies search, grade, and character filters', () => {
  const races = [
    { id: 1, name: 'Sprint Cup', date: 'Junior Year Jan Early', type: 'G1', terrain: 'Turf', distance: 'Mile' },
    { id: 2, name: 'Dirt Open', date: 'Junior Year Jan Early', type: 'OP', terrain: 'Dirt', distance: 'Mile' },
    { id: 3, name: 'Mile GI', date: 'Classic Year Jan Early', type: 'G1', terrain: 'Turf', distance: 'Mile' },
  ];
  const filters = {
    raceSearch: 'sprint',
    showGI: true,
    showGII: false,
    showGIII: false,
    showOP: false,
    showPREOP: false,
    showTurf: true,
    showDirt: false,
    showSprint: false,
    showMile: true,
    showMedium: false,
    showLong: false,
    selectedCharacter: 'Spe',
    characterList: [{ name: 'Spe', terrain: 'Turf', distance: 'Mile' }],
    characterTrainingPeriods: {
      Spe: {
        'Junior Year': ['Junior Year Jan Early'],
        'Classic Year': [],
        'Senior Year': [],
      },
    },
  };
  const filtered = filterRacesForUi(races, filters);
  assert.deepEqual(filtered.map((race) => race.id), [1]);
});
