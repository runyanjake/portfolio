import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Strip `/index` off any folder-per-entry file so the id equals the
// folder name. Astro's default id would otherwise be `<folder>/index`.
const stripIndex = ({ entry }: { entry: string }) =>
  entry.replace(/\/index\.(md|mdx)$/i, '').replace(/\.(md|mdx)$/i, '');

// Presentation switches shared by every collection. Both are enums, so a
// typo fails the build instead of silently rendering the default. See
// .claude/AUTHORING.md for what each value does.
//
// NB: this field is `width`, not `layout`. `layout` is reserved by Astro's
// MDX integration -- it is compiled into an import of a layout component,
// so `layout: wide` in an .mdx file fails the build with an unresolved
// import of "wide".
const presentation = {
  width: z.enum(['article', 'wide', 'full', 'canvas']).default('article'),
  chrome: z.enum(['default', 'minimal', 'bare']).default('default'),
};

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog', generateId: stripIndex }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      author: z.string().optional(),
      tags: z.array(z.string()).default([]),
      excerpt: z.string().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      draft: z.boolean().default(false),
      ...presentation,
    }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects', generateId: stripIndex }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date().optional(),
      author: z.string().optional(),
      tags: z.array(z.string()).default([]),
      excerpt: z.string().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      order: z.number().optional(),
      draft: z.boolean().default(false),
      ...presentation,
    }),
});

const about = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/about', generateId: stripIndex }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      excerpt: z.string().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      order: z.number().optional(),
      draft: z.boolean().default(false),
      ...presentation,
    }),
});

const friends = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/friends', generateId: stripIndex }),
  schema: z.object({
    title: z.string(),
    website: z.string().url(),
    image: z.string().url().optional(),
    excerpt: z.string().optional(),
    draft: z.boolean().default(false),
    ...presentation,
  }),
});

export const collections = { blog, projects, about, friends };
