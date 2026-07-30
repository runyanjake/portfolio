import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Strip `/index` off any folder-per-entry file so the id equals the
// folder name. Astro's default id would otherwise be `<folder>/index`.
const stripIndex = ({ entry }: { entry: string }) =>
  entry.replace(/\/index\.(md|mdx)$/i, '').replace(/\.(md|mdx)$/i, '');

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
  }),
});

export const collections = { blog, projects, about, friends };
