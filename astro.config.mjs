// @ts-check
import { defineConfig } from 'astro/config';

// Static output. Set `site` (and `base` if deploying under a subpath, e.g. GitHub Pages
// project sites) before deploying.
export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL ?? 'https://example.com',
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'always',
});
