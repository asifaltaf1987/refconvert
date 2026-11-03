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
- Privacy: no server, no tracking, no cookies, self-hosted fonts. Work is kept in the browser's local storage. Only the Crossref check contacts an outside service (api.crossref.org).

## Project layout

```
src/                  the website (edit these files)
  index.html
  config.js           site name, repository link, Crossref contact e-mail
  css/app.css
  js/app.js           user interface
  js/parser.js        splitting and parsing references
  js/exporters.js     RIS, BibTeX, CSL-JSON
  js/engine.js        citeproc-js and style loading
  js/crossref.js      Crossref lookups
  js/files.js         PDF and Word reading
scripts/build.mjs     builds dist/ and downloads CSL styles and locales
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

## Publish with GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` builds, tests and publishes the site. The workflow also runs every Monday to pick up new and updated citation styles.

The site appears at `https://<your-user-name>.github.io/<repository-name>/`.

## Settings

Edit `src/config.js`:

| Setting | Purpose |
|---|---|
| `title` | Name in the header and browser tab |
| `repoUrl` | Adds a "Source code" link to the header |
| `crossrefMailto` | Contact e-mail sent with Crossref requests (Crossref's "polite pool": more reliable service) |

## Limitations

- Rule-based parsing works best on references that follow a known style. Unusual or incomplete references need a manual check.
- Scanned PDFs without a text layer need OCR first.
- Crossref covers mainly items with DOIs (journal articles, many books and conference papers).

## Licences

Application code: MIT (see `LICENSE`).
Components added at build time: citeproc-js (CPAL-1.0 or AGPL-1.0), CSL styles and locales (CC BY-SA 3.0), pdf.js (Apache-2.0), mammoth.js (BSD-2-Clause), Literata and IBM Plex fonts (SIL OFL 1.1).
