function normalizePresetList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.presets)) return data.presets;
  return [];
}

function ensureAxios(axiosClient) {
  if (!axiosClient || typeof axiosClient.post !== 'function') {
    throw new Error('presetApi requires an axios-like client with post()');
  }
}

export async function fetchCultivatePresets(axiosClient) {
  ensureAxios(axiosClient);
  const response = await axiosClient.post('/umamusume/get-presets', '');
  return normalizePresetList(response?.data);
}

export async function saveCultivatePreset(axiosClient, preset) {
  ensureAxios(axiosClient);
  if (!preset || typeof preset !== 'object') {
    throw new Error('saveCultivatePreset requires a preset object');
  }
  const payload = { preset: JSON.stringify(preset) };
  return axiosClient.post('/umamusume/add-presets', JSON.stringify(payload));
}

export async function deleteCultivatePreset(axiosClient, name) {
  ensureAxios(axiosClient);
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    throw new Error('deleteCultivatePreset requires a non-empty preset name');
  }
  return axiosClient.post('/umamusume/delete-preset', JSON.stringify({ name: trimmed }));
}
