/**
 * The values `sidebar:` accepts, after normalisation.
 *
 * Kept in its own dependency-free module because src/content.config.ts
 * imports it, and the content config is loaded before anything that
 * pulls in `astro:content`.
 */
export const SIDEBARS = ['none', 'headers', 'progress'] as const;

export type SidebarKind = (typeof SIDEBARS)[number];
