# Design

Architecture reference for the portfolio site. The README covers setup and operations; this document covers how the site is put together. For the author-facing creative surface — what a page can control and how far customization can go — see [`AUTHORING.md`](AUTHORING.md).

## Rendering model

Astro 5, `output: 'static'`. Every page is prerendered at build time into `dist/` and served by nginx — there is no server runtime. Markdown in `src/content/` is the source of truth; nothing is fetched at request time.

The site ships no client framework. The only JavaScript delivered to the browser is Astro's View Transitions runtime (`<ClientRouter />`), which powers same-origin navigation, paired with viewport-triggered prefetch for internal links.

## Content collections

Content lives in `src/content/<collection>/` and is declared in `src/content.config.ts`. There are four collections, each with its own Zod schema — unknown frontmatter fields are rejected at build time.

| Collection | Required | Optional |
|---|---|---|
| `blog` | `title`, `date` | `author`, `tags[]`, `excerpt`, `cover`, `coverAlt`, `draft` |
| `projects` | `title` | `date`, `author`, `tags[]`, `excerpt`, `cover`, `coverAlt`, `order`, `draft` |
| `about` | `title` | `excerpt`, `cover`, `coverAlt`, `order`, `draft` |
| `friends` | `title`, `website` | `image`, `excerpt`, `draft` |

Every collection additionally carries the two presentation enums defined once as `presentation` in `src/content.config.ts` — `width` (`article`\|`wide`\|`full`\|`canvas`) and `chrome` (`default`\|`minimal`\|`bare`). Both default to the current behavior, so existing entries are unaffected.

`draft: true` excludes an entry from the build entirely — every `getCollection` call filters on it.

`cover` is a local image reference resolved through Astro's asset pipeline. `friends.image` is a remote URL string instead, because friend avatars are hosted on third-party sites.

### Files and slugs

An entry is either a flat file or a folder with an `index.md` inside it:

```
src/content/blog/flux-1.md                    → /blog/flux-1
src/content/about/pws/index.md                → /about/pws
src/content/about/pws/olomana.jpg             → referenced as ./olomana.jpg
```

Use the folder form when a post has co-located images; use the flat form otherwise. The URL segment is always the filename or folder name — there is no `slug` frontmatter field. A `generateId` helper in `src/content.config.ts` strips the trailing `/index` so a folder entry's id equals its folder name.

Renaming a file changes its URL. Nothing else refers to entry ids, so a rename is otherwise safe.

## Routing

Standard Astro file-based routing under `src/pages/`. Each section owns two routes plus three hand-written pages:

```
src/pages/
  index.astro              /            hand-written
  contact.astro            /contact     hand-written
  404.astro                /404         hand-written
  blog/index.astro         /blog        collection index
  blog/[slug].astro        /blog/*      one page per entry
  … same pair for about/, projects/, friends/
```

An index route calls `getCollection` on its own collection, sorts it, and maps entries into `IndexItem` view-models. A `[slug]` route enumerates the same collection in `getStaticPaths` and renders one page per entry.

Sort order is decided per section on its index page: blog and projects by date descending, about by `order` then title, friends alphabetically.

## Layouts and displays

Three layouts, composed:

- **`BaseLayout`** — the HTML document: head, meta, favicons, theme stylesheet links, header, footer, skip link. Everything renders through it. Takes `chrome` and `width`: `chrome` decides whether the header and footer render, `width` is stamped on `.site-main` as `data-width`. The skip link and `#main-content` landmark are emitted at every chrome level.
- **`PageLayout`** — a single content entry: title, date/author line, tags, cover image, body. Emits a table of contents when the body has three or more `h2`/`h3` headings. Stamps `data-width` and `data-entry` (`<collection>/<id>`) on the article root, which is what lets a stylesheet target one specific entry.
- **`IndexLayout`** — a collection listing: title, optional intro slot, and a display component.

Displays are the interchangeable part of `IndexLayout`. All four take the same prop — `items: IndexItem[]` — and are selected by the `display` prop:

| Display | Shape |
|---|---|
| `list` | Vertical list of title, date, excerpt. Used by blog and projects. |
| `cards` | Card grid with optional image. Used by about and friends. |
| `grid` | Compact thumbnail grid with title beneath. |
| `gallery` | Square photo grid with caption. Expects every item to have an image. |

