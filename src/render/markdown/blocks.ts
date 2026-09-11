/**
 * The block vocabulary.
 *
 * Authors write vanilla CommonMark plus one extension: generic
 * directives, the syntax proposed in CommonMark discussion #575 and
 * implemented by `remark-directive`. It is the same shape markdown
 * already uses for images and links — a name, a bracketed body, a brace
 * of attributes — so a directive reads as markdown rather than as HTML
 * smuggled into markdown:
 *
 *     :::callout{type=warn}          container  (block content inside)
 *     ::embed{url=…}                 leaf       (no body)
 *     :abbr[HTML]{title=…}           text       (inline)
 *
 * Every block below is a pure mdast -> mdast transform: it retags a
 * directive node with the element and class names the theme styles, and
 * otherwise leaves the children alone. Because children stay mdast,
 * images inside a block are still ordinary markdown images and are still
 * optimized by astro:assets.
 *
 * This file is the single source of truth for what authors can write.
 * Adding a block is one entry here plus a CSS partial in the theme; no
 * route, layout or component changes.
 */
import type { Element, Properties } from 'hast';
import type { Data, Paragraph, Parent, PhrasingContent, RootContent } from 'mdast';

export type DirectiveKind = 'container' | 'leaf' | 'text';

export interface DirectiveNode extends Parent {
  type: 'containerDirective' | 'leafDirective' | 'textDirective';
  name: string;
  attributes?: Record<string, string | null | undefined> | null;
  children: RootContent[];
  data?: Data & {
    hName?: string;
    hProperties?: Properties;
    hChildren?: Element[];
  };
}

export interface Block {
  /** Which directive forms this block accepts. */
  kinds: DirectiveKind[];
  /** Retag `node` in place. Throwing fails the build with a useful message. */
  render(node: DirectiveNode): void;
}

// -- helpers ---------------------------------------------------------

function tag(
  node: DirectiveNode,
  hName: string,
  className: string[],
  attrs: Record<string, string | undefined> = {},
) {
  const hProperties: Properties = { className };
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) hProperties[key] = value;
  }
  node.data = { ...node.data, hName, hProperties };
}

/** Pick one of `allowed`, falling back to `fallback`. Anything else is a build error. */
function oneOf(
  value: string | null | undefined,
  allowed: readonly string[],
  fallback: string,
  where: string,
): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (!allowed.includes(value)) {
    throw new Error(`${where}: expected one of ${allowed.join(', ')} — got "${value}"`);
  }
  return value;
}

const isImageParagraph = (node: RootContent): node is Paragraph =>
  node.type === 'paragraph' &&
  node.children.length > 0 &&
  node.children.every((child) => child.type === 'image' || (child.type === 'text' && !child.value.trim()));

/** Lift images out of the paragraphs markdown wraps them in. */
function unwrapImages(children: RootContent[]): RootContent[] {
  return children.flatMap((child) =>
    isImageParagraph(child) ? child.children.filter((c) => c.type === 'image') : [child],
  );
}

function textParagraph(className: string, value: string): Paragraph {
  return {
    type: 'paragraph',
    data: { hProperties: { className: [className] } },
    children: [{ type: 'text', value }],
  };
}

// -- the vocabulary --------------------------------------------------

