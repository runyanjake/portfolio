/**
 * The content tree.
 *
 * Business logic only: which entries exist, how they nest, what order
 * they go in, and what URL each one lives at. Nothing here knows how a
 * page looks — that is src/render/'s job.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Entry = CollectionEntry<'content'>;
export type Sort = Entry['data']['sort'];

/** Every published entry. Drafts are excluded from the build entirely. */
export async function allEntries(): Promise<Entry[]> {
  return getCollection('content', ({ data }) => !data.draft);
}

/**
 * The id of content/index.md. It is the root of the tree and the only
 * id whose URL is not its own path.
 */
export const HOME = 'index';

export const urlOf = (id: string): string => (id === HOME ? '/' : `/${id}`);

/** The id of the folder this entry sits in, or null for the home page. */
export function parentOf(id: string): string | null {
  if (id === HOME) return null;
  const cut = id.lastIndexOf('/');
  return cut === -1 ? HOME : id.slice(0, cut);
}

/** Direct children only — `blog/flux-1` is a child of `blog`, `blog` is not. */
export const childrenOf = (entries: Entry[], id: string): Entry[] =>
  entries.filter((entry) => parentOf(entry.id) === id);

const byTitle = (a: Entry, b: Entry) => a.data.title.localeCompare(b.data.title);

const byDate = (direction: 1 | -1) => (a: Entry, b: Entry) => {
  // Undated entries sort last in either direction rather than pretending
  // to be from 1970.
  const da = a.data.date?.getTime();
  const db = b.data.date?.getTime();
  if (da === undefined && db === undefined) return byTitle(a, b);
  if (da === undefined) return 1;
  if (db === undefined) return -1;
  return da === db ? byTitle(a, b) : (db - da) * direction;
};

const byOrder = (a: Entry, b: Entry) => {
  const oa = a.data.order ?? Number.POSITIVE_INFINITY;
  const ob = b.data.order ?? Number.POSITIVE_INFINITY;
  return oa === ob ? byTitle(a, b) : oa - ob;
};

const COMPARATORS: Record<Sort, (a: Entry, b: Entry) => number> = {
  newest: byDate(1),
  oldest: byDate(-1),
  order: byOrder,
  title: byTitle,
};

export const sortEntries = (entries: Entry[], sort: Sort): Entry[] =>
  [...entries].sort(COMPARATORS[sort]);

export interface NavLink {
  label: string;
  href: string;
}

/**
 * The site nav, derived from the content tree: any entry carrying a
 * `nav` field, ordered by `nav.order`. Adding a section to the nav is
 * adding the field to its index.md — there is no list to keep in sync.
 */
export async function siteNav(entries?: Entry[]): Promise<NavLink[]> {
  const all = entries ?? (await allEntries());
  return all
    .filter((entry) => entry.data.nav !== undefined)
    .map((entry) => {
      const nav = entry.data.nav!;
      const spec = typeof nav === 'number' ? { order: nav, label: undefined } : nav;
      return {
        label: spec.label ?? entry.data.title,
        href: urlOf(entry.id),
        order: spec.order ?? Number.POSITIVE_INFINITY,
        title: entry.data.title,
      };
    })
    .sort((a, b) => (a.order === b.order ? a.title.localeCompare(b.title) : a.order - b.order))
    .map(({ label, href }) => ({ label, href }));
}