`IndexItem` (`src/lib/types.ts`) is the boundary that keeps displays collection-agnostic: index pages map their own collection's entries into it, and displays render whatever fields are present rather than reaching into a collection schema. Adding a field to one collection therefore cannot break a display.

## Theming

A theme is a directory under `src/themes/` containing an `index.css` entry point that `@import`s its partials. `BaseLayout` discovers themes with `import.meta.glob` and links the one named in `src/site.config.ts`. Setting `theme` to an array layers them — later entries cascade over earlier ones, which is how you override an accent color without forking the whole theme.

The `default` theme splits into tokens, base typography, chrome, page, collection, per-display, per-MDX-component, and responsive partials. Astro bundles and content-hashes the result.

The class names the framework guarantees it will emit are documented as a comment block at the top of `src/themes/default/index.css`. That comment is the contract between markup and themes: a theme is any set of CSS files targeting those classes, and changing a class name in a component means updating that list.

## MDX components

`.mdx` bodies can use a fixed vocabulary of blocks — `Callout`, `Embed`, `Gallery`, `Figure`, `Columns`, `Column`, `Bleed`, `Aside`, `Steps`. They need no import in the MDX file because every `[slug].astro` passes the whole set:

```astro
import { blocks } from '../../components/mdx';
...
<Content components={blocks} />
```

`src/components/mdx/index.ts` is the single source of truth for that vocabulary. Adding a block is one import plus one entry in the registry; the routes never change. Per-block styling lives in `src/themes/<theme>/mdx/`, and an unstyled block still renders.

Note that `layout` cannot be used as a frontmatter field name: Astro's MDX integration compiles it into an import of a layout component. The presentation field is `width` for exactly this reason.

## Images

Local images referenced by a relative path go through Astro's image pipeline and come out as responsive `srcset` sets in WebP with content-hashed filenames. Absolute paths point at `public/` and are served untouched. Remote URLs are not processed.

`SmartImage` wraps this: it renders `astro:assets`' `<Image>` for local `ImageMetadata` and falls back to a plain `<img>` for remote URL strings, so a build never depends on a third-party host being reachable.

## Build and deploy

The `Dockerfile` is a two-stage build: `node:22-alpine` runs `npm ci && npm run build`, then the static `dist/` is copied into `nginx:alpine`. `nginx.conf` resolves directory-style routes via `try_files`, serves `/404.html` on misses, and caches `/_astro/*` for a year (safe because those filenames are content-hashed).

`Jenkinsfile` drives production deploys on the host: preflight checks → lint and type-check → `docker compose build && up -d` → container health check → Discord notification. There is no separate teardown stage: tearing down before building took the site offline for the whole build, so `up -d` recreates the container only once the new image exists.

The health check probes nginx from inside the container. It deliberately does not request the public URL: that hostname resolves to the deploy host's own public IP, so a request from a container on that host must hairpin through the router, which fails there even when the site is fine externally. A public-URL check produced red builds on successful deploys. The lint stage streams the workspace into a throwaway Node container over `tar`/stdin rather than bind-mounting it, because the Jenkins job name contains spaces and the agent talks to the *host* Docker daemon — a bind mount source would resolve on the host filesystem and not match the Jenkins container's view of the workspace.

## Extending

| To add | Do this |
|---|---|
| A post | Drop a `.md` file (or folder with `index.md`) into the collection directory. |
| A section | Add a collection to `src/content.config.ts`, then an `index.astro` + `[slug].astro` pair under `src/pages/`, then a nav entry in `src/site.config.ts`. |
| A display | Add `src/components/displays/<Name>Display.astro` taking `items: IndexItem[]`, register it in `IndexLayout`'s display map, and add its styles to the theme. |
| A block | Add `src/components/mdx/<Name>.astro`, add it to the `blocks` registry in `src/components/mdx/index.ts`, and add a partial under the theme's `mdx/`. |
| A one-off page look | Co-locate an `.astro` component beside the entry and import it from the `.mdx`. Styles are auto-scoped; see [`AUTHORING.md`](AUTHORING.md) tier 2. |
| A theme | Copy `src/themes/default/`, edit, and point `theme` in `src/site.config.ts` at the new directory name. |
