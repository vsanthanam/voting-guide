# Voting guide

A static site for personal voting guides: every race and measure on the ballot,
the oval I'd fill in, and why. Built with [Astro](https://astro.build); content is
plain YAML with Markdown for the reasoning. Each guide is titled after its election.

The look is Apple circa 2026: SF Pro type (Inter as the fallback off Apple devices),
a floating translucent navigation bar, large soft rounded cards with no borders, flat
blue selection circles with checkmarks as the ballot ovals, tinted pill labels for
yes/no, a sticky sub-navigation that tracks your scroll position with a search field
that filters the ballot, a floating glass bar at the bottom on phones, and full light
and dark modes.

```
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve dist/
```

## Writing a guide

See [FORMAT.md](FORMAT.md). Short version: add a folder under `src/content/guides/`,
put a `guide.yaml` in it, and one YAML file per jurisdiction. The build validates
every file and tells you the line of anything it doesn't understand.

Guides live at `/guides/<folder-name>/`. A guide with `status: draft` still builds
and is listed, with an "in progress" banner and a count of undecided items.

## Deploying

Hosted on Cloudflare Workers as a static-assets Worker (`wrangler.jsonc`). No server code.

```
npx wrangler login     # once
npm run deploy         # builds and uploads dist/
```

Set the production URL so canonical links are right:

```
SITE_URL=https://varunvotes.fyi npm run deploy
```

The custom domain is declared in `wrangler.jsonc` under `routes` with `custom_domain: true`;
for a domain registered with Cloudflare the DNS record is created on deploy.

To deploy on every push instead, connect the GitHub repo under Workers & Pages in the
Cloudflare dashboard (build command `npm run build`, deploy command `npx wrangler deploy`).

## Layout

```
src/content.config.ts     the schema (zod) for guide.yaml and jurisdiction files
src/content/guides/       the guides
src/lib/guide.ts          loading, slugs, markdown, stats
src/components/           Contest (the ballot block), Oval, Candidate, Toc
src/pages/                index and guides/[guide]
src/styles/global.css     tokens, type, print styles
```
