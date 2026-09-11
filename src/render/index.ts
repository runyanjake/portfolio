/**
 * The rendering engine's public surface.
 *
 * Routes import from here and nowhere deeper. Everything about how
 * content looks — the document shell, the entry renderer, the displays,
 * the markdown block vocabulary — lives under src/render/ and is
 * reachable through this one module. Nothing outside it needs to know
 * that displays or directives exist.
 */
export { default as Entry } from './Entry.astro';
export { default as Document } from './Document.astro';
export type { Chrome, Width } from './Document.astro';
export type { Item } from './types';
export type { Style } from './Listing.astro';
export { markdownPlugins, blockCheck, blocks } from './markdown';
