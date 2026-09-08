# Authoring model

The creative surface available to content authors — what can be controlled, how, and where the limits are. Implemented; see the status table at the end for what each tier cost and what remains open.

## The problem this solves

The creative surface used to be: write markdown, and pick one of four displays on a section index. There was no supported way to widen a page, drop the header, add page-specific CSS, or build a one-off layout.

The pre-migration framework had answers to those — `scripts:`/`styles:` frontmatter, `shell:` chrome control, co-located page assets — and they were deleted along with the bespoke resolution machinery that powered them. This model restores the expressive power **without** rebuilding that machinery, by leaning on capabilities Astro already provides.

## Principles

1. **Enumerate the common, escape-hatch the rare.** Anything done more than twice becomes a named, validated option. Everything else falls through to a full-power hatch.
2. **Invalid input fails the build.** Every option is a Zod enum or a TypeScript type. A typo is a build error, not a silently broken page.
3. **Freedom must not leak.** Page-level customization is structurally incapable of breaking global chrome or another page. Scoping is enforced by the tooling, not by naming conventions.
4. **No bespoke framework.** Every mechanism below is a thin use of something Astro does natively. If a tier needs a resolver, a registry walker, or a custom loader, it is the wrong design.

## The control ladder

Five tiers, ordered by blast radius. Reach for the lowest tier that does the job.

| Tier | Mechanism | Scope | Author writes |
|---|---|---|---|
| 0 | Frontmatter switches | One entry | YAML |
| 1 | Block vocabulary | One entry | MDX components |
| 2 | Co-located component | One entry | `.astro` — HTML + scoped CSS + JS |
| 3 | Entry style hook | One entry | CSS targeting `[data-entry]` |
| 4 | Theme / theme layer | Whole site | CSS |
| 5 | Bespoke route | One URL | `.astro` page |

### Tier 0 — Frontmatter switches

Two enum fields, available on every collection:

```yaml
width:  article | wide | full | canvas   # default: article
chrome: default | minimal | bare         # default: default
```

`width` controls the content measure:

| Value | Effect |
|---|---|
| `article` | Centered at `--content-width` (720px). Prose default. |
| `wide` | Centered at `--wide-width` (1100px). Image-heavy posts. |
| `full` | Content area spans the shell; padding retained. |
| `canvas` | No max-width and no shell padding — edge to edge. Usually paired with `chrome: bare`. |

`chrome` controls the site shell: `default` = header + footer, `minimal` = header only, `bare` = neither.

Both land in the markup as attributes — `data-width` on `.site-main` and on `.page` — and the theme provides the rules. There are no per-layout components; the enum lives in the schema, the behavior lives in CSS.

**Invariant:** the skip link and `<main id="main-content">` are emitted at every chrome level. A page may be bare, but never unnavigable.

> **The field is `width`, not `layout`.** `layout` is reserved by Astro's MDX integration — it is compiled into an *import of a layout component*, so `layout: wide` in an `.mdx` file fails the build with `Rollup failed to resolve import "wide"`. This bit us during implementation. Do not reintroduce the name.

### Tier 1 — Block vocabulary

The formal set of components usable in `.mdx` bodies. This is the primary creative surface and should absorb most requests.

| Block | Props | Purpose |
|---|---|---|
| `Callout` | `type`, `title?` | Admonition. |
| `Embed` | `url`, `title?` | YouTube/Vimeo → privacy-preserving player. |
| `Gallery` | `images[]` | Image grid. |
| `Figure` | `src`, `alt`, `caption?`, `bleed?` | Image with caption; optionally breaks the measure. |
| `Columns` | `count?` (2\|3) | Multi-column split. Contains `Column`s. |
| `Column` | — | One cell inside `Columns`. |
| `Bleed` | `width?` (wide\|full) | Break any content out of the measure. |
| `Aside` | `side?` (left\|right) | Margin note; floats beside the prose at ≥1180px. |
| `Steps` | — | Wraps a markdown ordered list as a numbered procedure. |

**The registry is the source of truth.** `src/components/mdx/index.ts` exports one `blocks` object, and all four `[slug].astro` routes render `<Content components={blocks} />`. Adding a block is one import plus one entry — routes never change. (Previously each route hand-listed its own three components, so the four lists could silently drift apart.)

Each block ships a CSS partial under `src/themes/<theme>/mdx/` and its class names are in the theme contract. A theme that doesn't style a new block still renders it — unstyled but functional.

### Tier 2 — Co-located component

The escape hatch for a single page that needs to look like nothing else on the site. Put an `.astro` component next to the entry and import it:

```
src/content/blog/my-post/
  index.mdx
  Diagram.astro
```

```mdx
---
title: My post
date: 2026-09-08
width: wide
---

import Diagram from './Diagram.astro';

Prose as usual.

<Diagram dataset="q3" />
```

`Diagram.astro` may contain arbitrary HTML, a `<style>` block, and a `<script>`. Verified behavior:

