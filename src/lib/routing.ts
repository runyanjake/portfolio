import type { CollectionEntry } from 'astro:content';

export type PageEntry = CollectionEntry<'pages'>;

/**
 * A "folder default" lives at its containing folder's URL. By
 * convention this is `index.md` or `_index.md` at any depth.
 * Folder defaults still render as regular pages unless they also
 * declare `type: index` in frontmatter.
 *
 * Recommended usage:
 *   - `_index.md` for section landings (often `type: index`)
 *   - `<folder>/index.md` for individual posts that need co-located assets
 */
export function isFolderDefault(entry: PageEntry): boolean {
  const id = entry.id;
  return (
    id === 'index' ||
    id === '_index' ||
    id.endsWith('/index') ||
    id.endsWith('/_index')
  );
}

/**
 * An entry is an "index" (collector that renders its children) only
 * when frontmatter explicitly declares `type: index`. Filename alone
 * never implies index semantics.
 */
export function isIndex(entry: PageEntry): boolean {
  return entry.data.type === 'index';
}

export function entryFolder(entry: PageEntry): string {
  if (isFolderDefault(entry)) {
    return entry.id.replace(/\/?(_index|^index|\/index)$/, '').replace(/\/?_index$/, '');
  }
  const parts = entry.id.split('/');
  return parts.slice(0, -1).join('/');
}

export function entryFilename(entry: PageEntry): string {
  return entry.id.split('/').pop() ?? '';
}

export function deriveSlug(entry: PageEntry): string {
  if (entry.data.slug) return entry.data.slug;
  return entryFilename(entry);
}

/**
 * Build a map from entry id → public URL path.
 *
 * Folder and file names are treated literally as URL segments. To
 * decouple a URL from its on-disk name, declare `slug:` in frontmatter:
 *   - on `<folder>/index.md` or `<folder>/_index.md`: remaps that
 *     folder's URL segment (applies to the folder default itself and
 *     to every descendant)
 *   - on any other page: overrides that single page's slug
 */
export function buildUrlMap(entries: PageEntry[]): Map<string, string> {
  const folderSlugOverride = new Map<string, string>();
  for (const entry of entries) {
    if (isFolderDefault(entry)) {
      const folder = entryFolder(entry);
      if (folder && entry.data.slug) {
        folderSlugOverride.set(folder, entry.data.slug);
      }
    }
  }

  const urlMap = new Map<string, string>();
  for (const entry of entries) {
    urlMap.set(entry.id, computeUrl(entry, folderSlugOverride));
  }
  return urlMap;
}

function computeUrl(
  entry: PageEntry,
  folderSlugOverride: Map<string, string>,
): string {
  const folder = entryFolder(entry);
  const folderParts = folder.split('/').filter(Boolean);
  const mapped: string[] = [];
  for (let i = 0; i < folderParts.length; i++) {
    const partial = folderParts.slice(0, i + 1).join('/');
    const override = folderSlugOverride.get(partial);
    mapped.push(override ?? folderParts[i]);
  }

  if (isFolderDefault(entry)) {
    const path = '/' + mapped.join('/');
    return path === '/' ? '/' : path;
  }

  const slug = deriveSlug(entry);
  return '/' + [...mapped, slug].filter(Boolean).join('/');
}

/**
 * Direct children of an index page: entries whose URL is exactly one
 * segment deeper than the index URL. Excludes the index itself.
 */
export function directChildren(
  indexUrl: string,
  urlMap: Map<string, string>,
  entries: PageEntry[],
): PageEntry[] {
  const prefix = indexUrl === '/' ? '/' : indexUrl + '/';
  const children: PageEntry[] = [];
  for (const entry of entries) {
    const url = urlMap.get(entry.id);
    if (!url || url === indexUrl) continue;
    if (!url.startsWith(prefix)) continue;
    const remainder = url.slice(prefix.length);
    if (remainder.includes('/')) continue;
    if (entry.data.draft || entry.data.hidden) continue;
    children.push(entry);
  }
  return children;
}

/**
 * All descendants of an index page: every entry whose URL is under
 * the index's URL prefix, at any depth. Used by sidebar/recursive layouts.
 */
export function descendants(
  indexUrl: string,
  urlMap: Map<string, string>,
  entries: PageEntry[],
): PageEntry[] {
  const prefix = indexUrl === '/' ? '/' : indexUrl + '/';
  const out: PageEntry[] = [];
  for (const entry of entries) {
    const url = urlMap.get(entry.id);
    if (!url || url === indexUrl) continue;
    if (!url.startsWith(prefix)) continue;
    if (entry.data.draft || entry.data.hidden) continue;
    out.push(entry);
  }
  return out;
}

/**
 * Sort entries according to an index page's `sort` mode. Default for
 * collections with dates is reverse-chronological; otherwise by `order`
 * then title.
 */
export function sortChildren(
  children: PageEntry[],
  mode: PageEntry['data']['sort'],
): PageEntry[] {
  const m = mode ?? defaultSortMode(children);
  const copy = [...children];
  copy.sort((a, b) => {
    switch (m) {
      case 'date-desc':
        return cmpDate(b, a);
      case 'date-asc':
        return cmpDate(a, b);
      case 'order-asc':
        return cmpOrder(a, b);
      case 'title':
        return a.data.title.localeCompare(b.data.title);
    }
  });
  return copy;
}

function defaultSortMode(children: PageEntry[]): NonNullable<PageEntry['data']['sort']> {
  if (children.some((c) => c.data.date)) return 'date-desc';
  if (children.some((c) => typeof c.data.order === 'number')) return 'order-asc';
  return 'title';
}

function cmpDate(a: PageEntry, b: PageEntry): number {
  const da = a.data.date?.getTime() ?? 0;
  const db = b.data.date?.getTime() ?? 0;
  return da - db;
}

function cmpOrder(a: PageEntry, b: PageEntry): number {
  const oa = a.data.order ?? Number.POSITIVE_INFINITY;
  const ob = b.data.order ?? Number.POSITIVE_INFINITY;
  if (oa !== ob) return oa - ob;
  return a.data.title.localeCompare(b.data.title);
}

/**
 * Walk up the URL hierarchy to find the nearest ancestor index page that
 * declares `display: sidebar`. Returns the index entry plus its URL, or
 * `undefined` if no such ancestor exists.
 */
export function findSidebarRoot(
  url: string,
  urlMap: Map<string, string>,
  entries: PageEntry[],
): { entry: PageEntry; url: string } | undefined {
  const indexByUrl = new Map<string, PageEntry>();
  for (const e of entries) {
    if (isIndex(e)) {
      const u = urlMap.get(e.id);
      if (u) indexByUrl.set(u, e);
    }
  }
  const segs = url.split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i--) {
    const ancestorUrl = i === 0 ? '/' : '/' + segs.slice(0, i).join('/');
    const candidate = indexByUrl.get(ancestorUrl);
    if (candidate && candidate.data.display === 'sidebar') {
      return { entry: candidate, url: ancestorUrl };
    }
  }
  return undefined;
}

/**
 * Format a `[...slug]` param value from a URL path. `undefined` for
 * the homepage; `'blog/foo'` for `/blog/foo`.
 */
export function urlToSlugParam(url: string): string | undefined {
  if (url === '/') return undefined;
  return url.replace(/^\/+/, '');
}
