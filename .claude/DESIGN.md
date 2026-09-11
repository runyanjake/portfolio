# Design

Architecture reference for the portfolio site. The README covers setup and operations; this document covers how the site is put together. For the author-facing creative surface — what a page can control and how far customization can go — see [`AUTHORING.md`](AUTHORING.md).

## The shape of the thing

Three ideas do most of the work:

1. **The content tree is the site.** `content/` at the project root holds every page. A folder's path is its URL, its `index.md` is the page, and the folders inside it are its children.
2. **Every page is one component.** `src/render/Entry.astro` renders the home page, a section index and a blog post alike. They differ in frontmatter, not in code.
3. **Rendering lives in one place.** Everything about how content *looks* is under `src/render/`. Everything about what content *is* is under `src/lib/`. Routes know neither.

## Where content lives

```
content/
  index.md                  → /
  blog/
    index.md                → /blog          (lists its children)
    flux-1/
      index.md              → /blog/flux-1
      diagram.png           → ./diagram.png
  about/
    index.md                → /about
    pws/
      index.md              → /about/pws
      olomana.jpg
```

Content sits at the project root rather than under `src/`, and that is deliberate. Astro reserves exactly one directory — `src/pages/` — and the Content Layer `glob()` loader introduced in Astro 5 takes any `base` path, so `src/content/` is special only to the legacy collections API this site does not use. Putting content beside `src/` rather than inside it draws the line where it actually falls: `content/` is what an author edits, `src/` is what they don't.

The relative-image question resolves in favor of the move too. Images referenced as `./photo.jpg` from a markdown body outside `src/` still go through Astro's asset pipeline and come out as content-hashed WebP with a responsive `srcset` — verified in the build, not assumed.

**Every entry is a folder with an `index.md`.** Flat `my-post.md` files still load, but the folder form is the convention: an entry that can keep its assets beside it never has to reach into a shared images directory, and a post that later grows a diagram does not have to be moved first.

### One collection, not four

`src/content.config.ts` declares a single collection, `content`, with a single schema. Sections are folders, so adding one is `mkdir` — there is no collection to declare, no pair of routes to write, no nav array to update.

| Field | Type | Purpose |
|---|---|---|
| `title` | string | **Required.** The only required field. |
| `excerpt` | string | Blurb in listings; `<meta name="description">` on the page. |
| `date`, `author`, `tags[]` | | Bibliographic. Rendered when present. |
| `image`, `imageAlt` | path or URL | The entry's one picture: its cover, and its thumbnail in a parent's listing. |
| `link` | URL | Points the entry's listing card off-site. |
| `order` | number | Position under `sort: order`. |
| `draft` | boolean | Excluded from the build entirely. |
| `nav` | number or `{order, label}` | Put this entry in the site nav. |
| `style` | enum | What the page renders as. See below. |
| `sort` | enum | Order of the children a listing shows. |
| `rail` | enum or object | What goes in the margin. Inherited by descendants. |
| `width`, `chrome` | enum | Presentation switches. See [`AUTHORING.md`](AUTHORING.md). |

`image` is a union: a relative path resolves through `image()` and the asset pipeline, an absolute URL is emitted as-is. That is what lets one `cards` display serve both a folder of essays and a folder of friends whose avatars are hosted elsewhere.

### Ids and URLs

An entry's id is its path with `/index.md` stripped, so `content/blog/flux-1/index.md` has the id `blog/flux-1` — which is also its URL. The root `content/index.md` has no folder to be named after, so it keeps the id `index`, and `urlOf()` maps that one id to `/`.

Renaming a folder changes its URL. Nothing else refers to ids, so a rename is otherwise safe.

## The two halves

### `src/lib/content.ts` — what exists

The content tree as data: which entries there are, how they nest, what order they go in, what URL each lives at. `parentOf`/`childrenOf` derive the hierarchy from ids; `sortEntries` applies one of four comparators; `siteNav` collects every entry carrying a `nav:` field.

Nothing here knows what a page looks like.

### `src/render/` — how it looks

