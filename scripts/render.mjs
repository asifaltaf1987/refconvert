// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Asif Altaf
// Renders all HTML pages, sitemap, robots.txt, ads.txt and headers from the templates and site.config.json.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { STYLE_PAGES, FOOTER_STYLES, GENERAL_FAQ, TASK_PAGES, aboutBody, privacyBody, imprintBody, termsBody, licensesBody, authorLinks } from "./pages.mjs";
import { parseReference, toCSL } from "../src/js/parser.js";

const require = createRequire(import.meta.url);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonForScript = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

export function renderSite({ root, src, dist }) {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
  cfg.siteUrl = String(cfg.siteUrl || "").replace(/\/+$/, "");
  cfg.ads = cfg.ads || {}; cfg.analytics = cfg.analytics || {}; cfg.verification = cfg.verification || {}; cfg.imprint = cfg.imprint || {};
  const basePath = (() => { try { return new URL(cfg.siteUrl + "/").pathname; } catch { return "/"; } })();
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  const pageTpl = fs.readFileSync(path.join(src, "index.html"), "utf8");
  const docTpl = fs.readFileSync(path.join(src, "doc.html"), "utf8");
  fs.rmSync(path.join(dist, "doc.html"), { force: true });

  // style index for titles and example rendering
  const idxFile = path.join(dist, "csl", "styles.json");
  const index = fs.existsSync(idxFile) ? new Map(JSON.parse(fs.readFileSync(idxFile, "utf8")).styles.map((s) => [s[0], s])) : new Map();
  const stylePages = STYLE_PAGES.filter(([id]) => !index.size || index.has(id));
  const bySlug = new Map(stylePages.map((s) => [s[1], s]));

  // ---------- shared pieces ----------
  const ads = cfg.ads.enabled && /^ca-pub-\d+$/.test(cfg.ads.adsenseClient || "");
  const adBlock = (slot) => ads && slot ? `<div class="container ad-slot"><span class="ad-label">Advertisement</span><ins class="adsbygoogle" style="display:block" data-ad-client="${cfg.ads.adsenseClient}" data-ad-slot="${esc(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(window.adsbygoogle=window.adsbygoogle||[]).push({});</script></div>` : "";
  const headExtra = [
    ads ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cfg.ads.adsenseClient}" crossorigin="anonymous"></script>` : "",
  ].join("\n");
  const bodyExtra = cfg.analytics.cloudflareBeaconToken
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(cfg.analytics.cloudflareBeaconToken)}"}'></script>` : "";
  const verification = [
    cfg.verification.google ? `<meta name="google-site-verification" content="${esc(cfg.verification.google)}">` : "",
    cfg.verification.bing ? `<meta name="msvalidate.01" content="${esc(cfg.verification.bing)}">` : "",
  ].filter(Boolean).join("\n");
  const browserConfig = { siteName: cfg.siteName, repoUrl: cfg.repoUrl, crossrefMailto: cfg.crossrefMailto };

  const rootFor = (p) => { const depth = p.split("/").filter(Boolean).length; return depth ? "../".repeat(depth) : "./"; };
  const url = (p) => cfg.siteUrl + "/" + p;
  const fill = (tpl, vars) => tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => (k in vars ? vars[k] : ""));
  const faqHtml = (list) => list.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n");
  const faqLd = (list) => ({ "@type": "FAQPage", mainEntity: list.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
  const appLd = (name, p, description) => ({
    "@type": "WebApplication", name, url: url(p), description, applicationCategory: "EducationalApplication",
    operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    featureList: ["Plain text, PDF and Word reference extraction", "RIS, BibTeX and CSL-JSON export", "10,800+ CSL citation styles", "Crossref DOI lookup"],
    ...(personLd ? { author: personLd, creator: personLd } : {}),
    ...(cfg.doi ? { identifier: { "@type": "PropertyValue", propertyID: "DOI", value: cfg.doi }, sameAs: [`https://doi.org/${cfg.doi}`, ...(cfg.repoUrl ? [cfg.repoUrl] : [])] } : {}),
    ...(cfg.repoUrl ? { license: "https://www.gnu.org/licenses/agpl-3.0.html" } : {}),
  });
  const crumbsLd = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: url(p) })) });
  const graph = (...nodes) => jsonForScript({ "@context": "https://schema.org", "@graph": nodes });

  const styleLinks = (ROOT, list = stylePages) => list.map(([, slug, short]) => `<li><a href="${ROOT}style/${slug}/">${esc(short)}</a></li>`).join("");
  const footStyles = (ROOT) => FOOTER_STYLES.map((s) => bySlug.get(s)).filter(Boolean).map(([, slug, short]) => `<a href="${ROOT}style/${slug}/">${esc(short)}</a>`).join("\n");
  const repoLink = cfg.repoUrl ? `<a href="${esc(cfg.repoUrl)}" rel="noopener">Source code</a>` : "";
  const ogImage = url("og-image.png");
  const author = cfg.author && cfg.author.name ? cfg.author : null;
  const personLd = author ? { "@type": "Person", name: author.name, jobTitle: author.role || undefined, sameAs: authorLinks(cfg).map(([, u]) => u) } : null;
  const authorCredit = (ROOT) => (author ? `Built by <a href="${ROOT}about/#who">${esc(author.name)}</a>.` : "") +
    (cfg.doi ? ` <a href="${ROOT}about/#cite">Cite</a> (DOI <a href="https://doi.org/${esc(cfg.doi)}" rel="noopener">${esc(cfg.doi)}</a>).` : "");

  const pages = []; // for sitemap
  function writePage(p, html, { index = true, priority = "0.7" } = {}) {
    const dir = path.join(dist, p);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html);
    if (index) pages.push({ loc: url(p), priority });
  }

  function toolPage(p, o) {
    const ROOT = rootFor(p);
    const faq = [...(o.faq || []), ...GENERAL_FAQ];
    return fill(pageTpl, {
      LANG: cfg.language || "en", ROOT, SITE_NAME: esc(cfg.siteName), TAGLINE: esc(cfg.tagline), YEAR: year,
      TITLE: esc(o.title), DESCRIPTION: esc(o.description), CANONICAL: url(p), OG_IMAGE: ogImage,
      EYEBROW: o.crumbs ? `<nav class="crumbs" aria-label="Breadcrumb">${o.crumbs.map(([n, cp], k) => k === o.crumbs.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${ROOT}${cp}">${esc(n)}</a>`).join(' <span aria-hidden="true">/</span> ')}</nav>` : "",
      H1: esc(o.h1), LEDE: esc(o.lede),
      VERIFICATION: verification, HEAD_EXTRA: headExtra, BODY_EXTRA: bodyExtra,
      CONFIG_JSON: jsonForScript(browserConfig), PAGE_JSON: jsonForScript(o.preset || {}),
      JSONLD: graph(appLd(o.appName || cfg.siteName, p, o.description), faqLd(faq), ...(o.crumbs ? [crumbsLd(o.crumbs)] : []),
        ...(p === "" ? [{ "@type": "WebSite", name: cfg.siteName, url: url("") }] : [])),
      PAGE_CONTENT: o.content || "", FAQ: faqHtml(faq),
      STYLE_LINKS: styleLinks(ROOT, o.styleLinks), FOOT_STYLES: footStyles(ROOT),
      REPO_LINK: repoLink, REPO_LINK_FOOT: repoLink, AUTHOR_CREDIT: authorCredit(ROOT),
      AD_AFTER_TOOL: adBlock(cfg.ads.slotAfterTool), AD_IN_CONTENT: adBlock(cfg.ads.slotInContent),
    });
  }

  function docPage(p, o) {
    const ROOT = o.root || rootFor(p);
    return fill(docTpl, {
      LANG: cfg.language || "en", ROOT, SITE_NAME: esc(cfg.siteName), YEAR: year,
      TITLE: esc(o.title), DESCRIPTION: esc(o.description), CANONICAL: url(p), OG_IMAGE: ogImage,
      ROBOTS: o.noindex ? "noindex, follow" : "index, follow", H1: esc(o.h1), CRUMB: esc(o.crumb), BODY: o.body,
      JSONLD: graph(crumbsLd([[cfg.siteName, ""], [o.crumb, p]]), ...(o.extraLd || [])), REPO_LINK: repoLink, AUTHOR_CREDIT: authorCredit(ROOT),
      HEAD_EXTRA: verification, BODY_EXTRA: bodyExtra,
    });
  }

  // ---------- example rendering for style pages ----------
  const examples = [
    "Garfield, E. (1955). Citation indexes for science: A new dimension in documentation through association of ideas. Science, 122(3159), 108–111. https://doi.org/10.1126/science.122.3159.108",
    "Bates, Marcia J. 1989. \"The Design of Browsing and Berrypicking Techniques for the Online Search Interface.\" Online Review 13 (5): 407–24. https://doi.org/10.1108/eb024320",
    "Borgman, Christine L. Big Data, Little Data, No Data: Scholarship in the Networked World. MIT Press, 2015.",
  ].map(parseReference).map((r, i) => ({ ...r, id: "ex" + i }));
  let CSL = null;
  try { CSL = require("citeproc"); } catch { /* examples skipped */ }
  function renderExamples(styleId, defaultLocale) {
    if (!CSL || !index.size) return null;
    const entry = index.get(styleId);
    try {
      const xml = fs.readFileSync(path.join(dist, "csl", "styles", (entry[4] || styleId) + ".csl"), "utf8");
      const lang = entry[5] || defaultLocale || "en-US";
      const loc = (l) => { try { return fs.readFileSync(path.join(dist, "csl", "locales", `locales-${l}.xml`), "utf8"); } catch { return fs.readFileSync(path.join(dist, "csl", "locales", "locales-en-US.xml"), "utf8"); } };
      const items = new Map(examples.map((r) => [r.id, toCSL(r)]));
      const engine = new CSL.Engine({ retrieveLocale: loc, retrieveItem: (id) => items.get(id) }, xml, lang, true);
      engine.setOutputFormat("html");
      engine.updateItems([...items.keys()]);
      const cites = [...items.keys()].map((id) => engine.makeCitationCluster([{ id }]));
      const hasBib = /<bibliography[\s>]/.test(xml);
      const bib = hasBib ? engine.makeBibliography() : null;
      return { bib: bib ? bib[1].join("") : "", meta: bib ? bib[0] : {}, cites, format: entry[3] };
    } catch (e) {
      console.warn("[build] example failed for", styleId, e.message);
      return null;
    }
  }

  // ---------- home ----------
  writePage("", toolPage("", {
    title: `${cfg.siteName}: Convert References to RIS, BibTeX and Any Citation Style`,
    description: cfg.description,
    eyebrow: cfg.tagline,
    h1: "Convert references to RIS, BibTeX and 10,800+ citation styles",
    lede: "Paste a reference list or upload a PDF or Word file. Get clean records for Zotero, EndNote, Mendeley or LaTeX, and a bibliography in APA, MLA, Harvard, IEEE, Vancouver or any other style.",
    styleLinks: stylePages.slice(0, 24),
  }), { priority: "1.0" });

  // ---------- task pages ----------
  for (const t of TASK_PAGES) {
    const p = t.slug + "/";
    writePage(p, toolPage(p, {
      title: `${t.title} | ${cfg.siteName}`, description: t.description, eyebrow: t.eyebrow, h1: t.h1, lede: t.lede,
      preset: t.preset, faq: t.faq, crumbs: [[cfg.siteName, ""], [t.crumb, p]], styleLinks: stylePages.slice(0, 12),
      content: `<section class="section container prose-section">${t.body}</section>`,
    }), { priority: "0.9" });
  }

  // ---------- style pages ----------
  for (const [id, slug, short, who] of stylePages) {
    const p = `style/${slug}/`;
    const entry = index.get(id);
    const cslTitle = entry ? entry[1] : short;
    const ex = renderExamples(id);
    const related = stylePages.filter((s) => s[0] !== id).slice(0, 12);
    const exampleHtml = ex ? `<div class="example-card">
        <h3>Reference list</h3>
        <div class="bib${ex.meta.hangingindent ? " hang" : ""}${ex.meta["second-field-align"] ? " align" : ""}">${ex.bib || ex.cites.map((c) => `<div class="csl-entry">${c}</div>`).join("")}</div>
        ${ex.bib ? `<h3>In-text citations</h3><p class="intext-examples">${ex.cites.map((c) => `<span>${c}</span>`).join(" ")}</p>` : ""}
      </div>` : "";
    writePage(p, toolPage(p, {
      appName: `${short} citation generator`,
      title: `${short} Citation Generator and Reference Converter (Free) | ${cfg.siteName}`,
      description: `Free ${short} citation generator. Paste references in any format or upload a PDF and get them in ${short} style, or export them as RIS or BibTeX. No sign-up.`,
      eyebrow: `Citation style · ${short}`,
      h1: `${short} citation generator and reference converter`,
      lede: `Paste references in any format, upload a PDF or Word file, or paste DOIs, and get a ${short} reference list. Export the same records as RIS or BibTeX.`,
      preset: { style: id, tab: "bib" },
      crumbs: [[cfg.siteName, ""], ["Citation styles", "citation-styles/"], [short, p]],
      styleLinks: related,
      faq: [
        [`Who uses ${short}?`, `${short} is used in ${who}.`],
        [`Which version of ${short} does this page use?`, `It uses the official CSL style “${cslTitle}” from the Citation Style Language repository, the same file Zotero and Mendeley use.`],
        [`How do I convert my references to ${short}?`, `Paste your references or upload a file, select Convert references, check the records, then open Format. ${short} is already selected. Copy the list or download it for Word.`],
      ],
      content: `<section class="section container" aria-labelledby="exTitle">
        <h2 class="section-title" id="exTitle">${esc(short)} examples</h2>
        <p class="section-lede">These three published works are formatted with the official CSL style “${esc(cslTitle)}”: a journal article, a journal article with an abbreviated page range in the source, and a book.</p>
        ${exampleHtml}
      </section>`,
    }), { priority: "0.8" });
  }

  // ---------- citation styles hub ----------
  writePage("citation-styles/", docPage("citation-styles/", {
    title: `Citation Styles: APA, MLA, Harvard, IEEE, Vancouver and 10,800+ More | ${cfg.siteName}`,
    description: "Format references in any of more than 10,800 citation styles from the CSL repository, including APA, MLA, Chicago, Harvard, IEEE, Vancouver, AMA, ISO 690 and journal styles.",
    h1: "Citation styles", crumb: "Citation styles",
    body: `<p class="lede">${cfg.siteName} supports every style in the official Citation Style Language repository: more than 10,800 styles, including thousands of journal-specific ones. Search them all in the Format step of the converter. These are the most used:</p>
      <ul class="style-links wide">${styleLinks("../")}</ul>
      <h2>Can't find your journal?</h2>
      <p>Open the converter, go to Format and type the journal name in the style search. Most journals are covered, either by their own style or by the publisher style they follow.</p>`,
  }), { priority: "0.8" });

  // ---------- about, privacy, imprint ----------
  writePage("about/", docPage("about/", { title: `About ${cfg.siteName}${author ? ` and its developer, ${author.name}` : ""}`, description: `What ${cfg.siteName} does, how it works, who built it and the open-source components behind it.`, h1: `About ${cfg.siteName}`, crumb: "About", body: aboutBody(cfg).replace("<h2>Who built it</h2>", '<h2 id="who">Who built it</h2>'), extraLd: personLd ? [{ "@type": "AboutPage", url: url("about/"), mainEntity: personLd }] : [] }), { priority: "0.5" });
  const readLic = (f) => { try { return fs.readFileSync(path.join(root, f), "utf8"); } catch { return ""; } };
  const licTexts = [
    ["RefConvert source code (GNU AGPL v3.0 or later)", readLic("NOTICE.md").split("## Third-party")[0].replace(/^# .*\n/, "").trim() + "\n\n" + readLic("LICENSE")],
    ["citeproc-js", readLic("node_modules/citeproc/LICENSE") + "\n\nFull licence texts: https://opensource.org/licenses/CPAL-1.0 and https://www.gnu.org/licenses/agpl-3.0.html"],
    ["CSL styles and locales (CC BY-SA 3.0)", "The CSL styles and locales are released under the Creative Commons Attribution-ShareAlike 3.0 Unported licence.\nhttps://creativecommons.org/licenses/by-sa/3.0/\nAuthors and contributors are named in each style file. The files are distributed unmodified."],
    ["pdf.js (Apache-2.0)", readLic("node_modules/pdfjs-dist/LICENSE")],
    ["mammoth.js (BSD-2-Clause)", readLic("node_modules/mammoth/LICENSE")],
    ["Literata (SIL OFL 1.1)", readLic("node_modules/@fontsource/literata/LICENSE")],
    ["IBM Plex (SIL OFL 1.1)", readLic("node_modules/@fontsource/ibm-plex-sans/LICENSE")],
  ].filter(([, t]) => t.trim()).map(([n, t]) => [n.replace("RefConvert", cfg.siteName), t]);
  writePage("terms/", docPage("terms/", { title: `Terms of use | ${cfg.siteName}`, description: `Terms of use for ${cfg.siteName}.`, h1: "Terms of use", crumb: "Terms", body: termsBody(cfg) }), { priority: "0.2" });
  writePage("licenses/", docPage("licenses/", { title: `Licences and credits | ${cfg.siteName}`, description: `Open-source software and data used by ${cfg.siteName}.`, h1: "Licences and credits", crumb: "Licences", body: licensesBody(cfg, licTexts) }), { priority: "0.2" });
  writePage("privacy/", docPage("privacy/", { title: `Privacy policy | ${cfg.siteName}`, description: `How ${cfg.siteName} handles your data.`, h1: "Privacy policy", crumb: "Privacy", body: privacyBody(cfg) }), { priority: "0.2" });
  writePage("imprint/", docPage("imprint/", { title: `Imprint | ${cfg.siteName}`, description: `Legal notice for ${cfg.siteName}.`, h1: "Imprint (Impressum)", crumb: "Imprint", body: imprintBody(cfg), noindex: true }), { index: false });
  fs.writeFileSync(path.join(dist, "404.html"), docPage("404", {
    root: basePath, title: `Page not found | ${cfg.siteName}`, description: "This page does not exist.", h1: "Page not found", crumb: "404", noindex: true,
    body: `<p>The page you were looking for does not exist. Try the converter or the list of citation styles.</p>`,
  }));

  // ---------- sitemap, robots, ads.txt, headers, manifest ----------
  fs.writeFileSync(path.join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages.map((pg) => `  <url><loc>${pg.loc}</loc><lastmod>${today}</lastmod><priority>${pg.priority}</priority></url>`).join("\n") + `\n</urlset>\n`);
  fs.writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: ${basePath}csl/styles/\n\nSitemap: ${url("sitemap.xml")}\n`);
  if (ads) fs.writeFileSync(path.join(dist, "ads.txt"), `google.com, ${cfg.ads.adsenseClient.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n`);
  fs.writeFileSync(path.join(dist, "_headers"), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/vendor/*
  Cache-Control: public, max-age=2592000
/csl/*
  Cache-Control: public, max-age=86400
`);
  const manifest = JSON.parse(fs.readFileSync(path.join(src, "manifest.webmanifest"), "utf8"));
  manifest.name = cfg.siteName; manifest.short_name = cfg.siteName; manifest.description = cfg.description;
  fs.writeFileSync(path.join(dist, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));

  const missing = [];
  if (!(cfg.imprint.street && cfg.imprint.city && cfg.imprint.email)) missing.push("imprint street, city and e-mail – required in Germany for public sites");
  if (false) missing.push("imprint (name/address/e-mail) – required in Germany for public sites");
  if (cfg.siteUrl.includes("refconvert.pages.dev")) missing.push("siteUrl – set your real address");
  return { pages: pages.length, missing };
}
