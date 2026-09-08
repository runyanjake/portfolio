/**
 * The block vocabulary — the complete set of components available inside
 * `.mdx` bodies. Every `[slug].astro` route renders
 * `<Content components={blocks} />`, so this object is the single source
 * of truth for what authors can use. Adding a block is one import plus
 * one entry here; routes never change.
 *
 * Each block's class names are part of the theme contract documented in
 * src/themes/default/index.css. A theme that does not style a new block
 * still renders it — unstyled, but functional.
 */
import Aside from './Aside.astro';
import Bleed from './Bleed.astro';
import Callout from './Callout.astro';
import Column from './Column.astro';
import Columns from './Columns.astro';
import Embed from './Embed.astro';
import Figure from './Figure.astro';
import Gallery from './Gallery.astro';
import Steps from './Steps.astro';

export const blocks = {
  Aside,
  Bleed,
  Callout,
  Column,
  Columns,
  Embed,
  Figure,
  Gallery,
  Steps,
};
