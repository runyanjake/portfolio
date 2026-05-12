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
| `display`    | `list` \| `cards` \| `grid` \| `gallery` \| `sidebar`            | How an index renders its children                                         |
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
| `image`      | image or URL                                                     | Thumbnail used by `cards`/`grid`/`gallery` displays                       |
| `website`    | URL                                                              | Free-form (e.g., on a `friends` card)                                     |
| `navLabel`   | string                                                           | Override of `title` in the auto-generated top nav                         |
| `navOrder`   | number                                                           | Sort key in the auto-generated top nav                                    |

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
theme: default                 # name of the file in public/themes/
footer: "© 2026 Jake Runyan"
autoNav: true                  # auto-build top nav from top-level pages
nav:                           # if non-empty, overrides autoNav
  - { label: Home,  href: / }
  - { label: Blog,  href: /blog }
```

---

## Theming

A theme is **one CSS file** in `public/themes/`. Drop a new file in, set `theme: <name>` in `_site.yml`, and you're done.

Themes are vanilla CSS. The top of `public/themes/default.css` defines the public knob set as CSS custom properties:

```css
:root {
  --color-bg: #fafafa;
  --color-fg: #1a1a1a;
  --color-accent: #b8336a;
  --font-body: "Inter", system-ui, …;
  --content-width: 720px;
  /* …spacing, radii, shadows, transitions */
}
```

To create a new theme, copy `default.css` to `<your-name>.css`, edit the values, and update `_site.yml`. Component selectors below the `:root` block also live in the file — adjust them only when you need structural changes (component layout, padding patterns) rather than color/spacing changes.

Dark mode is handled via `@media (prefers-color-scheme: dark)` overrides on the same custom properties.

---

## MDX components

Use `.mdx` files instead of `.md` to embed components in your content. The framework ships these:

```mdx
---
title: My post
---

import Callout from '../../src/components/mdx/Callout.astro';
import Embed from '../../src/components/mdx/Embed.astro';
import Gallery from '../../src/components/mdx/Gallery.astro';
import photo1 from './photos/1.jpg';
import photo2 from './photos/2.jpg';

<Callout type="warn" title="Heads up">Ship date is firm.</Callout>

<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />

<Gallery images={[
  { src: photo1, alt: "Sunrise" },
  { src: photo2, alt: "Sunset" },
]} />
```

| Component  | Props                                                                  |
|------------|------------------------------------------------------------------------|
| `Callout`  | `type: info\|warn\|note\|danger`, `title?`                             |
| `Embed`    | `url` (YouTube/Vimeo auto-detected; otherwise embedded as-is), `title?` |
| `Gallery`  | `images: { src, alt? }[]` — `src` should be a local image import      |

To add your own component, create it in `src/components/mdx/` and import it in any `.mdx` file.

---

## Project layout

```
content/                       — markdown source of truth
  _site.yml                    — site-level config
  index.md                     — home page
  <section>/_index.md          — section landing (set type: index for collector)
  <section>/<folder>/index.md  — post (folder name is arbitrary; slug from frontmatter)
  <section>/<folder>/hero.jpg  — referenced via ./hero.jpg in frontmatter or body
public/                  — static assets served from /
  themes/<name>.css      — theme files
  favicon*.png, …        — icons
src/
  pages/[...slug].astro  — single dynamic route resolving the entire tree
  pages/404.astro        — 404 page
  layouts/               — BaseLayout, PageLayout, IndexLayout
  components/displays/   — list, cards, grid, gallery, sidebar
  components/mdx/        — Callout, Embed, Gallery
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
- **Aggressive caching** for `/_astro/*` (1 year, immutable) and `/themes/*` (1 hour) via nginx.
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
