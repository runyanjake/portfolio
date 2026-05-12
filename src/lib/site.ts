import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'astro:content';

const SiteConfigSchema = z.object({
  title: z.string(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  theme: z.string().default('default'),
  footer: z.string().optional(),
  nav: z
    .array(
      z.object({
        label: z.string(),
        href: z.string(),
      }),
    )
    .default([]),
  autoNav: z.boolean().default(true),
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;

let cached: SiteConfig | null = null;

export function loadSiteConfig(): SiteConfig {
  if (cached) return cached;
  const path = join(process.cwd(), 'content', '_site.yml');
  const raw = readFileSync(path, 'utf8');
  const parsed = yaml.load(raw);
  cached = SiteConfigSchema.parse(parsed);
  return cached;
}
