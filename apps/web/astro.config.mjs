import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";

import { SITE } from "./src/config/site";

export default defineConfig({
  site: SITE.url,
  trailingSlash: "ignore",
  output: "server",
  // Domyślny port 4321; jeśli zajęty — Astro kończy z błędem zamiast cicho
  // przechodzić na 4322 (wtedy łatwo ogląda się „stary” serwer na 4321).
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
  image: {
    service: { entrypoint: "astro/assets/services/sharp" },
  },
});
