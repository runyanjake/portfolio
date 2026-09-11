/**
 * The rail spec — what goes in the margin beside a page.
 *
 * Authors set `rail:` in frontmatter, normally once on a section's
 * index.md, and every entry in that folder inherits it (see
 * `inherited()` in src/lib/content.ts). That is the point: the blog's
 * posts all get a table of contents because /blog says so, not because
 * eight post files each remembered to ask.
 *
 * Shorthand and long form both work:
 *
 *     rail: toc
 *     rail: { show: toc, depth: 4, title: Contents }
 *     rail: none                 # opt a subtree back out
 */
import type { MarkdownHeading } from 'astro';

export type RailShow = 'none' | 'toc' | 'progress';

export type RailInput =
  | RailShow
  | {
      show: RailShow;
      title?: string;
      depth?: number;
      minHeadings?: number;
    }
  | undefined;

export interface RailSpec {
  show: RailShow;
  /** Heading above the rail. */
  title: string;
  /** Deepest heading level a table of contents includes. */
  depth: number;
  /** Below this many headings a table of contents is noise, so it hides. */
  minHeadings: number;
}

const TITLES: Record<RailShow, string> = {
  none: '',
  toc: 'On this page',
  progress: 'Progress',
};

/** Fill a frontmatter value out into a complete spec. */
export function resolveRail(input: RailInput): RailSpec {
  const raw = typeof input === 'string' ? { show: input } : (input ?? { show: 'none' as const });
  return {
    show: raw.show,
    title: raw.title ?? TITLES[raw.show],
    depth: raw.depth ?? 3,
    minHeadings: raw.minHeadings ?? 3,
  };
}

/** The headings a table of contents would list, or none if too few. */
export function tocHeadings(headings: MarkdownHeading[], spec: RailSpec): MarkdownHeading[] {
  const within = headings.filter((h) => h.depth >= 2 && h.depth <= spec.depth);
  return within.length >= spec.minHeadings ? within : [];
}

/**
 * Whether the rail would render nothing.
 *
 * Entry.astro asks before emitting the rail at all, so a page whose
 * contents list is too short to be worth showing leaves no empty box in
 * the margin — it just has no rail.
 */
export function railIsEmpty(spec: RailSpec, headings: MarkdownHeading[]): boolean {
  if (spec.show === 'none') return true;
  if (spec.show === 'toc') return tocHeadings(headings, spec).length === 0;
  return false;
}
