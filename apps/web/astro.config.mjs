import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

import { SITE } from "./src/config/site";

export default defineConfig({
  site: SITE.url,
  trailingSlash: "ignore",
  build: {
    format: "directory",
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
  image: {
    service: { entrypoint: "astro/assets/services/sharp" },
  },
});
