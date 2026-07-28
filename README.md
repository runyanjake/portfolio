# portfolio

A content-driven website framework. Drop markdown files into `content/`, structure the site with folders and frontmatter, and the framework renders the rest.

Built on [Astro](https://astro.build) (static output) with vanilla CSS theming. No client framework by default — pages ship near-zero JavaScript.

---

## Authoring

Everything in `content/` is a page. The folder layout drives URLs; frontmatter drives behavior.

### File conventions

Posts are folder-per-post — each post is its own folder containing `index.md` plus any co-located image assets. Section landings use `_index.md` at the section root.

| File                              | Purpose                                                | Default URL        |
|-----------------------------------|--------------------------------------------------------|--------------------|
| `content/index.md`                | The home page                                          | `/`                |
| `content/foo.md`                  | A simple top-level page (no assets)                    | `/foo`             |
| `content/foo/_index.md`           | Section landing (set `type: index` for a collector)    | `/foo`             |
| `content/foo/<anything>/index.md` | A post (assets co-located in the folder)               | `/foo/<anything>`  |

`index.md` and `_index.md` are both recognized as folder defaults at any depth. The convention used in this repo:

- `_index.md` for section landings (e.g. `content/blog/_index.md`)
- `<post-folder>/index.md` for individual posts so they can carry their own images

**Folder names are organizational only.** Folders can be named anything — pick whatever helps you browse on disk (`2026-04-01-foo/`, `draft-foo/`, `foo-original/`, etc.). The URL segment is determined entirely by frontmatter — see `slug:` below. If you don't set `slug:`, the folder name is used as the URL segment literally.

A folder default is treated as a **collector** (renders its children below the body) only if its frontmatter declares `type: index`.

### Frontmatter reference

All fields are optional except `title`. Unknown fields are rejected by the schema (see `src/content.config.ts`).

| Field        | Type                                                             | Notes                                                                     |
|--------------|------------------------------------------------------------------|---------------------------------------------------------------------------|
| `title`      | string                                                           | Required                                                                  |
| `slug`       | string                                                           | URL segment for this page. On a folder default (`index.md`/`_index.md`) it remaps the entire folder's segment. Recommended on every post so the URL is decoupled from the on-disk folder name. |
| `type`       | `page` \| `index`                                                | `index` switches to IndexLayout (renders children)                        |
| `display`    | string                                                           | Name of a display component; any file in `src/components/displays/` is a candidate. Built-in: `list`, `cards`, `grid`, `gallery`, `sidebar`. Unknown values fall back to `list`. |
| `sort`       | `date-desc` \| `date-asc` \| `order-asc` \| `title`              | Auto: `date-desc` if children have dates, else `order-asc`, else `title`  |
| `recursive`  | boolean                                                          | If true, an index includes all descendants instead of direct children     |
| `pageSize`   | integer                                                          | Pagination cap for an index (not yet enforced — placeholder)              |
| `draft`      | boolean                                                          | Excludes from build entirely                                              |
| `hidden`     | boolean                                                          | Routed but excluded from index listings and auto-nav                      |
| `order`      | number                                                           | Sort key when `sort: order-asc`                                           |
| `date`       | date (YYYY-MM-DD)                                                | Used for sorting and shown as the post date                               |
| `author`     | string                                                           | Shown in page header alongside the date                                   |
| `tags`       | string[]                                                         | Shown as chips in the page header                                         |
| `excerpt`    | string                                                           | Used as meta description and in card/list summaries                       |
| `cover`      | image or URL                                                     | Hero image at the top of a content page                                   |
| `coverAlt`   | string                                                           | Alt text for `cover`. Omit for decorative covers (renders as `alt=""`)    |
| `image`      | image or URL                                                     | Thumbnail used by `cards`/`grid`/`gallery` displays                       |
| `website`    | URL                                                              | Free-form (e.g., on a `friends` card)                                     |
| `navLabel`   | string                                                           | Override of `title` in the auto-generated top nav                         |
| `navOrder`   | number                                                           | Sort key in the auto-generated top nav                                    |
| `scripts`    | string[]                                                         | Names of scripts to load on this page (see [Customizing](#customizing))   |
| `styles`     | string[]                                                         | Names of stylesheets to load on this page (see [Customizing](#customizing)) |
| `shell`      | `default` \| `minimal` \| `bare`                                 | Site chrome: `default` = header + footer, `minimal` = header only, `bare` = neither |

For `cover` / `image`: a relative path resolves to a local image processed by Astro (responsive `srcset`, AVIF/WebP). A URL string renders as a plain `<img>` (no optimization).

### Images

Co-locate images with the post. Drop them into the post's folder and reference them with a relative path:

```
content/blog/2026-04-01-foo/
  index.md
  hero.jpg
  diagram.png
```

In frontmatter:

```yaml
cover: ./hero.jpg          # processed by Astro's image pipeline
image: ./hero.jpg          # used as the card thumbnail
```

In the body:

```markdown
![Architecture diagram](./diagram.png)
```

Local relative paths (`./foo.png`, `../shared/bar.png`) get responsive `srcset`, AVIF/WebP variants, and content-hashed filenames. Absolute paths (`/foo.png`) point to `public/` and serve as-is. Full URLs (`https://...`) render as plain `<img>` with no optimization.

### Display modes

Set on an index page (`type: index`) via `display:`.

- **`list`** — vertical list of titles + dates + excerpts. Default for blogs.
- **`cards`** — responsive card grid with optional cover image. Default for friends/about.
- **`grid`** — square thumbnail grid with title underneath.
- **`gallery`** — square photo grid with hover caption. Best when items have an `image`.
- **`sidebar`** — left-side nav of children + body content. Applies to all descendants too.

### Custom slugs

Every post should declare its `slug` in frontmatter so URLs are decoupled from the on-disk folder name:

```yaml
# content/blog/whatever-you-named-it/index.md
title: My Post
slug: my-cool-post    # URL → /blog/my-cool-post
date: 2026-04-01
```

A `slug` on a folder default (`_index.md`/`index.md`) remaps the folder's segment for everything beneath it:

```yaml
# content/blog/_index.md
slug: writings        # /blog/* now lives under /writings/*
```

Slug overrides cascade: descendants of a remapped folder inherit the new segment.

### Site config

`content/_site.yml` controls site-wide chrome.

```yaml
title: jake                    # brand and document <title>
tagline: Personal site
description: …                  # default meta description
theme: default                 # name of a directory under src/themes/
                               # (or a list; see Customizing → Themes)
footer: "© 2026 Jake Runyan"
autoNav: true                  # auto-build top nav from top-level pages
nav:                           # if non-empty, overrides autoNav
  - { label: Home,  href: / }
  - { label: Blog,  href: /blog }
scripts: []                    # site-wide scripts (see Customizing)
styles:  []                    # site-wide extra stylesheets
```

---

## MDX components

Use `.mdx` instead of `.md` to embed components in body content. Any component in `src/components/mdx/` is available by its filename — **no imports needed**. Ships with:

```mdx
---
title: My post
---

<Callout type="warn" title="Heads up">Ship date is firm.</Callout>

<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />

<Gallery images={[
  { src: '/photos/1.jpg', alt: "Sunrise" },
  { src: '/photos/2.jpg', alt: "Sunset" },
]} />
```

| Component  | Props                                                                   |
|------------|-------------------------------------------------------------------------|
| `Callout`  | `type: info\|warn\|note\|danger`, `title?`                              |
| `Embed`    | `url` (YouTube/Vimeo auto-detected; otherwise embedded as-is), `title?` |
| `Gallery`  | `images: { src, alt? }[]` — `src` should be a local image import        |

See [Customizing → Custom MDX components](#custom-mdx-components) to add your own.

---

## Customizing

The framework has five drop-in surfaces. Add a file in the right folder, reference it by name — no other code changes needed.

### Themes

A theme is a **directory** under `src/themes/`. Its `index.css` is the entry point; use `@import` to pull in partials. Themes are bundled by Astro (hashed, dead-code-eliminated, one bundle per active theme).

```
src/themes/default/
  index.css          @imports the rest
  tokens.css         :root custom properties, dark-mode overrides
  base.css           html/body/typography
  chrome.css         .site-header, .site-footer, skip-link
  page.css           .page and children
  collection.css     .index and children
  sidebar-nav.css
  displays/          per-display styles
  mdx/               per-mdx-component styles
  responsive.css     @media (max-width: 720px) overrides
```

The class-name **contract** — every class the framework guarantees it will emit — is documented as a comment header at the top of `src/themes/default/index.css`. A theme is any set of CSS files that target those classes.

**Fork a theme.** Copy the directory, edit, reference the new name:

```yaml
# content/_site.yml
theme: brutalist
```

**Layer themes.** A later theme in the list cascades over earlier ones — useful for accent overrides without duplicating the base:

```yaml
# src/themes/holiday/index.css just overrides --color-accent
theme: [default, holiday]
```

### Custom displays

Any `src/components/displays/<Name>Display.astro` is registered as `display: <name>` (filename stem, lowercased, minus the `Display` suffix). No layout edits.

```astro
---
// src/components/displays/TimelineDisplay.astro
import type { IndexItem } from '../../layouts/IndexLayout.astro';
interface Props { items: IndexItem[] }
const { items } = Astro.props;
---
<ol class="display-timeline">
  {items.map((it) => (
    <li><time>{it.data.date?.toISOString().slice(0,10)}</time> — <a href={it.url}>{it.data.title}</a></li>
  ))}
</ol>
```

```yaml
# content/writings/_index.md
title: Writings
type: index
display: timeline
```

Component props always receive `items` (the sorted, filtered children) and `currentUrl` (the index page's URL).

### Custom MDX components

Any `src/components/mdx/<Name>.astro` is auto-injected as `<Name />` in every `.mdx` file — no per-file imports.

```astro
---
// src/components/mdx/Spoiler.astro
interface Props { summary?: string }
const { summary = 'Reveal' } = Astro.props;
---
<details class="spoiler"><summary>{summary}</summary><slot /></details>
```

```mdx
<Spoiler summary="Ending">...it was earth all along.</Spoiler>
```

### Custom scripts and styles

Drop into `src/scripts/<name>.{js,ts}` or `src/styles/<name>.css`. Reference by bare name from `_site.yml` (site-wide) or page frontmatter (per-page):

```yaml
# content/_site.yml — every page loads these
scripts: [analytics, theme-toggle]
styles:  [prose-overrides]
```

```yaml
# content/blog/foo/index.md — only this page loads it
scripts: [copy-buttons]
```

Scripts are emitted as `<script type="module">` so ES imports and top-level `await` work. Styles cascade *after* the active theme(s), so page styles win.

### Co-located page assets

Same fields, but prefix with `./` to reference a file **next to the markdown**:

```
content/blog/interactive-demo/
  index.md
  demo.js         ← lives with the post
  demo.css
```

```yaml
# content/blog/interactive-demo/index.md
title: Interactive demo
scripts: [./demo]      # resolves to content/blog/interactive-demo/demo.js
styles:  [./demo]      # ./demo.css
```

Only works from per-page frontmatter (not `_site.yml`, which has no page context). Bare names still hit `src/scripts/` and `src/styles/`.

### Shell (chrome) control

`shell:` in frontmatter opts individual pages out of the standard header/footer:

```yaml
# a landing/marketing page
shell: bare        # no header, no footer — full-viewport canvas
```

- `default` — header + footer (default)
- `minimal` — header only
- `bare` — neither

---

## Project layout

```
content/                       — markdown source of truth
  _site.yml                    — site-level config
  index.md                     — home page
  <section>/_index.md          — section landing (set type: index for collector)
  <section>/<folder>/index.md  — post (folder name is arbitrary; slug from frontmatter)
  <section>/<folder>/hero.jpg  — referenced via ./hero.jpg in frontmatter or body
  <section>/<folder>/demo.js   — co-located page script; frontmatter scripts: [./demo]
public/                  — static assets served from /
  favicon*.png, …        — icons
src/
  pages/[...slug].astro  — single dynamic route resolving the entire tree
  pages/404.astro        — 404 page
  layouts/               — BaseLayout (chrome, drop-in loader), PageLayout, IndexLayout
  components/displays/   — drop-in: list, cards, grid, gallery, sidebar (add your own)
  components/mdx/        — drop-in: Callout, Embed, Gallery (add your own)
  themes/<name>/         — drop-in themes (index.css entry + partials)
  scripts/<name>.{js,ts} — drop-in JS bundled by Astro
  styles/<name>.css      — drop-in CSS bundled by Astro
  lib/routing.ts         — folder/slug → URL resolution, child sorting
  lib/site.ts            — _site.yml loader
  content.config.ts      — frontmatter Zod schema
astro.config.mjs         — static output, MDX, prefetch, view transitions
Dockerfile               — node build → nginx:alpine static serve (prod)
nginx.conf               — try_files for directory-style routes
docker-compose.prod.yml  — production: nginx behind Traefik
docker-compose.dev.yml   — dev: Astro dev server with HMR, source mounted
```

---

## Performance notes

- **Static-only output** (`output: 'static'`). No SSR runtime; nginx serves prebuilt files.
- **Zero client framework** by default. The only client JS is Astro's ~13 kB View Transitions runtime for instant navigation.
- **Local images** go through Astro's `<Image>` (responsive `srcset`, AVIF/WebP, content-hashed filenames). External URL images fall back to plain `<img>`.
- **Aggressive caching** for `/_astro/*` (1 year, immutable) via nginx — themes, scripts, and styles all land there with content-hashed filenames.
- **Prefetch** on viewport for all internal links; clicking feels instant.

---

## Runbook

Production:

Bash:
```sh
docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d --build
```

Development:

Windows:
```sh
docker compose -f docker-compose.dev.yml down ; docker compose -f docker-compose.dev.yml up --build
```
