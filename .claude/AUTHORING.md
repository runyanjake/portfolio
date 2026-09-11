# Authoring model

The creative surface available to content authors — what can be controlled, how, and where the limits are. For how the site is built, see [`DESIGN.md`](DESIGN.md).

## Principles

1. **Content is markdown, and markdown is the API.** Anything an author writes should read as markdown, not as HTML or JSX smuggled into it. When markdown has no way to say a thing, extend it with markdown's own grammar rather than escaping out of it.
2. **Enumerate the common, escape-hatch the rare.** Anything done more than twice becomes a named, validated option. Everything else falls through to a full-power hatch.
3. **Invalid input fails the build.** Every option is a Zod enum or a typed value. A typo is a build error, not a silently broken page.
4. **Freedom must not leak.** Page-level customization is structurally incapable of breaking global chrome or another page. Scoping is enforced by the tooling, not by naming conventions.
5. **No bespoke framework.** Every mechanism below is a thin use of something Astro or remark does natively.

## The content tree

Every page is a folder with an `index.md`:

```
content/
  index.md                  the home page
  blog/
    index.md                the section — says what /blog is and how to list it
    flux-1/
      index.md              a post
      diagram.png           its image, referenced as ./diagram.png
```

A folder's path is its URL. Adding a section is `mkdir`; adding a post is `mkdir`. There is nothing to register anywhere.

Each folder's `index.md` describes what the folder is. Its prose is the page's introduction, and its frontmatter says how its contents should be shown.

## The control ladder

Five tiers, ordered by blast radius. Reach for the lowest tier that does the job.

| Tier | Mechanism | Scope | Author writes |
|---|---|---|---|
| 0 | Frontmatter | One entry | YAML |
| 1 | Block vocabulary | One entry | Markdown directives |
| 2 | Co-located component | One entry | `.astro` — HTML + scoped CSS + JS |
| 3 | Entry style hook | One entry | CSS targeting `[data-entry]` |
| 4 | Theme / theme layer | Whole site | CSS |
| 5 | Bespoke route | One URL | `.astro` page |

### Tier 0 — Frontmatter

One schema, every entry. `title` is the only required field.

```yaml
title: Flux.1                 # required
excerpt: One-line blurb.      # listing blurb + meta description
date: 2024-08-16
author: Jake Runyan
tags: [ai, image-gen]
image: ./hero.jpg             # relative path, or an absolute URL
imageAlt: A generated image
link: https://example.com     # sends this entry's listing card off-site
order: 2                      # position under `sort: order`
draft: true                   # excluded from the build entirely
nav: 3                        # put it in the site nav; or {order: 3, label: "…"}
style: list                   # what this page renders as
sort: newest                  # order of the children it lists
rail: toc                     # what goes in the margin (inherited)
width: article                # the measure
chrome: default               # the site shell
```

#### `style` — what the page is

Every value renders the entry's own prose. The non-`page` values then append a listing of the folder's direct children.

| Value | The page is |
|---|---|
| `page` | Prose only. A folder can hold entries without advertising them. |
| `list` | Prose, then children as title + date + excerpt rows. Dated things: a blog, a project log. |
| `cards` | Prose, then children as cards with a blurb and an optional picture. Undated things: sections, people, links out. |
| `grid` | Prose, then children as thumbnails with titles beneath. |
| `gallery` | Prose, then children as square photos with hover captions. |

**`cards` covers both the picture kind and the picture-less kind.** `content/about/` and `content/friends/` use the same style; the friends just have an `image:` each. The thumbnail is a fixed square at the start of the card rather than a banner across the top, so cards with and without one sit in the same grid without the row going ragged.

**`link:` sends a card off-site.** A friend's card points at their site. The entry still has its own page, which shows the link — so `content/friends/tyler-k/index.md` can carry as much or as little prose as you like without changing where the card goes.

#### `sort` — the order children appear in

`newest` (default) · `oldest` · `order` (by the `order:` field, unset last) · `title`

Entries with no `date` sort last under `newest`/`oldest` rather than pretending to be from 1970.

#### `rail` — what goes in the margin

The one inherited field. Set it on a section's index.md and every entry
in the folder gets it, which is the point: the blog's posts all carry a
table of contents because `content/blog/index.md` says so, not because
eight post files each remembered to ask.

```yaml
rail: toc                                  # a table of contents
rail: progress                             # how far through the reader is
rail: none                                 # nothing (the default)
rail: { show: toc, depth: 4, title: Contents, minHeadings: 2 }
```

| Value | Shows |
|---|---|
| `none` | Nothing. The default. |
| `toc` | Links to the page's own `h2`–`h<depth>` headings. |
| `progress` | A bar and a percentage tracking how far through the body the reader is. |

| Option | Default | Effect |
|---|---|---|
| `show` | `none` | Which of the above. |
| `title` | `On this page` / `Progress` | The label above it. |
| `depth` | `3` | Deepest heading level a contents list includes (2–4). |
| `minHeadings` | `3` | Below this many headings the contents list hides — on a short page it is a second title, not navigation. |

