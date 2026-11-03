# Reference Converter

Convert reference lists from plain text, PDF or Word files into **RIS**, **BibTeX** or **CSL-JSON**, and format them in any of the **10,800+ citation styles** from the official CSL style repository (the same styles Zotero, Mendeley and Papers use).

The site is static. It runs completely in the browser and is published with GitHub Pages.

## Features

- Paste references, or upload PDF, DOCX, RTF or TXT files. The tool finds the reference section of a long document on its own.
- Splits the list (numbered lists, blank-line separated lists, wrapped PDF lines) and reads authors, editors, title, journal or book, year, volume, issue, pages, edition, publisher, place, DOI and URL.
- Parser rules cover APA, Harvard, Chicago, MLA, IEEE, Vancouver, AMA and ISO 690/DIN references.
- Marks incomplete records and lets you correct every field.
- **Check with Crossref** completes records that have a DOI and finds DOIs for records without one (title match of 85 % or more plus the same year).
- Formatting with [citeproc-js](https://github.com/Juris-M/citeproc-js), Zotero's citation processor, in any CSL style and 60+ languages; optional in-text citations.
- Downloads: RIS, BibTeX, CSL-JSON, Word (.rtf), HTML and plain text.
- Privacy: no server, self-hosted fonts, work kept in the browser's local storage. Only the Crossref check contacts an outside service (api.crossref.org), plus ads and analytics if you switch them on.
- SEO: 43 indexable pages (home, 4 task pages, 35 citation style pages with real rendered examples, style hub, about, privacy), sitemap.xml, robots.txt, canonical links, Open Graph and Twitter cards, schema.org WebApplication, FAQPage and BreadcrumbList data.
- Legal: Terms of use, privacy policy (GDPR/TDDDG, host-specific), bilingual imprint, licences page with full licence texts, trademark notice, consent dialog before any Crossref request, storage on the device only after opt-in.
- Extras: split modes (auto, one per line, blank lines), DOI lists, duplicate detection, "only records to check" filter, Ctrl+Enter to convert.

## Project layout

```
site.config.json      site name, address, imprint, ads, analytics, verification codes
src/                  the website
  index.html          template for the converter and all landing pages
  doc.html            template for About, Privacy, Imprint, Citation styles
  og-image.png        image shown when the site is shared on social media
  css/app.css
  js/app.js           user interface
  js/parser.js        splitting and parsing references
  js/exporters.js     RIS, BibTeX, CSL-JSON
  js/engine.js        citeproc-js and style loading
  js/crossref.js      Crossref lookups
  js/files.js         PDF and Word reading
scripts/build.mjs     builds dist/ and downloads CSL styles and locales
scripts/render.mjs    renders all pages, sitemap.xml, robots.txt, ads.txt, _headers
scripts/pages.mjs     text of the landing pages (styles, tasks, FAQ, privacy, imprint)
scripts/serve.mjs     local test server
tests/                automated tests (node --test)
.github/workflows/deploy.yml   build, test and publish to GitHub Pages
```

`dist/`, `node_modules/` and `.cache/` are created by the build and are not committed.

## Run it on your computer

Requirements: [Node.js 20 or newer](https://nodejs.org) and [Git](https://git-scm.com).

```bash
npm install
npm run build
npm test
npm run serve
```

Open http://localhost:8080.

## Publish with Cloudflare Pages (recommended, free, own address)

1. Sign up at https://dash.cloudflare.com (free plan).
2. Go to **Workers & Pages → Create → Pages → Connect to Git** and choose this repository.
3. Build settings: Framework preset **None**, build command `npm run build`, output directory `dist`.
4. Under **Environment variables** add `NODE_VERSION` = `20`.
5. Save and deploy. The site appears at `https://<project-name>.pages.dev`. Add your own domain under **Custom domains**.
6. Put the final address in `site.config.json` → `siteUrl`, commit and push.

Every push to `main` redeploys automatically.

## Publish with GitHub Pages (alternative)

Settings → Pages → Source: **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds, tests and publishes on every push and every Monday. GitHub Pages is not meant for commercial sites, so do not run ads there.

## Settings (`site.config.json`)

| Setting | Purpose |
|---|---|
| `siteName`, `tagline`, `description` | Name and texts used in the header, page titles and search results |
| `siteUrl` | Final public address, used for canonical links, sitemap and social previews |
| `repoUrl` | Adds a GitHub link to the header and footer |
| `contactEmail`, `crossrefMailto` | Contact shown on the About page; e-mail sent to Crossref for its polite pool |
| `host` | `github` or `cloudflare`: names the correct hosting provider in the privacy policy |
| `author` | Your name, role and profile links (LinkedIn, ORCID, Google Scholar, GitHub), shown on the About page, in the footer and in search-engine data |
| `imprint` | Name, address and e-mail for the Imprint and Privacy pages (required in Germany) |
| `ads` | Google AdSense publisher ID and ad slot IDs; set `enabled` to `true` to show ads and create `ads.txt` |
| `analytics.cloudflareBeaconToken` | Optional cookie-free Cloudflare Web Analytics |
| `verification` | Google Search Console and Bing Webmaster Tools verification codes |

Landing page texts are in `scripts/pages.mjs`.

## Limitations

- Rule-based parsing works best on references that follow a known style. Unusual or incomplete references need a manual check.
- Scanned PDFs without a text layer need OCR first.
- Crossref covers mainly items with DOIs (journal articles, many books and conference papers).

## Licences

Application code: MIT (see `LICENSE`).
Components added at build time: citeproc-js (CPAL-1.0 or AGPL-3.0), CSL styles and locales (CC BY-SA 3.0), pdf.js (Apache-2.0), mammoth.js (BSD-2-Clause), Literata and IBM Plex fonts (SIL OFL 1.1).