| File | Job |
|---|---|
| `Entry.astro` | The front door. Takes an entry, renders the whole page. |
| `Document.astro` | `<html>`, `<head>`, chrome, the `#main-content` landmark. |
| `Header.astro`, `Footer.astro` | Site chrome. The header's nav comes from the content tree. |
| `Listing.astro` | A folder's children, in the shape `style:` asks for. |
| `Rail.astro`, `rail/*` | The margin column: a contents list, or reading progress. |
| `ThemeToggle.astro` | The light/dark button. Markup only — see below. |
| `displays/*.astro` | The four shapes. Each takes `items: Item[]` and nothing else. |
| `Image.astro` | Local `ImageMetadata` → `<Image>`; remote URL → plain `<img>`. |
| `markdown/` | The remark pipeline and the block vocabulary. |
| `types.ts` | `Item`, the view-model displays render. |
| `index.ts` | The public surface. Routes import from here and nowhere deeper. |

`Item` is the boundary that keeps displays independent of the schema. `Entry.astro` maps child entries into `Item`s; a display renders whichever fields are present. Adding a frontmatter field cannot break a display, and swapping a display cannot require touching content.

## Routing

Two files under `src/pages/`:

```
src/pages/
  [...slug].astro    every content page, including /
  404.astro          the one page with no entry behind it
```

`[...slug].astro` enumerates the collection in `getStaticPaths`, maps each id to its URL, and hands the entry to `<Entry />`. It is nine lines and has no knowledge of sections, styles or layouts. Adding a section adds routes automatically, because the content tree *is* the route table.

## Page styles

`style:` in an entry's frontmatter decides what the page renders as. Every value renders the entry's own prose; the non-`page` values then append a listing of the folder's direct children.

| `style` | Renders |
|---|---|
| `page` | Prose only. A folder can hold entries without advertising them. |
| `list` | Prose, then children as title + date + excerpt rows. |
| `cards` | Prose, then children as cards with a blurb and an optional picture. |
| `grid` | Prose, then children as thumbnails with titles beneath. |
| `gallery` | Prose, then children as square photos with hover captions. |

There is one `cards`, not one for sections and another for people. A card's picture is optional, so a folder of essays and a folder of friends' sites are the same display — some cards just happen to have a face on them. `link:` on a child sends its card off-site rather than to its own page.

Because a listing page renders through `Entry.astro` like any other page, `/blog` and a blog post carry the same reading column, the same title treatment and the same chrome. Consistency is structural rather than something two layouts have to agree on.

## The reading column, and why the header lines up

Every page defaults to `width: article` — the `--content-width` measure, centered. That includes the home page and every section index, which is the point: the column is the site's basic shape, not a blog-post special case.