export const blocks: Record<string, Block> = {
  /**
   * :::callout{type=warn title="Heads up"}
   * Body markdown.
   * :::
   */
  callout: {
    kinds: ['container'],
    render(node) {
      const type = oneOf(node.attributes?.type, ['info', 'note', 'warn', 'danger'], 'note', 'callout{type}');
      tag(node, 'aside', ['callout', `callout--${type}`], { 'data-type': type });
      const title = node.attributes?.title;
      if (title) node.children.unshift(textParagraph('callout__title', title));
    },
  },

  /**
   * :::figure{bleed=wide}
   * ![alt](./photo.jpg)
   *
   * The caption.
   * :::
   */
  figure: {
    kinds: ['container'],
    render(node) {
      const bleed = oneOf(node.attributes?.bleed, ['none', 'wide', 'full'], 'none', 'figure{bleed}');
      tag(node, 'figure', ['figure'], { 'data-bleed': bleed });
      const children = unwrapImages(node.children);
      const image = children.find((c) => c.type === 'image');
      const caption = children.filter((c) => c !== image);
      node.children = image ? [image] : [];
      if (caption.length > 0) {
        node.children.push({
          type: 'paragraph',
          data: { hName: 'figcaption', hProperties: { className: ['figure__caption'] } },
          children: caption.flatMap((c) =>
            c.type === 'paragraph' ? c.children : ([c] as unknown as PhrasingContent[]),
          ),
        });
      }
    },
  },

  /**
   * :::gallery{columns=3}
   * ![a](./a.jpg)
   * ![b](./b.jpg)
   * :::
   */
  gallery: {
    kinds: ['container'],
    render(node) {
      const columns = oneOf(node.attributes?.columns, ['2', '3', '4'], '3', 'gallery{columns}');
      tag(node, 'div', ['gallery'], { 'data-columns': columns });
      node.children = unwrapImages(node.children).filter((c) => c.type === 'image');
    },
  },

  /**
   * ::::columns{count=2}
   * :::column
   * Left.
   * :::
   * :::column
   * Right.
   * :::
   * ::::
   */
  columns: {
    kinds: ['container'],
    render(node) {
      const count = oneOf(node.attributes?.count, ['2', '3'], '2', 'columns{count}');
      tag(node, 'div', ['columns'], { 'data-count': count });
    },
  },

  column: {
    kinds: ['container'],
    render(node) {
      tag(node, 'div', ['columns__col']);
    },
  },

  /** :::bleed{width=full} — break content out of the reading measure. */
  bleed: {
    kinds: ['container'],
    render(node) {
      const width = oneOf(node.attributes?.width, ['wide', 'full'], 'wide', 'bleed{width}');
      tag(node, 'div', ['bleed'], { 'data-bleed': width });
    },
  },

  /** :::aside{side=right} — a margin note beside the prose on wide screens. */
  aside: {
    kinds: ['container'],
    render(node) {
      const side = oneOf(node.attributes?.side, ['left', 'right'], 'right', 'aside{side}');
      tag(node, 'aside', ['aside'], { 'data-side': side });
    },
  },

  /** :::steps — wraps an ordered list as a numbered procedure. */
  steps: {
    kinds: ['container'],
    render(node) {
      tag(node, 'div', ['steps']);
    },
  },

  /** ::embed{url=https://youtu.be/…} — a privacy-preserving video player. */
  embed: {
    kinds: ['leaf'],
    render(node) {
      const url = node.attributes?.url ?? textOf(node);
      if (!url) throw new Error('embed: needs a url, e.g. ::embed{url=https://youtu.be/…}');
      const src = embedSrc(url);
      if (!src) throw new Error(`embed: unrecognized video url "${url}" (YouTube and Vimeo are supported)`);
      const title = node.attributes?.title ?? 'Embedded video';
      tag(node, 'div', ['embed']);
      node.data!.hChildren = [
        {
          type: 'element',
          tagName: 'iframe',
          properties: {
            src,
            title,
            loading: 'lazy',
            allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture',
            allowFullscreen: true,
            referrerPolicy: 'strict-origin-when-cross-origin',
            frameBorder: '0',
          },
          children: [],
        },
      ];
    },
  },
};

/**
 * The directive's bracketed label as plain text. Markdown parses that
 * label as inline content, so a bare URL there may already have been
 * autolinked — collect recursively rather than reading `value` off the
 * top-level children.
 */
function textOf(node: { children?: unknown[] }): string {
  if (!node.children) return '';
  return node.children
    .map((child) => {
      const c = child as { value?: unknown; children?: unknown[] };
      if (typeof c.value === 'string') return c.value;
      return c.children ? textOf(c as { children: unknown[] }) : '';
    })
    .join('')
    .trim();
}

/**
 * Map a share URL onto a cookie-light embed origin. youtube-nocookie and
 * Vimeo's `dnt=1` both suppress tracking until the viewer hits play.
 */
function embedSrc(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = parsed.searchParams.get('v') ?? parsed.pathname.replace(/^\/(embed|shorts)\//, '');
    return id && !id.startsWith('/') ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean).pop();
    return id ? `https://player.vimeo.com/video/${id}?dnt=1` : null;
  }
  return null;
}
