# auto-gui

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Shared Module Tests

```sh
npm run test:shared
```

### Shared Typecheck

```sh
npm run typecheck
```

### Vue SFC Typecheck (Migration Scope)

```sh
npm run typecheck:vue
```

## Notes

- The task UI logic is being migrated incrementally to TypeScript.
- Shared task/preset/decision modules live in `src/shared/*.ts` and are covered by `test:shared` + `typecheck`.
- `TaskEditModal.vue` is now `lang="ts"` and checked via `typecheck:vue`.
- Migration details and strictness roadmap: `../docs/TYPESCRIPT_MIGRATION.md`.
