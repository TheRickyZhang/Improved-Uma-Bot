const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./moduleLoader.cjs');

const {
  fetchCultivatePresets,
  saveCultivatePreset,
  deleteCultivatePreset,
} = loadModule('presetApi');

test('fetchCultivatePresets normalizes array response', async () => {
  const axios = {
    post: async (url, body) => {
      assert.equal(url, '/umamusume/get-presets');
      assert.equal(body, '');
      return { data: [{ name: 'A' }, { name: 'B' }] };
    },
  };
  const presets = await fetchCultivatePresets(axios);
  assert.deepEqual(presets, [{ name: 'A' }, { name: 'B' }]);
});

test('fetchCultivatePresets normalizes wrapped response', async () => {
  const axios = {
    post: async () => ({ data: { presets: [{ name: 'Wrapped' }] } }),
  };
  const presets = await fetchCultivatePresets(axios);
  assert.deepEqual(presets, [{ name: 'Wrapped' }]);
});

test('saveCultivatePreset posts serialized payload', async () => {
  const calls = [];
  const axios = {
    post: async (url, body) => {
      calls.push([url, body]);
      return { ok: true };
    },
  };
  await saveCultivatePreset(axios, { name: 'Preset A', x: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/umamusume/add-presets');
  const decoded = JSON.parse(calls[0][1]);
  assert.equal(typeof decoded.preset, 'string');
  assert.deepEqual(JSON.parse(decoded.preset), { name: 'Preset A', x: 1 });
});

test('deleteCultivatePreset trims name and posts payload', async () => {
  const calls = [];
  const axios = {
    post: async (url, body) => {
      calls.push([url, body]);
      return { ok: true };
    },
  };
  await deleteCultivatePreset(axios, '  Preset X  ');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/umamusume/delete-preset');
  assert.deepEqual(JSON.parse(calls[0][1]), { name: 'Preset X' });
});

test('deleteCultivatePreset rejects empty names', async () => {
  const axios = { post: async () => ({}) };
  await assert.rejects(
    () => deleteCultivatePreset(axios, '   '),
    /non-empty preset name/,
  );
});
