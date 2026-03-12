function cloneThresholdRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => Array.isArray(row))
    .map((row) => row.map((v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }));
}

function normalizePalCardStore(store) {
  const out = {};
  if (!store || typeof store !== 'object') return out;
  for (const [name, rows] of Object.entries(store)) {
    const cloned = cloneThresholdRows(rows);
    if (name && cloned.length > 0) out[name] = cloned;
  }
  return out;
}

export function buildTaskPalConfigPayloadFromVm(vm) {
  const selected = typeof vm.palSelected === 'string' ? vm.palSelected : '';
  const thresholds = cloneThresholdRows(vm.palCardStore?.[selected]);
  if (vm.prioritizeRecreation && selected && thresholds.length > 0) {
    return {
      prioritize_recreation: true,
      pal_name: selected,
      pal_thresholds: thresholds,
    };
  }
  return {
    prioritize_recreation: false,
    pal_name: '',
    pal_thresholds: [],
  };
}

export function buildPresetPalConfigPayloadFromVm(vm) {
  return {
    prioritize_recreation: vm.prioritizeRecreation === true,
    pal_selected: typeof vm.palSelected === 'string' ? vm.palSelected : '',
    pal_card_store: normalizePalCardStore(vm.palCardStore),
  };
}

export function applyPresetPalConfigSourceToVm(vm, source) {
  vm.prioritizeRecreation = source?.prioritize_recreation === true;
  vm.palSelected = typeof source?.pal_selected === 'string' ? source.pal_selected : '';
  const incomingStore = normalizePalCardStore(source?.pal_card_store);
  for (const [name, rows] of Object.entries(incomingStore)) {
    vm.palCardStore[name] = rows;
  }
}

export function applyTaskPalConfigSourceToVm(vm, source) {
  vm.prioritizeRecreation = source?.prioritize_recreation === true;
  vm.palSelected = typeof source?.pal_name === 'string' ? source.pal_name : '';
  const thresholds = cloneThresholdRows(source?.pal_thresholds);
  if (vm.palSelected && thresholds.length > 0) {
    vm.palCardStore[vm.palSelected] = thresholds;
  }
}
