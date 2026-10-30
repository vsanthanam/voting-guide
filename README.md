# Voting guide

A static site for personal voting guides.
Built with [Astro](https://astro.build)

I have been publishing voting guides for my friends and family for well over a decade now.
Historically, I have done this as a PDF, and its been pretty labor intensive.
This year, I decided to create a structured format and site generator that allows me to just fill in the content and update it with time.

## Setup

The Bun version is pinned in `mise.toml` with [mise](https://mise.jdx.dev):

```
mise install
bun install
```

## Linting and formatting

ESLint and Prettier run in CI. Locally:

```
bun run check     # lint + format check
bun run format    # rewrite files with Prettier
```

Guide YAML under `src/content/` is excluded from Prettier so the hand-written layout is preserved.

## Writing a guide

See [FORMAT.md](FORMAT.md).
TLDR:

- Add a folder under `src/content/guides/`
- Put a `guide.yaml` in it, and one YAML file per jurisdiction.
- The build validates the guides for formatting or structure issues.

Guides live at `/guides/<folder-name>/`. A guide with `status: draft` still builds
and is listed, with an "in progress" banner and a count of undecided items.

## Deploying

Hosted on Cloudflare Workers as a static-assets Worker (`wrangler.jsonc`). No server code.

CI (`.github/workflows/cd.yaml`) runs lint, format, and build checks on every pull request and
on every push to `main`. Pushes to `main` that pass those checks are deployed automatically.

To deploy by hand:

```
bun --bun wrangler login     # once
bun run deploy         # builds and uploads dist/
```

Set the production URL so canonical links are right:

```
SITE_URL=https://varunvotes.fyi bun run deploy
```

The custom domain is declared in `wrangler.jsonc` under `routes` with `custom_domain: true`;
for a domain registered with Cloudflare the DNS record is created on deploy.

## Link previews

Open Graph and Twitter card tags point at `public/og/<guide>.png` (1200x630). The images are
rendered with headless Chrome and committed; regenerate them after adding a guide or changing
a title:

```
bun run og
```
