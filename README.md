# portfolio

Static personal site for [jake.runyan.dev](https://jake.runyan.dev), built with Astro. The `content/` tree at the project root is the whole site: every folder is a page, its `index.md` says what the page is, and the folders inside it are its contents.

## Features

- Content lives at `content/`, outside `src/` — authors never open the source tree.
- The content tree is the route table: a folder's path is its URL, and `content/index.md` is the home page.
- One frontmatter schema, validated at build time; an invalid value fails the build rather than rendering wrong.
- Every page picks its own shape with `style:` — prose, or prose plus a `list`, `cards`, `grid` or `gallery` of its children.
- `rail:` puts a table of contents or a reading-progress indicator in the margin, declared once per section and inherited by its entries.
- Light and dark schemes, dark by default, resolved before first paint; every color is a token, so nothing is left behind by the switch.
- Custom rendering is vanilla markdown plus generic directives (`:::callout`), not HTML or JSX in the prose.
- Mermaid diagrams from a ```` ```mermaid ```` fence, the same syntax GitHub takes; drawn in the browser, only on the pages that have one.
- Swappable CSS themes; a theme is a directory under `src/themes/` and multiple can be layered.
- Local images run through Astro's image pipeline: responsive `srcset`, WebP, content-hashed filenames.
- Static output with no client framework — Astro's View Transitions runtime, a reading-progress rail, and mermaid on the pages that draw something.
- Multi-stage Docker build to `nginx:alpine`, deployed behind Traefik by Jenkins.

Architecture: [`.claude/DESIGN.md`](.claude/DESIGN.md). What a page can control, and how far customization goes: [`.claude/AUTHORING.md`](.claude/AUTHORING.md).

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 22.x | Matches the Docker and CI image (`node:22-alpine`) |
| npm | 10+ | Lockfile is committed — use `npm ci`, not `npm install` |
| Docker Engine | 24+, Compose v2 | Only needed for containerized dev or prod |

```sh
npm ci
```

## Configuration

There is no `.env` — the site is a static build with no runtime configuration. The nav is not configured — it is derived from `nav:` in the content tree. The rest lives in three places:

| File | Controls |
|---|---|
| `src/site.config.ts` | Title, meta description, footer, active theme |
| `astro.config.mjs` | Canonical `site` URL, MDX, prefetch, markdown blocks, syntax highlighting theme |
| `docker-compose.prod.yml` | Container name (`jake-website`), Traefik router host and TLS resolver |

Deploy-time secret, read by `Jenkinsfile` from the Jenkins credential store:

| Credential ID | Purpose |
|---|---|
| `discord-pws-builds-channel-webhook` | Build-status notifications; the pipeline fails preflight if unset |

The Traefik host in `docker-compose.prod.yml` (`jake2.runyan.dev`) is the deploy target; the canonical `site` URL in `astro.config.mjs` (`jake.runyan.dev`) is what gets baked into generated absolute URLs. Change both when cutting over.

## Deployment

Pushes are deployed by the Jenkins pipeline in `Jenkinsfile`: preflight → lint and type-check → build and start → container health check → Discord notification. The image is built from the checked-out commit; there are no versioned release artifacts or published tags.

The health check probes the container from the inside (`docker exec … wget http://127.0.0.1:80/`) rather than requesting the public URL. The site's public address is the deploy host's own public IP, so a request originating on that host has to hairpin through the router — a path that fails there even while the site is reachable from the internet. Verify the public endpoint from a machine outside the LAN instead; the runbook command below does that.

## Runbook

### Local setup and development

```sh
git clone git@github.com:runyanjake/portfolio.git
cd portfolio
npm ci
npm run dev                 # http://localhost:4321, hot reload
```

Containerized dev server instead, if you'd rather not install Node locally:

```sh
docker compose -f docker-compose.dev.yml up --build     # http://localhost:4321
```

### Type-check

```sh
npm run check               # astro check — types + template diagnostics
```

There is no unit test suite. `npm run check` and the production build are the quality gates, and both run in CI.

### Production build and run

```sh
npm run build               # static output → dist/
npm run preview             # serve dist/ locally to verify before deploying

docker compose -f docker-compose.prod.yml up -d --build
```

### Common operations

```sh
# Tail application logs
docker logs -f jake-website

# Redeploy from scratch
docker compose -f docker-compose.prod.yml down && \
  docker compose -f docker-compose.prod.yml up -d --build

# Verify the deployed site responds.
# Run this from OUTSIDE the LAN: on the deploy host itself the hostname
# resolves to that host's own public IP and the request must hairpin
# through the router, which fails there. Use the health check instead:
#   docker exec jake-website wget -q -S -O /dev/null http://127.0.0.1:80/
curl -sS -o /dev/null -w '%{http_code}\n' https://jake2.runyan.dev

# Clean rebuild after dependency or content-schema changes.
# node_modules/.astro is the content cache -- without clearing it, an
# already-rendered entry is reused and never re-validated.
rm -rf dist .astro node_modules && npm ci && npm run build
```

### Adding a post

Every entry is a folder with an `index.md`, so it can keep its own images beside it:

```sh
mkdir content/blog/my-post
$EDITOR content/blog/my-post/index.md      # → /blog/my-post
cp ~/hero.jpg content/blog/my-post/        # reference it as ./hero.jpg
```

### Adding a section

A section is a folder with an `index.md` that has a `style:` other than `page`. There is nothing to register:

```sh
mkdir content/talks
cat > content/talks/index.md <<'MD'
---
title: Talks
nav: 7
style: list
sort: newest
rail: toc
---

Things I have said out loud.
MD
```

`title` is the only required frontmatter field. Set `draft: true` to keep an entry out of the build. Full schema and the `style:` catalogue: [`.claude/AUTHORING.md`](.claude/AUTHORING.md).
