# portfolio

Static personal site for [jake.runyan.dev](https://jake.runyan.dev), built with Astro — markdown in `src/content/` renders into four sections: blog, projects, about, and friends.

## Features

- Four typed content collections, each with its own frontmatter schema validated at build time.
- Interchangeable index displays — `list`, `cards`, `grid`, `gallery` — chosen per section.
- Swappable CSS themes; a theme is a directory under `src/themes/` and multiple can be layered.
- Local images run through Astro's image pipeline: responsive `srcset`, WebP, content-hashed filenames.
- Static output with no client framework — only Astro's View Transitions runtime reaches the browser.
- Multi-stage Docker build to `nginx:alpine`, deployed behind Traefik by Jenkins.

Architecture and authoring reference: [`.claude/DESIGN.md`](.claude/DESIGN.md).

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

There is no `.env` — the site is a static build with no runtime configuration. Settings live in three places:

| File | Controls |
|---|---|
| `src/site.config.ts` | Title, tagline, meta description, footer, nav items, active theme |
| `astro.config.mjs` | Canonical `site` URL, MDX, prefetch, syntax highlighting theme |
| `docker-compose.prod.yml` | Container name (`jake-website`), Traefik router host and TLS resolver |

Deploy-time secret, read by `Jenkinsfile` from the Jenkins credential store:

| Credential ID | Purpose |
|---|---|
| `discord-pws-builds-channel-webhook` | Build-status notifications; the pipeline fails preflight if unset |

The Traefik host in `docker-compose.prod.yml` (`jake2.runyan.dev`) is the deploy target; the canonical `site` URL in `astro.config.mjs` (`jake.runyan.dev`) is what gets baked into generated absolute URLs. Change both when cutting over.

## Deployment

Pushes are deployed by the Jenkins pipeline in `Jenkinsfile`: preflight → lint and type-check → teardown → build and start → container health check → HTTPS smoke test → Discord notification. The image is built from the checked-out commit; there are no versioned release artifacts or published tags.

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

# Verify the deployed site responds
curl -sS -o /dev/null -w '%{http_code}\n' https://jake2.runyan.dev

# Clean rebuild after dependency or content-schema changes
rm -rf dist .astro node_modules && npm ci && npm run build
```

### Adding a post

```sh
# Flat file when the post has no images
$EDITOR src/content/blog/my-post.md            # → /blog/my-post

# Folder when it does; reference images as ./hero.jpg
mkdir src/content/blog/my-post
$EDITOR src/content/blog/my-post/index.md      # → /blog/my-post
```

`blog` requires `title` and `date` in frontmatter. Set `draft: true` to keep an entry out of the build. Full schema per collection: [`.claude/DESIGN.md`](.claude/DESIGN.md).
