/// <reference types="vite/client" />

declare module 'virtual:events' {
  const eventNames: string[];
  export default eventNames;
  export const eventOptionCounts: Record<string, number>;
}

declare const $: any;
declare const bootstrap: any;

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    axios: any;
  }
}
