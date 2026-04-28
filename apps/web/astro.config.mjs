import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";

import { SITE } from "./src/config/site";

export default defineConfig({
  site: SITE.url,
  trailingSlash: "ignore",
  output: "server",
  // Port 4321; `strictPort` też w `vite.server` — inaczej Vite i tak skacze na 4322+.
  server: {
    port: 4321,
    strictPort: true,
  },
  build: {
    format: "directory",
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
  adapter: node({
    mode: "standalone",
  }),
  /** Vite ignoruje czasem `server.strictPort` z poziomu Astro — wtedy i tak skacze port. */
  vite: {
    server: {
      strictPort: true,
    },
  },
  image: {
    service: { entrypoint: "astro/assets/services/sharp" },
  },
});
