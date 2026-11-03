// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Dr. Asif Altaf
// Citation formatting with citeproc-js (the CSL processor used by Zotero)
// and the official CSL style and locale repositories, served from this site.
import { toCSL } from "./parser.js";

const ROOT = window.REFCONVERT_ROOT || "";
const BASE = ROOT + "csl/";
let indexPromise = null;
const styleXml = new Map();
const localeXml = new Map();
let primaryDialects = null;

export const POPULAR = [
  "apa", "modern-language-association", "chicago-author-date", "chicago-notes-bibliography",
  "harvard-cite-them-right", "ieee", "vancouver-nlm", "american-medical-association",
  "nature", "elsevier-harvard", "springer-basic-author-date", "american-chemical-society",
  "din-1505-2", "iso690-author-date-en", "deutsche-gesellschaft-fur-psychologie", "oscola",
];

export function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(BASE + "styles.json")
      .then((r) => { if (!r.ok) throw new Error("Style list not found (" + r.status + "). Run the build first."); return r.json(); })
      .then((j) => {
        const byId = new Map();
        const styles = j.styles.map(([id, title, short, format, parent, locale, fields]) => {
          const s = { id, title, short, format, parent, locale, fields, search: (title + " " + short + " " + id + " " + fields).toLowerCase() };
          byId.set(id, s);
          return s;
        });
        return { styles, byId, built: j.built, commit: j.commit };
      });
  }
  return indexPromise;
}

export function searchStyles(index, query, field = "", limit = 80) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const out = [];
  for (const s of index.styles) {
    if (field && !s.fields.split(" ").includes(field)) continue;
    if (words.every((w) => s.search.includes(w))) {
      let score = 0;
      const t = s.title.toLowerCase();
      if (words.length && t.startsWith(words[0])) score -= 2;
      if (s.id === query.toLowerCase()) score -= 5;
      if (!s.parent) score -= 1;
      out.push([score, s]);
    }
  }
  out.sort((a, b) => a[0] - b[0] || a[1].title.localeCompare(b[1].title));
  return out.slice(0, limit).map((x) => x[1]);
}

async function getText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Could not load " + url + " (" + r.status + ")");
  return r.text();
}

async function getStyleXml(id) {
  if (!styleXml.has(id)) styleXml.set(id, getText(BASE + "styles/" + id + ".csl"));
  return styleXml.get(id);
}

async function normaliseLang(lang) {
  if (!primaryDialects) {
    try { primaryDialects = (await (await fetch(BASE + "locales/locales.json")).json())["primary-dialects"] || {}; }
    catch { primaryDialects = {}; }
  }
  if (!lang) return "en-US";
  if (/^[a-z]{2,3}$/i.test(lang)) return primaryDialects[lang.toLowerCase()] || "en-US";
  return lang;
}

async function getLocaleXml(lang) {
  if (!localeXml.has(lang)) {
    localeXml.set(lang, getText(BASE + "locales/locales-" + lang + ".xml").catch(() => null));
  }
  return localeXml.get(lang);
}

export async function listLocales() {
  try {
    const j = await (await fetch(BASE + "locales/locales.json")).json();
    return Object.entries(j["language-names"] || {}).map(([code, names]) => ({ code, name: names[1] && names[1] !== names[0] ? `${names[0]} (${names[1]})` : names[0] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch { return [{ code: "en-US", name: "English (US)" }]; }
}

/**
 * Format records with a CSL style.
 * @param {object[]} records  app records
 * @param {object}   opts     { styleId, lang ("auto" or BCP 47), format: "html"|"text"|"rtf", citations: boolean }
 * @returns {Promise<{entries:string[], bibstart:string, bibend:string, meta:object, citations:Map, style:object, lang:string}>}
 */
export async function formatBibliography(records, { styleId, lang = "auto", format = "html", citations = false } = {}) {
  if (!window.CSL) throw new Error("The citation engine did not load.");
  const index = await loadIndex();
  const style = index.byId.get(styleId);
  if (!style) throw new Error("Unknown style: " + styleId);
  const xml = await getStyleXml(style.parent || style.id);
  const wanted = await normaliseLang(lang === "auto" ? (style.locale || "") : lang);
  const [primary, fallback] = await Promise.all([getLocaleXml(wanted), getLocaleXml("en-US")]);
  const effectiveLang = primary ? wanted : "en-US";

  const items = new Map(records.map((r) => [r.id, toCSL(r)]));
  const sys = {
    retrieveLocale: (l) => (l === effectiveLang ? primary || fallback : l === "en-US" ? fallback : null) || fallback,
    retrieveItem: (id) => items.get(id),
  };
  const forceLang = lang !== "auto" || !!style.locale;
  const engine = new window.CSL.Engine(sys, xml, effectiveLang, forceLang);
  engine.setOutputFormat(format);
  const ids = records.map((r) => r.id);
  engine.updateItems(ids);

  let entries = [], meta = {}, bibstart = "", bibend = "";
  const hasBib = /<bibliography[\s>]/.test(xml);
  if (hasBib) {
    const res = engine.makeBibliography();
    if (res) { meta = res[0]; entries = res[1]; bibstart = meta.bibstart || ""; bibend = meta.bibend || ""; }
  }
  const cites = new Map();
  if (citations || !hasBib) {
    engine.setOutputFormat(format === "rtf" ? "rtf" : "html");
    for (const id of ids) {
      try { cites.set(id, engine.makeCitationCluster([{ id }])); } catch { cites.set(id, ""); }
    }
    if (!hasBib) entries = ids.map((id) => cites.get(id));
  }
  return { entries, meta, bibstart, bibend, citations: cites, style, lang: effectiveLang, hasBib };
}
