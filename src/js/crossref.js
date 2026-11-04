// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Asif Altaf
// Crossref lookups: complete records that have a DOI, and find DOIs for records without one.
// Only the DOI or the reference text is sent to api.crossref.org, and only when the user asks.
import { hyph } from "./parser.js";

const API = "https://api.crossref.org/works";
const TYPE = {
  "journal-article": "article-journal", "book": "book", "monograph": "book", "edited-book": "book",
  "reference-book": "book", "book-chapter": "chapter", "book-section": "chapter", "book-part": "chapter",
  "proceedings-article": "paper-conference", "dissertation": "thesis", "report": "report",
  "dataset": "dataset", "posted-content": "document",
};
const stripTags = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

function mailto() {
  const m = (window.REFCONVERT_CONFIG || {}).crossrefMailto;
  return m ? "mailto=" + encodeURIComponent(m) : "";
}

function words(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2);
}
export function titleSimilarity(a, b) {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const w of A) if (B.has(w)) common++;
  return (2 * common) / (A.size + B.size);
}

function apply(r, m) {
  const first = (a) => (Array.isArray(a) && a.length ? stripTags(a[0]) : "");
  if (TYPE[m.type]) r.type = TYPE[m.type];
  const people = (list) => list.map((a) => (a.family ? { family: a.family, given: a.given || "" } : { literal: a.name || "" })).filter((a) => a.family || a.literal);
  if (Array.isArray(m.author) && m.author.length) { r.authors = people(m.author); r.etal = false; }
  if (Array.isArray(m.editor) && m.editor.length) r.editors = people(m.editor);
  let title = first(m.title);
  if (title && m.subtitle && m.subtitle[0] && !title.includes(":")) title += ": " + stripTags(m.subtitle[0]);
  if (title) r.title = title;
  const container = first(m["container-title"]);
  if (container) r.container = container;
  const dp = (m.issued && m.issued["date-parts"] && m.issued["date-parts"][0]) || (m.published && m.published["date-parts"] && m.published["date-parts"][0]);
  if (dp && dp[0]) r.year = String(dp[0]);
  if (m.volume) r.volume = String(m.volume);
  if (m.issue) r.issue = String(m.issue);
  if (m.page) r.pages = hyph(m.page);
  else if (m["article-number"]) r.pages = String(m["article-number"]);
  if (m.publisher && r.type !== "article-journal") r.publisher = m.publisher;
  if (m["publisher-location"]) r.place = m["publisher-location"];
  if (m.DOI) r.doi = m.DOI;
  r.source = "crossref";
}

async function getJSON(url, signal) {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (res.status === 429) throw Object.assign(new Error("Crossref asked us to slow down."), { retry: true });
  if (!res.ok) throw new Error("Crossref error " + res.status);
  return res.json();
}

/**
 * Check one record against Crossref.
 * @returns {"updated"|"matched"|"nomatch"|"notfound"}
 */
export async function verifyRecord(r, { signal } = {}) {
  const q = mailto();
  if (r.doi) {
    const j = await getJSON(`${API}/${encodeURIComponent(r.doi)}${q ? "?" + q : ""}`, signal);
    if (!j) return "notfound";
    apply(r, j.message);
    return "updated";
  }
  const text = r.raw || [r.authors.map((a) => a.family || a.literal).join(" "), r.title, r.container, r.year].join(" ");
  if (!text.trim() || !r.title) return "nomatch";
  const params = new URLSearchParams({ "query.bibliographic": text.slice(0, 500), rows: "3" });
  if (q) params.set("mailto", (window.REFCONVERT_CONFIG || {}).crossrefMailto);
  const j = await getJSON(`${API}?${params}`, signal);
  const items = (j && j.message && j.message.items) || [];
  for (const m of items) {
    const sim = titleSimilarity(r.title, stripTags((m.title || [""])[0]));
    const y = (m.issued && m.issued["date-parts"] && m.issued["date-parts"][0] && m.issued["date-parts"][0][0]) || "";
    const yearOk = !r.year || !y || String(y) === r.year;
    if (sim >= 0.85 && yearOk) { apply(r, m); return "matched"; }
  }
  return "nomatch";
}