- **Styles are auto-scoped.** Astro stamps `data-astro-cid-*` on the component's elements and rewrites its CSS to match. Page CSS *cannot* leak into site chrome or another entry — scoping is structural, not conventional.
- **Scripts are bundled.** The `<script>` is processed by Vite, emitted to `/_astro/*.js`, and loaded only on pages that include the component.
- **It is type-checked.** `astro check` covers `.astro` files anywhere in the tree, including under `src/content/`.
- The collection loader globs `**/*.{md,mdx}`, so a co-located `.astro` file is never mistaken for an entry.

This is strictly better than the `scripts:`/`styles:` frontmatter it replaces: automatic scoping, per-page dead-code elimination, full type-checking, and zero framework code — it is an import.

`import './extra.css'` from MDX also works and is bundled, but that CSS is **global**. Prefer the component form; reach for a bare CSS import only when the styling must deliberately escape scoping, and then scope it by hand with Tier 3.

### Tier 3 — Entry style hook

For tweaking one page without introducing a component. Every content page carries its entry id:

```html
<article class="page" data-width="wide" data-entry="blog/my-post">
```

So theme CSS or an imported stylesheet can target exactly one entry:

```css
[data-entry="blog/my-post"] .page__title { letter-spacing: -0.04em; }
```

The attribute is part of the documented theme contract, so it is a stable API rather than an accident of markup.

### Tier 4 — Theme and theme layers

Site-wide look. A theme is a directory under `src/themes/` with an `index.css` entry point; `theme` in `src/site.config.ts` selects it, and an array layers them — later entries cascade over earlier.

The **public token API** — the custom properties a theme layer may override — is documented at the top of `src/themes/default/index.css` alongside the class-name contract. Everything else in `tokens.css` is internal. A "theme fragment" is a directory containing only a `tokens.css` that redefines public tokens:

```ts
theme: ['default', 'winter']   // winter overrides --color-accent only
```

### Tier 5 — Bespoke route

`src/pages/whatever.astro` — total control, no collection involved. The right answer for pages that are not really content: a landing page, an interactive toy, a redirect stub. Already how `/`, `/contact`, and `/404` work.

## Trust model

All content is first-party and in-repo, and the site builds to static files at deploy time. There is no untrusted author: **the distribution model is forking, not multi-tenancy.** A fork gets the whole repo and can already change anything, so Tier 2's arbitrary HTML/JS grants no privilege a forker doesn't have.

Tier 2 is therefore a *maintainability* boundary, not a security one, and none of the tiers need sandboxing. The only scenario that would change this is accepting content into *this* repo from people who should not be able to run code in the build — e.g. friends submitting their own entries by PR. That is not the current model; if it ever becomes it, the rule is `.md` plus Tier 1 for outside contributors, with `.mdx`, co-located components, and imports restricted to repo owners.

## Gotchas

- **`layout:` is reserved in MDX frontmatter.** Use `width:`. See the Tier 0 note above.
- **Underscore prefixes do not hide files.** The glob loader has no special handling for `_`-prefixed names — a file named `_draft.md` publishes at `/blog/_draft`. Use `draft: true`, which every schema supports and every `getCollection` call filters on.
- **Renaming an entry changes its URL.** Ids derive from filenames and nothing else references them.
- **`.md` and `.mdx` coexist.** Only `.mdx` can use blocks or imports. Existing content stays `.md`; there is no reason to convert the archive. Rename a file to `.mdx` when it needs more.
- **`data-width` means the page measure; `data-bleed` means a block escaping it.** `Bleed` emits `data-bleed` (matching `Figure`) precisely so `data-width` has exactly one meaning.

## Status

| Phase | Change | State |
|---|---|---|
| 1 | `src/components/mdx/index.ts` registry; four routes wired to it | Done |
| 2 | `width` + `chrome` schema enums; `data-width`/`data-entry`; theme rules | Done |
| 3 | Tier 2 documented and verified end to end | Done |
| 4 | Block vocabulary expanded to nine | Done |
| 5 | Public token API split out in the theme contract | Done |

Also removed en route: orphaned `.page--with-sidebar` / `.page__sidebar` / `.display-sidebar` CSS left behind when `SidebarNav` and `SidebarDisplay` were deleted.

## Open decisions

1. **Centralize section config?** The four `index.astro` files are near-identical — collection, sort, display, intro copy. A `src/sections.config.ts` would formalize "what a section can look like" and collapse them, at the cost of adding indirection the migration just removed. Leaning toward leaving them explicit until a fifth section exists.
2. **Block vocabulary size.** Nine is a starting point. `Steps` and `Aside` are the least proven — if they go unused for a few posts, cut them.
3. **No worked example ships in the repo.** Every block was verified end to end during implementation via a throwaway entry, then removed rather than leave a fake post in the blog. A permanent `draft: true` kitchen-sink entry would document usage for forkers, at the cost of not being build-covered (drafts are filtered before rendering, so it could rot silently). Worth adding if forks become common.
