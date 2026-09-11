/**
 * The content collection.
 *
 * There is exactly one, rooted at `content/` in the project root rather
 * than under `src/`. Astro reserves only `src/pages/`; the Content Layer
 * `glob()` loader takes any `base` path, and `src/content/` is special
 * only to the legacy (pre-5) collections API we no longer use. Content is
 * the thing the author edits and the code is the thing they don't, so the
 * two live side by side at the top level.
 *
 * Sections are folders, not collections. `content/blog/` is a section
 * because a folder with an index.md is a section — adding one is making a
 * directory, not editing this file.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * An entry's id is its path with `/index.md` removed, so the id of
 * `content/blog/flux-1/index.md` is `blog/flux-1` — the folder name, and
 * also the URL. The root `content/index.md` has no folder, so it keeps
 * the id `index`; `urlOf()` in src/lib/content.ts maps that one to `/`.
 */
const stripIndex = ({ entry }: { entry: string }) =>
  entry.replace(/\/index\.mdx?$/i, '').replace(/\.mdx?$/i, '');

const content = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './content', generateId: stripIndex }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      excerpt: z.string().optional(),

      // Bibliographic fields. All optional: a section index has none of
      // them, a blog post has all of them, and the renderer shows
      // whichever are present.
      date: z.coerce.date().optional(),
      author: z.string().optional(),
      tags: z.array(z.string()).default([]),

      /**
       * The entry's one picture: its cover on its own page, and its
       * thumbnail wherever a parent lists it. A relative path goes
       * through Astro's asset pipeline; an absolute URL is used as-is,
       * for images hosted somewhere else (friends' avatars).
       */
      image: z.union([image(), z.string().url()]).optional(),
      imageAlt: z.string().optional(),

      /** Points the entry's listing card at somewhere off-site. */
      link: z.string().url().optional(),

      /** Position under `sort: order`. Unset sorts last. */
      order: z.number().optional(),

      /** Excluded from the build entirely — no page, no listing. */
      draft: z.boolean().default(false),

      /**
       * Put this entry in the site nav. `nav: 3` is shorthand for
       * `{ order: 3 }`; `label` overrides the link text. The nav is
       * derived from this field alone, so there is no list to keep in
       * sync with the content tree.
       */
      nav: z
        .union([
          z.number(),
          z.object({ order: z.number().optional(), label: z.string().optional() }),
        ])
        .optional(),

      /**
       * How this entry renders. `page` is prose only; every other value
       * appends a listing of the folder's direct children in that shape.
       * See .claude/AUTHORING.md.
       */
      style: z.enum(['page', 'list', 'cards', 'grid', 'gallery']).default('page'),

      /** Order of the children a listing shows. Ignored by `style: page`. */
      sort: z.enum(['newest', 'oldest', 'order', 'title']).default('newest'),

      /**
       * The measure. Everything defaults to the reading column; set this
       * only to escape it.
       *
       * NB: the field is `width`, not `layout`. `layout` is reserved by
       * Astro's MDX integration — it compiles into an import of a layout
       * component, so `layout: wide` fails the build trying to resolve a
       * module named "wide".
       */
      width: z.enum(['article', 'wide', 'full', 'canvas']).default('article'),

      /** The site shell: header + footer, header only, or neither. */
      chrome: z.enum(['default', 'minimal', 'bare']).default('default'),
    }),
});

export const collections = { content };
