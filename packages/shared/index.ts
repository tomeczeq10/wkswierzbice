// Typy współdzielone między apps/web a apps/cms.
// Źródło prawdy: apps/cms/src/payload-types.ts (generowane przez `npm run generate:types`).
//
// Re-eksportujemy tylko to, czego front realnie używa, żeby nie ciągnąć całego Payload Config
// (UserAuthOperations, SupportedTimezones itp.) do bundla Astro.
//
// UWAGA: po zmianie schemy Payload (np. dodaniu pola w News) trzeba uruchomić:
//   npm run generate:types
// w monorepo root (lub `npm run generate:types --workspace=cms`).

export type { News, Tag, Media, User, Team, Player, Gallery, SiteConfig } from '../../apps/cms/src/payload-types';
