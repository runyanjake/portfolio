/**
 * Site-wide configuration. Imported directly by layouts and components —
 * no filesystem I/O, no YAML, no readFileSync.
 *
 * `theme` selects a directory under src/themes/. Multiple themes can be
 * layered by passing an array; later entries cascade over earlier ones.
 * See src/themes/README for how to add or fork a theme.
 */
export interface NavItem {
  label: string;
  href: string;
}

export interface SiteConfig {
  title: string;
  tagline?: string;
  description?: string;
  url: string;
  theme: string | string[];
  footer?: string;
  nav?: NavItem[];
}

export const site: SiteConfig = {
  title: 'jake',
  tagline: 'Personal site',
  description: "Jake Runyan's personal website — projects, blog, friends.",
  url: 'https://jake.runyan.dev',
  theme: 'default',
  footer: '© 2026 Jake Runyan',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Projects', href: '/projects' },
    { label: 'Friends', href: '/friends' },
    { label: 'Contact', href: '/contact' },
  ],
};
