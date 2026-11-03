// Build script: copies the app into dist/, adds third-party libraries and fonts,
// and pulls the official CSL styles and locales (the same repository Zotero uses).
//
// Usage:  npm run build
// Env:    CSL_DIR=/path/to/folder  reuse an existing checkout of styles/ and locales/
//         SKIP_CSL=1               skip styles (faster local UI work; formatting will not work)

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSite } from "./render.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const nm = path.join(root, "node_modules");
const cacheDir = process.env.CSL_DIR ? path.resolve(process.env.CSL_DIR) : path.join(root, ".cache", "csl");

const log = (...a) => console.log("[build]", ...a);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

function git(args, cwd) {
  execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "inherit"] });
}

function ensureRepo(name, url) {
  const dir = path.join(cacheDir, name);
  if (fs.existsSync(path.join(dir, ".git"))) {
    if (!process.env.CSL_DIR) {
      log(`updating ${name}…`);
      try { git(["pull", "--ff-only", "-q"], dir); } catch { log(`could not update ${name}, using cached copy`); }
    }
  } else if (fs.existsSync(dir) && process.env.CSL_DIR) {
    // plain folder supplied by the user
  } else {
    log(`cloning ${name}…`);
    fs.mkdirSync(cacheDir, { recursive: true });
    git(["clone", "-q", "--depth", "1", url, dir], cacheDir);
  }
  return dir;
}

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1].trim()) : "";
};
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const attr = (xml, re) => { const m = xml.match(re); return m ? m[1] : ""; };

function readStyleInfo(xml) {
  const info = xml.slice(0, xml.indexOf("</info>") + 7);
  return {
    title: tag(info, "title"),
    short: tag(info, "title-short"),
    format: attr(info, /<category\s+citation-format="([^"]+)"/),
    fields: [...info.matchAll(/<category\s+field="([^"]+)"/g)].map((m) => m[1]).filter((f) => f !== "generic-base"),
    locale: attr(xml.slice(0, 600), /default-locale="([^"]+)"/),
    parent: attr(info, /<link\s+href="https?:\/\/www\.zotero\.org\/styles\/([^"]+)"\s+rel="independent-parent"/),
  };
}

// ---------- 1. app files ----------
log("cleaning dist/");
fs.rmSync(dist, { recursive: true, force: true });
copyDir(src, dist);

// ---------- 2. libraries ----------
log("adding libraries");
const vendor = path.join(dist, "vendor");
fs.mkdirSync(vendor, { recursive: true });
const citeproc = fs.readFileSync(path.join(nm, "citeproc", "citeproc_commonjs.js"), "utf8");
fs.writeFileSync(
  path.join(vendor, "citeproc.js"),
  "/* citeproc-js (Frank Bennett / Zotero), CPAL-1.0 OR AGPL-3.0, used under CPAL-1.0. Unmodified. https://github.com/Juris-M/citeproc-js */\n" +
    "(function(){var module={exports:{}};\n" + citeproc + "\n;window.CSL=module.exports;})();\n"
);
for (const [from, to] of [
  ["pdfjs-dist/build/pdf.min.js", "pdf.min.js"],
  ["pdfjs-dist/build/pdf.worker.min.js", "pdf.worker.min.js"],
  ["mammoth/mammoth.browser.min.js", "mammoth.browser.min.js"],
]) fs.copyFileSync(path.join(nm, from), path.join(vendor, to));

// ---------- 3. fonts (self-hosted, no requests to Google) ----------
log("adding fonts");
const fonts = path.join(dist, "fonts");
fs.mkdirSync(fonts, { recursive: true });
const fontFiles = [
  ["literata", ["500", "600"]],
  ["ibm-plex-sans", ["400", "500", "600"]],
  ["ibm-plex-mono", ["400", "500"]],
];
for (const [fam, weights] of fontFiles)
  for (const w of weights)
    for (const sub of ["latin", "latin-ext"]) {
      const f = `${fam}-${sub}-${w}-normal.woff2`;
      fs.copyFileSync(path.join(nm, "@fontsource", fam, "files", f), path.join(fonts, f));
    }

// ---------- 4. CSL styles and locales ----------
if (process.env.SKIP_CSL) {
  log("SKIP_CSL set: citation styles not included");
} else {
  const stylesRepo = ensureRepo("styles", "https://github.com/citation-style-language/styles.git");
  const localesRepo = ensureRepo("locales", "https://github.com/citation-style-language/locales.git");

  const outStyles = path.join(dist, "csl", "styles");
  const outLocales = path.join(dist, "csl", "locales");
  fs.mkdirSync(outStyles, { recursive: true });
  fs.mkdirSync(outLocales, { recursive: true });

  const index = [];
  const independent = new Set();
  for (const f of fs.readdirSync(stylesRepo).filter((f) => f.endsWith(".csl")).sort()) {
    const xml = fs.readFileSync(path.join(stylesRepo, f), "utf8");
    const id = f.slice(0, -4);
    const i = readStyleInfo(xml);
    fs.writeFileSync(path.join(outStyles, f), xml);
    independent.add(id);
    index.push([id, i.title, i.short, i.format, "", i.locale, i.fields.join(" ")]);
  }
  let skipped = 0;
  const depDir = path.join(stylesRepo, "dependent");
  if (fs.existsSync(depDir)) {
    for (const f of fs.readdirSync(depDir).filter((f) => f.endsWith(".csl")).sort()) {
      const xml = fs.readFileSync(path.join(depDir, f), "utf8");
      const i = readStyleInfo(xml);
      if (!i.parent || !independent.has(i.parent)) { skipped++; continue; }
      index.push([f.slice(0, -4), i.title, i.short, i.format, i.parent, i.locale, i.fields.join(" ")]);
    }
  }
  index.sort((a, b) => a[1].localeCompare(b[1], "en"));

  let commit = "";
  try { commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: stylesRepo }).toString().trim(); } catch {}
  fs.writeFileSync(
    path.join(dist, "csl", "styles.json"),
    JSON.stringify({ built: new Date().toISOString().slice(0, 10), commit, columns: ["id", "title", "short", "format", "parent", "locale", "fields"], styles: index })
  );

  const locales = fs.readdirSync(localesRepo).filter((f) => /^locales-.+\.xml$/.test(f));
  for (const f of locales) fs.copyFileSync(path.join(localesRepo, f), path.join(outLocales, f));
  fs.copyFileSync(path.join(localesRepo, "locales.json"), path.join(outLocales, "locales.json"));

  log(`styles: ${independent.size} independent + ${index.length - independent.size} dependent (${skipped} skipped), locales: ${locales.length}`);
}

// ---------- 5. pages, sitemap, robots.txt ----------
const site = renderSite({ root, src, dist });
log(`pages: ${site.pages} indexable pages + sitemap.xml + robots.txt`);
for (const m of site.missing) log(`NOTE: site.config.json is missing ${m}`);

fs.writeFileSync(path.join(dist, ".nojekyll"), "");
log("done → dist/");
