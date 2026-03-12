export function buildEventChoicesPayloadFromSelection(selection) {
  const out = {};
  if (!selection || typeof selection !== 'object') return out;
  for (const [eventName, value] of Object.entries(selection)) {
    if (!eventName) continue;
    const n = Number(value);
    if (Number.isInteger(n) && n > 0) {
      out[eventName] = n;
    }
  }
  return out;
}

export function applyEventChoicesSourceToVm(vm, source) {
  vm.eventChoicesSelected = buildEventChoicesPayloadFromSelection(source);
}
