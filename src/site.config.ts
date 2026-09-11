/**
 * Site-wide configuration — the handful of things that are not content.
 *
 * The nav is deliberately absent: it is derived from `nav:` in the
 * content tree (see siteNav() in src/lib/content.ts), so there is no list
 * here to drift out of sync with the sections that actually exist.
 *
 * `theme` selects a directory under src/themes/. Passing an array layers
 * them; later entries cascade over earlier ones, which is how you
 * override an accent color without forking a whole theme.
 */
export interface SiteConfig {
  title: string;
  description?: string;
  url: string;
  theme: string | string[];
  footer?: string;
}

export const site: SiteConfig = {
  title: 'jake',
  description: "Jake Runyan's personal website — projects, blog, friends.",
  url: 'https://jake.runyan.dev',
  theme: 'default',
  footer: '© 2026 Jake Runyan',
};
