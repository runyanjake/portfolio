/**
 * The markdown rendering pipeline.
 *
 * Astro's markdown config points here and nowhere else, so everything
 * about how a markdown body becomes HTML lives under src/render/ and a
 * route never has to know that directives exist:
 *
 *     import { markdownPlugins, blockCheck } from './src/render/markdown';
 *     integrations: [mdx(), blockCheck()],
 *     markdown: { remarkPlugins: markdownPlugins },
 */
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import type { AstroIntegration } from 'astro';
import type { Root } from 'mdast';
import type { VFile } from 'vfile';
import { blocks, type DirectiveKind, type DirectiveNode } from './blocks';
import { MERMAID_LANG, rehypeMermaid } from './mermaid';

const KIND: Record<string, DirectiveKind> = {
  containerDirective: 'container',
  leafDirective: 'leaf',
  textDirective: 'text',
};

/** The colon prefix each directive form is written with. */
const SYNTAX: Record<DirectiveKind, string> = {
  container: ':::',
  leaf: '::',
  text: ':',
};

/**
 * Every block error seen this build.
 *
 * Throwing from a remark plugin is not enough on its own: the content
 * loader catches render errors, logs them, and carries on, so a typo'd
 * `:::note` would otherwise ship a page with an empty body and a build
 * that exited 0. We throw anyway — it puts the error in front of you in
 * dev, at the right file — and record it here so blockCheck() can fail
 * the build at the end.
 */
const failures: string[] = [];

/**
 * Dispatch every directive node to its block, and reject any directive
 * that is not in the vocabulary. Silently passing unknown directives
 * through would let a stray colon in prose mangle a page; `:::note` (a
 * block that does not exist) should say so at build time, not render an
 * empty div.
 */
function remarkBlocks() {
  return (tree: Root, file: VFile) => {
    const where = file.path ?? 'markdown';

    const fail = (message: string): never => {
      const full = `${where}: ${message}`;
      if (!failures.includes(full)) failures.push(full);
      throw new Error(full);
    };

    visit(tree, (node) => {
      const kind = KIND[node.type];
      if (!kind) return;

      const directive = node as unknown as DirectiveNode;
      const block = blocks[directive.name];
      const named = `${SYNTAX[kind]}${directive.name}`;

      if (!block) {
        fail(`${named} is not a block. Available: ${Object.keys(blocks).sort().join(', ')}.`);
        return;
      }
      if (!block.kinds.includes(kind)) {
        const forms = block.kinds.map((k) => `${SYNTAX[k]}${directive.name}`).join(' or ');
        fail(`${named} is written as ${SYNTAX[kind]}; use ${forms}.`);
        return;
      }

      try {
        block.render(directive);
      } catch (error) {
        fail((error as Error).message);
      }
    });
  };
}

/**
 * Passed straight to `markdown.remarkPlugins` in astro.config.mjs.
 * Order matters: remarkDirective has to parse the `:::` syntax before
 * remarkBlocks can dispatch it.
 */
export const markdownPlugins = [remarkDirective, remarkBlocks];

/**
 * Passed to `markdown.rehypePlugins`. These run on the finished HTML
 * tree, after Astro's own Shiki pass.
 */
export const markdownRehypePlugins = [rehypeMermaid];

/**
 * Passed to `markdown.syntaxHighlight`.
 *
 * A ```mermaid fence is a picture, not a listing, so highlighting it is
 * work thrown away — and rehypeMermaid wants the fence's text intact
 * rather than split across a few hundred coloured spans. Astro's
 * `excludeLangs` is the supported way to say so.
 */
export const syntaxHighlight = { type: 'shiki' as const, excludeLangs: [MERMAID_LANG] };

/**
 * Turns a bad block into a failed build.
 *
 * Without this the site would still deploy, just with a hole in it where
 * the page body should be — the worst possible outcome, because nothing
 * reports it. Belongs in `integrations` in astro.config.mjs.
 */
export function blockCheck(): AstroIntegration {
  return {
    name: 'render:block-check',
    hooks: {
      // Not build:start — the content loader renders during the sync
      // that runs *before* it, so resetting there would throw the
      // failures away before anything could read them. A build is a
      // fresh process, so there is nothing to reset.
      'astro:build:done': () => {
        if (failures.length === 0) return;
        throw new Error(
          `${failures.length} markdown block error(s); the pages they are on would have built empty:\n` +
            failures.map((f) => `  - ${f}`).join('\n'),
        );
      },
    },
  };
}

export { blocks } from './blocks';
export { hasMermaid } from './mermaid';
