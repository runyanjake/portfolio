/**
 * The rendered page — one data type for every entry on the site.
 *
 * A blog post, a project, a section index and the home page are all the
 * same thing: an entry's markdown, rendered, plus the header fields,
 * plus an optional sidebar, plus (for a folder that lists its contents)
 * the listing. `buildPage()` resolves all of that from the entry once,
 * and Entry.astro does nothing but lay the result out. Nothing about how
 * a page is assembled is decided in markup.
 */
import type { MarkdownHeading } from 'astro';
import { render } from 'astro:content';
import { allEntries, childrenOf, sortEntries, urlOf, type Entry } from '../lib/content';
import type { Chrome, Width } from './Document.astro';
import type { Style } from './Listing.astro';
import { hasMermaid } from './markdown';
import type { Item } from './types';

/** Deepest heading level the `headers` sidebar lists (h2 through this). */
const HEADER_DEPTH = 3;

/**
 * Below this many headings the `headers` sidebar is dropped — on a short
 * page a list of its sections is a second title, not navigation.
 */
const MIN_HEADERS = 3;

/**
 * What the sidebar shows, fully resolved. `none` covers both "the author
 * asked for nothing" and "the author asked for headers but there are too
 * few to be worth listing", so the renderer never has to tell the two
 * apart and never leaves an empty box behind.
 */
export type Sidebar =
  | { kind: 'none' }
  | { kind: 'headers'; title: string; headings: MarkdownHeading[] }
  | { kind: 'progress'; title: string };

export interface Page {
  id: string;
  title: string;
  /** Also the page's meta description. */
  excerpt?: string;
  date?: Date;
  author?: string;
  tags: string[];
  image?: ImageMetadata | string;
  imageAlt?: string;
  link?: string;

  style: Style;
  width: Width;
  chrome: Chrome;

  /** The rendered markdown body. */
  Content: Awaited<ReturnType<typeof render>>['Content'];
  sidebar: Sidebar;
  /** The folder's children, for any `style` other than `page`. */
  listing?: Item[];
  /** Whether the body has a mermaid fence, so the page needs the renderer. */
  mermaid: boolean;
  /** Whether the body has an image, so the page needs the lightbox. */
  lightbox: boolean;
}

/**
 * A markdown image (`![alt](src)`) or a raw <img>. Asked of the raw body
 * so a text-only post ships no lightbox code; a false positive (the
 * syntax inside a code block) only costs a few unused bytes.
 */
const hasImages = (body: string | undefined): boolean =>
  body !== undefined && /!\[[^\]]*\]\(|<img\b/i.test(body);

function resolveSidebar(entry: Entry, headings: MarkdownHeading[]): Sidebar {
  // A listing page gets no sidebar: progress through a list of links
  // means nothing, and the page's substance is the listing.
  if (entry.data.style !== 'page') return { kind: 'none' };

  switch (entry.data.sidebar) {
    case 'headers': {
      const listed = headings.filter((h) => h.depth >= 2 && h.depth <= HEADER_DEPTH);
      return listed.length >= MIN_HEADERS
        ? { kind: 'headers', title: 'On this page', headings: listed }
        : { kind: 'none' };
    }
    case 'progress':
      return { kind: 'progress', title: 'Progress' };
    default:
      return { kind: 'none' };
  }
}

function listingOf(entry: Entry, entries: Entry[]): Item[] {
  return sortEntries(childrenOf(entries, entry.id), entry.data.sort).map((child) => ({
    // `link:` sends the card off-site; without it, to the child's page.
    url: child.data.link ?? urlOf(child.id),
    external: child.data.link !== undefined,
    title: child.data.title,
    excerpt: child.data.excerpt,
    date: child.data.date,
    image: child.data.image,
    imageAlt: child.data.imageAlt,
    cover: child.data.cover,
  }));
}

export async function buildPage(entry: Entry): Promise<Page> {
  const { Content, headings } = await render(entry);
  const { data } = entry;

  return {
    id: entry.id,
    title: data.title,
    excerpt: data.excerpt,
    date: data.date,
    author: data.author,
    tags: data.tags,
    image: data.image,
    imageAlt: data.imageAlt,
    link: data.link,

    style: data.style,
    width: data.width,
    chrome: data.chrome,

    Content,
    sidebar: resolveSidebar(entry, headings),
    // `style: page` never lists, so a folder can hold entries without
    // advertising them.
    listing: data.style === 'page' ? undefined : listingOf(entry, await allEntries()),
    // Diagrams are drawn in the browser and mermaid is large, so the
    // renderer is included per page. Asked of the raw body: a page that
    // draws nothing ships no diagram code.
    mermaid: hasMermaid(entry.body),
    lightbox: hasImages(entry.body),
  };
}