`width:` escapes it per entry — `wide` (`--wide-width`), `full` (the shell's width), `canvas` (edge to edge, no padding). The value lands in the markup as `data-width` on both `.site-main` and `.page`, and the theme provides the rules. There are no per-width layout components.

The desktop layout rests on one equation, in `tokens.css`:

```
--shell-width = --content-width + 2 x (--rail-width + --rail-gap) + 2 x --space-6
      1280px  =       720       + 2 x (    200      +     56    ) + 2 x   24
```

Header, main and footer all span `--shell-width`; the reading column is centered inside it. Because the equation balances exactly, the gutter left beside the centered column is *precisely* one rail wide — so the rail's left edge lands on the same pixel as the brand above it, and the brand sits as far from the column as the controls sit on the other side.

That is the fix for the header looking off-balance. It was not that the content was off-center — it was centered all along. The problem was a 1100px header band around a 720px column, which put the brand ~190px out from the text with nothing aligned to it and nothing in the space. Giving the gutter a job and sizing the shell to fit it exactly is what makes the arrangement read as deliberate.

Media queries cannot read custom properties, so the literal `1280px` appears in `page.css` and `rail/toc.css` as well. Those three numbers move together; the token comment says so.

## The rail

`rail:` puts a table of contents or a reading-progress indicator in the margin. It is the only **inherited** field: `inherited()` in `src/lib/content.ts` walks from an entry up through its ancestors and returns the nearest value, so `rail: toc` on `content/blog/index.md` reaches every post in the folder. Nearest wins, and `rail: none` opts a subtree back out.

At `--shell-width` and above the rail is absolutely positioned into the gutter with a sticky inner element. The sticky is on the *inner* element, not the rail: the rail spans the article's full height, which gives the sticky child room to travel and stops it at the end of the page instead of trailing over the footer.

Below that width there is no gutter, so the rail stays in normal flow as a card above the content. Same markup, one media query — there is no second component and no JS measuring anything.

A listing page gets no rail: progress through a list of links is meaningless, and the page's substance is the listing. `railIsEmpty()` also suppresses a contents list below `minHeadings`, so a short page leaves no empty box in the margin rather than an empty box.

`Progress.astro` is the only component on the site that ships JavaScript. It measures against `.page__body` rather than the document, because counting the header, title block and footer makes a post read as most-of-the-way-done before the prose starts. Its listeners are re-registered on `astro:page-load` and dropped through an `AbortController` — ClientRouter replaces the body on every navigation, so without that the handlers would accumulate for the length of a browsing session.

## Color scheme

Dark is the default. The scheme is one attribute on `<html>` — `data-theme="dark"` or `"light"` — and every color in the theme is a custom property keyed off it, so no component knows which scheme it is in and none can be left behind by a switch.

Astro has no built-in mechanism for this and there is no library worth the dependency; what follows is the standard static-site pattern, and all of it lives in one inline script in `Document.astro`:

- **It is `is:inline`, and has to be.** A bundled script is deferred, which paints the default scheme and then corrects it — the flash the script exists to prevent. That is also why it is written out as source rather than imported.
- **It resolves, rather than deferring to CSS.** It reads the stored choice, falls back to `prefers-color-scheme`, and writes an explicit attribute. Because the attribute is always set, each palette is defined exactly once in `tokens.css` — there is no `@media (prefers-color-scheme: light)` block duplicating the light palette. With JavaScript off, nothing sets the attribute and the bare `:root` palette stands, which is dark: the no-JS fallback is the site's stated default rather than an accident.
- **It re-applies on `astro:after-swap`.** ClientRouter replaces `<html>`'s attributes with the incoming document's, and the incoming document has no `data-theme`. Without this listener, exactly one navigation reverts the scheme. Verified end to end: toggle, two client-side navigations, a full reload.
- **The click is delegated from `document`.** So `ThemeToggle.astro` carries no script of its own and needs nothing rebound when the header is replaced on navigation.
- **Which icon shows is decided in CSS**, off the same attribute, so the correct one is painted on the first frame instead of corrected afterwards.

The status hues callouts use (`--color-info`, `--color-warn`, `--color-danger`) are tokens rather than literals for the same reason: they need different values to hold their contrast on a dark surface.

## Markdown and blocks

Bodies are vanilla CommonMark plus exactly one extension: **generic directives**, the syntax from CommonMark discussion #575, implemented by `remark-directive`.

```md
:::callout{type=warn title="Heads up"}      container — block content inside
::embed{url=https://youtu.be/…}             leaf — no body
:abbr[HTML]{title=…}                        text — inline
```

The shape is markdown's own: a name, a bracketed body, a brace of attributes — the same grammar as an image or a link. This replaced a set of MDX components (`<Callout>`, `<Figure>`, …) for three reasons:

- **Blocks work in plain `.md`.** They no longer require converting a file to `.mdx`.
- **Children stay markdown.** A directive is a pure mdast → mdast retag, so an image inside a gallery is still an ordinary markdown image and is still optimized by `astro:assets`. A component would have taken a prop.
- **Authors write markdown, not JSX in markdown.**

`src/render/markdown/blocks.ts` is the single source of truth for the vocabulary. Adding a block is one entry there plus a CSS partial in the theme — no route, layout or component changes.

### Invalid blocks fail the build

`:::note` — a block that does not exist — is a build error naming the file and listing what is available. So is writing a container block with leaf syntax.

This needs two mechanisms, not one. The remark plugin throws, which surfaces the error in dev at the right file. But **the content loader catches render errors, logs them, and carries on**: on its own, a typo'd directive ships a page with an empty `<body>` and a build that exits 0 — the worst outcome, because nothing reports it. So the plugin also records each failure, and the `blockCheck()` integration in `astro.config.mjs` throws at `astro:build:done` if any were recorded.

Two things about that integration are load-bearing and easy to undo by accident:

- **It must not reset its list at `astro:build:start`.** Content rendering happens during the sync that runs *before* that hook, so resetting there throws the failures away before anything reads them. A build is a fresh process; there is nothing to reset.
- **`node_modules/.astro` is the content cache.** A cached entry is not re-rendered, so its blocks are not re-validated. Editing a file invalidates its entry, so a newly introduced typo is always caught; the Docker build is always cold, so the deploy path always validates everything.

## Images

Local images referenced by a relative path go through Astro's image pipeline and come out as responsive `srcset` sets in WebP with content-hashed filenames — from `content/`, outside `src/`, same as before. Absolute paths point at `public/` and are served untouched. Remote URLs are not processed.

`src/render/Image.astro` wraps this: `<Image>` for local `ImageMetadata`, a plain `<img>` for a remote URL string, so a build never depends on a third-party host being reachable.

## Theming

A theme is a directory under `src/themes/` containing an `index.css` entry point that `@import`s its partials. `Document.astro` discovers themes with `import.meta.glob` and links the one named in `src/site.config.ts`. Setting `theme` to an array layers them — later entries cascade over earlier ones, which is how you override an accent color without forking the whole theme.

The `default` theme splits into tokens, base typography, chrome, page, listing, per-display, per-block, and responsive partials.

Two contracts are documented as a comment block at the top of `src/themes/default/index.css`: the **public token API** (the custom properties a theme layer may override) and the **CSS contract** (the class names and attributes `src/render/` guarantees it will emit). Changing a class name in a render component means updating that list.

## Build and deploy

The `Dockerfile` is a two-stage build: `node:22-alpine` runs `npm ci && npm run build`, then the static `dist/` is copied into `nginx:alpine`. `nginx.conf` resolves directory-style routes via `try_files`, serves `/404.html` on misses, and caches `/_astro/*` for a year (safe because those filenames are content-hashed).

`.dockerignore` excludes `*.md` to keep root-level docs out of the image. In `.dockerignore`, `*` does not match `/`, so that pattern covers `./README.md` and not `content/**/*.md`. Widening it to `**/*.md` would strip the entire site from the build context, and Astro would build an empty site and exit 0.

`Jenkinsfile` drives production deploys on the host: preflight checks → lint and type-check → `docker compose build && up -d` → container health check → Discord notification. There is no separate teardown stage: tearing down before building took the site offline for the whole build, so `up -d` recreates the container only once the new image exists.

The health check probes nginx from inside the container. It deliberately does not request the public URL: that hostname resolves to the deploy host's own public IP, so a request from a container on that host must hairpin through the router, which fails there even when the site is fine externally. A public-URL check produced red builds on successful deploys. The lint stage streams the workspace into a throwaway Node container over `tar`/stdin rather than bind-mounting it, because the Jenkins job name contains spaces and the agent talks to the *host* Docker daemon — a bind mount source would resolve on the host filesystem and not match the Jenkins container's view of the workspace.

## Extending

| To add | Do this |
|---|---|
| A post | `mkdir content/<section>/<name>` with an `index.md` inside. |
| A section | `mkdir content/<name>` with an `index.md` carrying `style:` and `nav:`. Nothing to register. |
| A nav link | Add `nav:` to that entry's frontmatter. |
| A display | `src/render/displays/<Name>.astro` taking `items: Item[]`, one entry in `Listing.astro`'s map, one value in the `style` enum, one CSS partial. |
| A block | One entry in `src/render/markdown/blocks.ts`, one CSS partial under the theme's `blocks/`. |
| A one-off page look | Co-locate an `.astro` component beside the entry and import it from an `.mdx`. Styles are auto-scoped; see [`AUTHORING.md`](AUTHORING.md) tier 2. |
| A theme | Copy `src/themes/default/`, edit, point `theme` in `src/site.config.ts` at the new directory name. |
