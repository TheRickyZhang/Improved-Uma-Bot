# TypeScript Migration Status

This project is migrating incrementally to stronger type safety.

## Current State

- Shared task logic is in strict TypeScript:
  - `web/src/shared/*.ts`
  - checked with `cd web && npm run typecheck`
- `TaskEditModal.vue` is now in TS script mode (`<script lang="ts">`).
- Vue SFC checks are enabled for migration scope:
  - `cd web && npm run typecheck:vue`

## Why Vue Strict Is Not Fully Enabled Yet

`TaskEditModal.vue` is a large legacy Options-API component with highly dynamic state and legacy globals (`$`, bootstrap modal APIs, runtime-injected fields).  
Turning full strict checking on immediately currently produces a large volume of structural typing errors in one step.

## Roadmap To Maximal Type Safety

1. Introduce explicit interfaces for modal state slices (`race`, `skills`, `preset`, `scoring`) and type `data()` with those interfaces.
2. Extract high-complexity sections into typed composables or child components:
   - race filter block
   - skill assignment block
   - preset save/load block
3. Replace untyped globals (`$`) with typed utility wrappers.
4. Enable stricter Vue checks in phases:
   - keep `strictTemplates: false` while typing state and methods
   - then enable strict templates
   - then raise Vue `compilerOptions.strict` once remaining dynamic surfaces are removed

This phased approach keeps the UI functional while steadily increasing compile-time guarantees.
