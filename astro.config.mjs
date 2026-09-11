import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { blockCheck, markdownPlugins } from './src/render/markdown';

export default defineConfig({
  site: 'https://jake.runyan.dev',
  output: 'static',
  trailingSlash: 'never',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  // blockCheck turns a bad markdown block into a failed build. The
  // content loader swallows render errors, so without it a typo'd
  // directive ships an empty page body and still exits 0.
  integrations: [mdx(), blockCheck()],
  markdown: {
    // The block vocabulary. Everything about how a markdown body becomes
    // HTML lives under src/render/ — this is the one line that points at
    // it. @astrojs/mdx inherits this config, so .md and .mdx bodies get
    // the same blocks.
    remarkPlugins: markdownPlugins,
    shikiConfig: {
      theme: 'github-dark-dimmed',
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