Resolution is nearest-wins: an entry's own `rail:` beats its section's,
which beats `content/index.md`'s. `rail: none` is how a subtree opts back
out of something an ancestor turned on.

**Listing pages get no rail.** Progress through a list of links means
nothing, and a listing page's substance is the listing rather than its
intro prose. So `rail:` on `content/blog/index.md` describes the posts,
not `/blog` itself.

On a wide screen the rail sits in the left gutter, aligned with the brand
in the header, and sticks as the reader scrolls. Narrower than
`--shell-width` there is no gutter to sit in, so it folds into a card
above the content. Same markup either way.

#### `width` — the measure

Every page defaults to the reading column, home page and section indexes included. Set this only to escape it.

| Value | Effect |
|---|---|
| `article` | Centered at `--content-width` (720px). The default. |
| `wide` | Centered at `--wide-width` (1100px). Image-heavy posts, big grids. |
| `full` | Content spans the shell; padding retained. |
| `canvas` | No max-width and no shell padding — edge to edge. Usually paired with `chrome: bare`. |

> **The field is `width`, not `layout`.** `layout` is reserved by Astro's MDX integration — it compiles into an *import of a layout component*, so `layout: wide` in an `.mdx` file fails the build with `Rollup failed to resolve import "wide"`. This bit us during implementation. Do not reintroduce the name.

#### `chrome` — the site shell

`default` = header + footer · `minimal` = header only · `bare` = neither.

**Invariant:** the skip link and `<main id="main-content">` are emitted at every chrome level. A page may be bare, but never unnavigable.

#### `nav` — the site navigation

There is no nav config. An entry with a `nav:` field is in the nav; one without is not.

```yaml
nav: 3                              # order 3, labelled with the title
nav: {order: 3, label: Writing}     # order 3, labelled "Writing"
```

`content/index.md` deliberately has no `nav:`. The brand in the header is
the link home, so a "Home" item would be a second control for the same
destination.

### Tier 1 — Block vocabulary

Bodies are vanilla CommonMark plus one extension: **generic directives**, the syntax proposed in CommonMark discussion #575 and implemented by `remark-directive`. It is markdown's own grammar — a name, a bracketed body, a brace of attributes, the same shape as an image or a link — in three forms:

```md
:::callout{type=warn}       container — takes block content
::embed{url=…}              leaf — no body
:abbr[HTML]{title=…}        text — inline
```

Blocks work in plain `.md`. Nothing has to become `.mdx` to use them.

| Block | Form | Attributes |
|---|---|---|
| `callout` | container | `type` (`info`\|`note`\|`warn`\|`danger`), `title` |
| `figure` | container | `bleed` (`none`\|`wide`\|`full`) |
| `gallery` | container | `columns` (`2`\|`3`\|`4`) |
| `columns` / `column` | container | `count` (`2`\|`3`) on `columns` |
| `bleed` | container | `width` (`wide`\|`full`) |
| `aside` | container | `side` (`left`\|`right`) |
| `steps` | container | — |
| `embed` | leaf | `url`, `title` |

```md
:::callout{type=warn title="Heads up"}
Ordinary markdown in here, including [links](/).
:::

:::figure{bleed=wide}
![A photo](./photo.jpg)

The caption.
:::

:::gallery{columns=3}
![a](./a.jpg)
![b](./b.jpg)
![c](./c.jpg)
:::

::::columns{count=2}
:::column
Left.
:::
:::column
Right.
:::
::::

::embed{url=https://youtu.be/dQw4w9WgXcQ}
```

Note the four colons on the outer `columns`: a container directive nests inside another only if the outer one is written with more colons.

**Children stay markdown.** Each block is a pure mdast → mdast retag: it swaps in the element and class names the theme styles and leaves the children alone. An image inside a `gallery` is still an ordinary markdown image, so it still goes through `astro:assets` and still comes out as a responsive WebP `srcset`.

**`src/render/markdown/blocks.ts` is the source of truth.** Adding a block is one entry there plus a CSS partial under the theme's `blocks/`. A theme that does not style a new block still renders it — unstyled but functional.

**Typos fail the build.** `:::note` reports the file and lists every block that does exist; writing a container block as `::callout` says so and names the right form. Both exit non-zero — see the `blockCheck()` section of [`DESIGN.md`](DESIGN.md) for why that takes two mechanisms rather than one.

### Tier 2 — Co-located component

The escape hatch for a single page that needs to look like nothing else on the site. Put an `.astro` component next to the entry and import it from an `.mdx`:

