import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './content',
    // Always derive id from the file path. Without this, Astro's loader
    // would use a frontmatter `slug` as the entire id, breaking
    // path-based URL resolution in src/lib/routing.ts.
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
  }),
  schema: ({ image }) => {
    const imageRef = z.union([image(), z.string()]);
    return z.object({
      title: z.string(),
      slug: z.string().optional(),
      type: z.enum(['page', 'index']).default('page'),
      display: z
        .enum(['list', 'cards', 'grid', 'gallery', 'sidebar'])
        .optional(),
      sort: z
        .enum(['date-desc', 'date-asc', 'order-asc', 'title'])
        .optional(),
      recursive: z.boolean().default(false),
      pageSize: z.number().int().positive().optional(),
      draft: z.boolean().default(false),
      hidden: z.boolean().default(false),
      order: z.number().optional(),
      date: z.coerce.date().optional(),
      author: z.string().optional(),
      tags: z.array(z.string()).default([]),
      excerpt: z.string().nullish().transform((v) => v ?? undefined),
      cover: imageRef.optional(),
      image: imageRef.optional(),
      website: z.string().url().optional(),
      navLabel: z.string().optional(),
      navOrder: z.number().optional(),
    });
  },
});

export const collections = { pages };
