/**
 * Mermaid diagrams, written the way GitHub writes them.
 *
 *     ```mermaid
 *     flowchart LR
 *       A[Write markdown] --> B{Needs a picture?}
 *       B -- yes --> C[Draw it in the fence]
 *       B -- no --> D[Keep writing]
 *     ```
 *
 * A fenced block, not a directive. The blocks in `blocks.ts` extend
 * markdown where markdown has nothing to say; this one does not need to,
 * because markdown already has a way to write "here is some source in
 * language X", and GitHub, GitLab and every markdown editor worth using
 * already agree that `mermaid` is that language. A diagram should render
 * in the repo, in a preview pane and on the site without being
 * rewritten, so the site speaks the syntax that already exists.
 *
 * What happens here is only the retag: the fence becomes
 *
 *     <pre class="mermaid" data-mermaid>…source…</pre>
 *
 * which is inert HTML. Turning it into an SVG is the browser's job — see
 * `Mermaid.astro`. Mermaid lays diagrams out by measuring rendered text,
 * so there is no honest way to do it at build time short of running a
 * headless browser during `npm run build`, which is a far worse trade
 * than one lazily imported chunk on the pages that draw something.
 *
 * ## Why this is a rehype plugin and not a remark one
 *
 * The obvious version — retag the mdast `code` node with `data.hName` —
 * does not work. `mdast-util-to-hast` applies `hName` to the `<code>` it
 * builds and *then* wraps that in a `<pre>` of its own, so the result is
 * a `<pre>` inside a `<pre>`. There is no way to reach the outer element
 * from the node. Working on hast instead means replacing the finished
 * `<pre>` outright, which is exactly the element we want.
 *
 * It also has to run after Shiki, which is a rehype plugin — hence the
 * matching `excludeLangs` entry in astro.config.mjs. Without it Shiki
 * would shred the source into a few hundred coloured spans first, and we
 * would be reassembling text nobody ever reads as text.
 */
import { visit } from 'unist-util-visit';
import type { Element, Parent, Root, RootContent } from 'hast';

/** The fence language that means "this is a diagram". */
export const MERMAID_LANG = 'mermaid';

/**
 * Whether an entry's body contains a diagram.
 *
 * Entry.astro asks before including the client-side renderer, so a page
 * that draws nothing ships no diagram code. Reading the raw body rather
 * than the rendered HTML keeps the question a pure function of the file,
 * instead of something the pipeline has to report back out of a render
 * the content loader caches.
 */
export function hasMermaid(body: string | undefined): boolean {
  if (!body) return false;
  return new RegExp(String.raw`^[ \t]*(?:\x60{3,}|~{3,})[ \t]*${MERMAID_LANG}\b`, 'im').test(body);
}

/** Every class on a hast element, however the property happens to be shaped. */
function classesOf(node: Element): string[] {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(/\s+/);
  return [];
}

/** A subtree's text, which for an un-highlighted fence is the source verbatim. */
function textOf(node: RootContent | Element): string {
  if (node.type === 'text') return node.value;
  if ('children' in node) return node.children.map(textOf).join('');
  return '';
}

/** Replace every ```mermaid fence with the element Mermaid.astro looks for. */
export function rehypeMermaid() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index: number | undefined, parent: Parent | undefined) => {
      if (node.tagName !== 'pre' || !parent || index === undefined) return;

      const code = node.children.find((child): child is Element => child.type === 'element');
      if (!code || code.tagName !== 'code') return;
      if (!classesOf(code).includes(`language-${MERMAID_LANG}`)) return;

      parent.children[index] = {
        type: 'element',
        tagName: 'pre',
        properties: { className: ['mermaid'], 'data-mermaid': '' },
        children: [{ type: 'text', value: textOf(code) }],
      };
    });
  };
}