```
content/blog/my-post/
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
- **It is type-checked.** `astro check` covers `.astro` files anywhere in the tree, including under `content/`.
- The collection loader globs `**/*.{md,mdx}`, so a co-located `.astro` file is never mistaken for an entry.

`import './extra.css'` from MDX also works and is bundled, but that CSS is **global**. Prefer the component form; reach for a bare CSS import only when the styling must deliberately escape scoping, and then scope it by hand with Tier 3.

### Tier 3 — Entry style hook

For tweaking one page without introducing a component. Every page carries its entry id:

```html
<article class="page" data-width="wide" data-style="page" data-entry="blog/my-post">
```

So theme CSS or an imported stylesheet can target exactly one page:

```css
[data-entry="blog/my-post"] .page__title { letter-spacing: -0.04em; }
```

`data-entry` is part of the documented theme contract, so it is a stable API rather than an accident of markup. `data-style` is there too, which is how the theme dims the intro prose above a listing without the renderer needing a separate class for it.

#### There is no `theme` frontmatter field

Light and dark are the visitor's choice, not the author's. The scheme is
resolved once on `<html>` as `[data-theme]` before first paint, and every
color in the theme is a custom property that changes with it — so an
entry cannot pin itself to one scheme, and nothing an author writes needs
to know which scheme it is being read in.

The corollary matters for Tier 2: a co-located component must use the
color tokens rather than literal colors, or it will be the one thing on
the page that does not follow the switch.

### Tier 4 — Theme and theme layers

Site-wide look. A theme is a directory under `src/themes/` with an `index.css` entry point; `theme` in `src/site.config.ts` selects it, and an array layers them — later entries cascade over earlier.

The **public token API** — the custom properties a theme layer may override — is documented at the top of `src/themes/default/index.css` alongside the class-name contract. Everything else in `tokens.css` is internal. A "theme fragment" is a directory containing only a `tokens.css` that redefines public tokens:

```ts
theme: ['default', 'winter']   // winter overrides --color-accent only
```

### Tier 5 — Bespoke route

`src/pages/whatever.astro` — total control, no collection involved. The right answer for pages that are not really content: an interactive toy, a redirect stub. `/404` is the only one that currently exists, and it still renders through `<Document>` so it carries the same chrome as everything else.

Note that this tier got *smaller* with the content-tree migration. The home page and `/contact` used to be bespoke routes; both are now ordinary entries, which is why the home page can be edited without opening `src/`.

## Trust model

All content is first-party and in-repo, and the site builds to static files at deploy time. There is no untrusted author: **the distribution model is forking, not multi-tenancy.** A fork gets the whole repo and can already change anything, so Tier 2's arbitrary HTML/JS grants no privilege a forker doesn't have.

Tier 2 is therefore a *maintainability* boundary, not a security one, and none of the tiers need sandboxing. The only scenario that would change this is accepting content into *this* repo from people who should not be able to run code in the build — e.g. friends submitting their own entries by PR. That is not the current model; if it ever becomes it, the rule is `.md` plus Tier 1 for outside contributors, with `.mdx`, co-located components, and imports restricted to repo owners.

## Gotchas

- **`layout:` is reserved in MDX frontmatter.** Use `width:`. See Tier 0.
- **`rail:` is the only inherited field.** Everything else applies to the entry it is written on.
- **A contents list can vanish.** Fewer than `minHeadings` headings and the rail is omitted, by design. Lower `minHeadings` if a short page really wants one.
- **Underscore prefixes do not hide files.** The glob loader has no special handling for `_`-prefixed names — `content/blog/_draft/index.md` publishes at `/blog/_draft`. Use `draft: true`.
- **Renaming a folder changes its URL.** Ids derive from paths and nothing else references them.
- **A nested container directive needs more colons than its parent.** `::::columns` around `:::column`.
- **`.md` and `.mdx` coexist.** Blocks work in both; only `.mdx` can import a component. Existing content stays `.md`, and there is no reason to convert the archive — rename a file to `.mdx` when it needs Tier 2.
- **`data-width` means the page measure; `data-bleed` means a block escaping it.** The `bleed` block emits `data-bleed` (matching `figure`) precisely so `data-width` has exactly one meaning.
- **`node_modules/.astro` caches rendered entries.** If a content change seems not to take, that is where it is. `rm -rf dist .astro node_modules/.astro`.

## Open decisions

1. **Style names.** `list` and `cards` are named for their shape, not for the sections that happen to use them ("blog style", "posts style"), on the theory that a name describing form survives a section being renamed or a second section adopting it. If the shape names turn out not to carry their meaning in practice, the enum in `src/content.config.ts` and the map in `src/render/Listing.astro` are the two places to change.
2. **Block vocabulary size.** Eight is a starting point. `steps` and `aside` are the least proven — if they go unused for a few posts, cut them.
3. **Orphan entry pages.** An entry with `link:` still builds its own page, which nothing links to. Harmless and keeps the tree uniform, but if friends-style entries become common it may be worth a `listing-only` treatment that skips the page.
4. **No worked example ships in the repo.** Every block was verified end to end during implementation via a throwaway entry, then removed rather than leave a fake post in the blog. A permanent `draft: true` kitchen-sink entry would document usage for forkers, at the cost of not being build-covered (drafts are filtered before rendering, so it could rot silently). Worth adding if forks become common.
