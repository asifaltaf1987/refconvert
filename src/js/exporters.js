// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Dr. Asif Altaf
// Export formats: RIS (Zotero, EndNote, Mendeley, Citavi), BibTeX and CSL-JSON.
import { authorToLine, splitPages, toCSL } from "./parser.js";

const RIS_TYPE = {
  "article-journal": "JOUR", "book": "BOOK", "chapter": "CHAP", "paper-conference": "CPAPER",
  "thesis": "THES", "report": "RPRT", "webpage": "ELEC", "article-newspaper": "NEWS",
  "article-magazine": "MGZN", "dataset": "DATA", "document": "GEN",
};
export const risType = (t) => RIS_TYPE[t] || "GEN";

export function toRIS(records, { includeNote = true } = {}) {
  const out = [];
  for (const r of records) {
    const L = (tag, v) => {
      v = String(v ?? "").replace(/\s+/g, " ").trim();
      if (v) out.push(`${tag}  - ${v}`);
    };
    L("TY", risType(r.type));
    r.authors.forEach((a) => L("AU", authorToLine(a)));
    r.editors.forEach((a) => L("A2", authorToLine(a)));
    L("TI", r.title);
    L("T2", r.container);
    if (r.type === "article-journal") L("JO", r.container);
    L("PY", r.year);
    L("VL", r.volume);
    L("IS", r.issue);
    if (r.pages) { const { sp, ep } = splitPages(r.pages); L("SP", sp); L("EP", ep); }
    L("ET", r.edition);
    L("PB", r.publisher);
    L("CY", r.place);
    L("DO", r.doi);
    L("UR", r.url || (r.doi ? "https://doi.org/" + r.doi : ""));
    if (includeNote && r.raw) L("N1", "Original reference: " + r.raw);
    out.push("ER  - ", "");
  }
  return out.join("\r\n");
}

const BIB_TYPE = {
  "article-journal": "article", "book": "book", "chapter": "incollection", "paper-conference": "inproceedings",
  "thesis": "phdthesis", "report": "techreport", "webpage": "online", "article-newspaper": "article",
  "article-magazine": "article", "dataset": "misc", "document": "misc",
};
const LATEX = { "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#", "_": "\\_", "{": "\\{", "}": "\\}" };
const texEsc = (s) => String(s).replace(/[&%$#_{}]/g, (c) => LATEX[c]);

function bibKey(r, used) {
  const a = r.authors[0];
  const base = ((a && (a.family || a.literal)) || r.title.split(/\s+/)[0] || "ref")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 20) || "ref";
  const word = (r.title.match(/[A-Za-z]{4,}/) || [""])[0].toLowerCase();
  let key = base.toLowerCase() + (r.year || "nd") + word;
  let k = key, n = 1;
  while (used.has(k)) k = key + String.fromCharCode(96 + ++n);
  used.add(k);
  return k;
}

export function toBibTeX(records) {
  const used = new Set();
  return records.map((r) => {
    const f = [];
    const F = (k, v) => { v = String(v ?? "").trim(); if (v) f.push(`  ${k} = {${k === "url" || k === "doi" ? v : texEsc(v)}}`); };
    const names = (list) => list.map((a) => (a.literal ? `{${a.literal}}` : a.family + (a.given ? ", " + a.given : ""))).join(" and ");
    F("author", names(r.authors));
    F("editor", names(r.editors));
    F("title", r.title);
    if (r.type === "article-journal" || r.type.startsWith("article")) F("journal", r.container);
    else if (r.type === "chapter" || r.type === "paper-conference") F("booktitle", r.container);
    else if (r.type === "webpage") F("organization", r.container);
    F("year", r.year);
    F("volume", r.volume);
    F("number", r.issue);
    F("pages", r.pages.replace(/-/g, "--"));
    F("edition", r.edition);
    F(r.type === "thesis" ? "school" : r.type === "report" ? "institution" : "publisher", r.publisher);
    F("address", r.place);
    F("doi", r.doi);
    F("url", r.url);
    return `@${BIB_TYPE[r.type] || "misc"}{${bibKey(r, used)},\n${f.join(",\n")}\n}`;
  }).join("\n\n") + "\n";
}

export function toCSLJSON(records) {
  return JSON.stringify(records.map(toCSL), null, 2) + "\n";
}

export const EXPORTS = {
  ris: { label: "RIS", ext: "ris", mime: "application/x-research-info-systems", fn: toRIS, note: "Zotero, EndNote, Mendeley, Citavi, Alma/Primo" },
  bibtex: { label: "BibTeX", ext: "bib", mime: "application/x-bibtex", fn: toBibTeX, note: "LaTeX, Overleaf, JabRef" },
  csljson: { label: "CSL-JSON", ext: "json", mime: "application/json", fn: toCSLJSON, note: "Zotero, Pandoc, citeproc" },
};
