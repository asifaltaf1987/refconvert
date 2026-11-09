// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Asif Altaf
// Reference Converter: user interface.
import { TYPES, blankRecord, parseReference, splitReferences, findReferenceSection, issues, authorToLine, lineToAuthor, hyph } from "./parser.js";
import { EXPORTS, risType } from "./exporters.js";
import { loadIndex, searchStyles, formatBibliography, listLocales, POPULAR } from "./engine.js";
import { verifyRecord } from "./crossref.js";
import { readFile } from "./files.js";

const CONFIG = window.REFCONVERT_CONFIG || {};
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const stripTags = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#38;/g, "&");

/* Real, published works in different styles, used as the example. */
const EXAMPLE = `Garfield, E. (1955). Citation indexes for science: A new dimension in documentation through association of ideas. Science, 122(3159), 108–111. https://doi.org/10.1126/science.122.3159.108

Page MJ, McKenzie JE, Bossuyt PM, Boutron I, Hoffmann TC, Mulrow CD, et al. The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. BMJ. 2021;372:n71. doi:10.1136/bmj.n71

A. Vaswani et al., "Attention is all you need," in Advances in Neural Information Processing Systems, vol. 30, 2017, pp. 5998–6008.

Ranganathan, S. R. (1931). The five laws of library science. Madras Library Association.

Borgman, Christine L. Big Data, Little Data, No Data: Scholarship in the Networked World. MIT Press, 2015.

Bates, Marcia J. 1989. "The Design of Browsing and Berrypicking Techniques for the Online Search Interface." Online Review 13 (5): 407–24. https://doi.org/10.1108/eb024320`;

const EXAMPLE_DOI = `10.1126/science.122.3159.108
https://doi.org/10.1108/eb024320
10.1136/bmj.n71`;
const PAGE = window.REFCONVERT_PAGE || {};

/* ---------- state ---------- */
const KEY = "refconvert:v1";
const state = {
  records: [],
  editing: null,
  styleId: "apa",
  lang: "auto",
  showCites: false,
  exportFmt: "ris",
  note: true,
  tab: "records",
  split: "auto",
  onlyFlagged: false,
  remember: false,
  crossrefOk: false,
  theme: "system",
  recent: [],
};
let fileInfo = null;
let formatted = { byId: new Map(), cites: new Map(), ok: false };
let styleIndex = null;

function save() {
  if (!state.remember) return; // nothing is stored without the user's consent (TDDDG § 25)
  try {
    localStorage.setItem(KEY, JSON.stringify({
      src: $("src").value, records: state.records, styleId: state.styleId, lang: state.lang,
      showCites: state.showCites, exportFmt: state.exportFmt, note: state.note, tab: state.tab, split: state.split,
      remember: true, crossrefOk: state.crossrefOk, theme: state.theme, recent: state.recent,
    }));
  } catch { /* storage full or blocked: the app still works */ }
}
function restore() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!j) return false;
    Object.assign(state, { records: j.records || [], styleId: j.styleId || "apa", lang: j.lang || "auto", showCites: !!j.showCites, exportFmt: j.exportFmt || "ris", note: j.note !== false, tab: j.tab || "records", split: j.split || "auto", remember: true, crossrefOk: !!j.crossrefOk, theme: j.theme || "system", recent: Array.isArray(j.recent) ? j.recent.slice(0, 6) : [] });
    $("src").value = j.src || "";
    return true;
  } catch { return false; }
}
let saveTimer;
const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); };

/* ---------- small UI helpers ---------- */
function toast(msg, ms = 4000, action = null) {
  const t = $("toast"), act = $("toastAct");
  $("toastText").textContent = msg;
  act.hidden = !action;
  act.onclick = null;
  if (action) { act.textContent = action.label; act.onclick = () => { t.hidden = true; action.run(); }; ms = Math.max(ms, 6000); }
  t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms);
}
function setStatus(msg, err = false) { const s = $("srcStatus"); s.textContent = msg; s.classList.toggle("err", err); }
function download(name, data, mime) {
  const blob = new Blob([data], { type: mime + ";charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function copy(text, html) {
  try {
    if (html && window.ClipboardItem && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
    } else await navigator.clipboard.writeText(text);
    toast("Copied.");
  } catch {
    try { await navigator.clipboard.writeText(text); toast("Copied as plain text."); }
    catch { toast("Copying is blocked by the browser. Select the text and copy it manually."); }
  }
}
const fileStem = () => "references-" + new Date().toISOString().slice(0, 10);

/* ---------- convert ---------- */
function convert() {
  let text = $("src").value, section = false;
  if ($("optSection").checked && text.length > 3000) {
    const sec = findReferenceSection(text);
    if (sec) { text = sec; section = true; }
  }
  const parts = splitReferences(text, state.split);
  state.records = parts.map(parseReference);
  state.editing = null;
  renderAll();
  const flagged = state.records.filter((r) => issues(r).length).length;
  if (!parts.length) setStatus("No references found. Each reference needs a year or a DOI. Separate references with blank lines or numbers.", true);
  else {
    const doiOnly = state.records.filter((r) => r.doi && !r.title).length;
    setStatus(`Found ${parts.length} reference${parts.length === 1 ? "" : "s"}${section ? " in the reference section" : ""}.` +
      (doiOnly ? ` ${doiOnly} contain only a DOI: select Check with Crossref to fill in the details.` : flagged ? ` ${flagged} need a check.` : ""));
  }
  save();
}

/* ---------- rendering ---------- */
function renderSteps() {
  const n = state.records.length;
  const flagged = state.records.filter((r) => issues(r).length).length;
  $("metaRecords").textContent = !n ? "No records yet" : flagged ? `${n} records, ${flagged} to check` : `${n} records, all complete`;
  $("tab-records").dataset.state = !n ? "empty" : flagged ? "warn" : "done";
  const s = styleIndex && styleIndex.byId.get(state.styleId);
  $("metaStyle").textContent = s ? shortName(s) : state.styleId;
  $("tab-bib").dataset.state = n ? "ready" : "empty";
  $("metaExport").textContent = EXPORTS[state.exportFmt].label;
  $("tab-export").dataset.state = n ? "ready" : "empty";
  $("dropEmpty").hidden = !!$("src").value.trim();
}
function renderAll() {
  renderSteps();
  renderRecords();
  renderExport();
  scheduleFormat();
}

function plainCite(r) {
  const a = r.authors.map((x) => x.literal || x.family).slice(0, 3).join(", ") + (r.authors.length > 3 ? " et al." : "");
  return esc([a, r.year && `(${r.year})`, r.title, r.container].filter(Boolean).join(". "));
}

function renderSummary() {
  const n = state.records.length;
  const flagged = state.records.filter((r) => issues(r).length).length;
  const cr = state.records.filter((r) => r.source === "crossref").length;
  const pct = n ? Math.round(((n - flagged) / n) * 100) : 0;
  $("summary").innerHTML = n
    ? `<div class="meter" role="img" aria-label="${n - flagged} of ${n} records complete"><span style="width:${pct}%"></span></div>
       <span><b>${n - flagged}</b> of <b>${n}</b> complete</span>${flagged ? `<span class="warn-t"><b>${flagged}</b> to check</span>` : ""}${cr ? `<span><b>${cr}</b> from Crossref</span>` : ""}`
    : "";
  if (typeof renderSteps === "function" && $("metaRecords")) renderSteps();
}

let dupes = new Set();
function findDuplicates() {
  const seen = new Map(); dupes = new Set();
  for (const r of state.records) {
    const keys = [];
    if (r.doi) keys.push("d:" + r.doi.toLowerCase());
    if (r.title) keys.push("t:" + r.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60) + r.year);
    for (const k of keys) { if (seen.has(k)) { dupes.add(r.id); dupes.add(seen.get(k)); } else seen.set(k, r.id); }
  }
}
function chipsFor(r) {
  return `<span class="chip ty" title="${esc(TYPES[r.type] || r.type)}">${esc(risType(r.type))}</span>` +
    (r.source === "crossref" ? `<span class="chip ok">Crossref</span>` : r.source === "edited" ? `<span class="chip">edited</span>` : "") +
    issues(r).map((x) => `<span class="chip warn">${esc(x)}</span>`).join("") +
    (dupes.has(r.id) ? `<span class="chip warn">possible duplicate</span>` : "");
}

function renderRecords() {
  findDuplicates();
  renderSummary();
  const box = $("records");
  if (!state.records.length) {
    box.innerHTML = `<div class="empty"><p><strong>No records yet</strong></p><p>Paste references on the left, then select Convert references.</p><div class="row center"><button class="btn small" type="button" data-example>Load an example</button></div></div>`;
    return;
  }
  const visible = state.records.map((r, i) => [r, i]).filter(([r]) => !state.onlyFlagged || issues(r).length || dupes.has(r.id) || state.editing === r.id);
  if (!visible.length) { box.innerHTML = `<div class="empty"><p><strong>All records look complete</strong></p><p>Untick “Only records to check” to see them all.</p></div>`; return; }
  box.innerHTML = visible.map(([r, i]) => {
    const open = state.editing === r.id;
    const cite = formatted.ok && formatted.byId.has(r.id) ? formatted.byId.get(r.id) : plainCite(r);
    const intext = state.showCites && formatted.cites.get(r.id) ? `<div class="rec-intext">In text: ${formatted.cites.get(r.id)}</div>` : "";
    const bad = issues(r).length || dupes.has(r.id);
    return `<article class="rec ${bad ? "is-warn" : "is-ok"}" data-id="${r.id}">
      <div class="rec-n">${i + 1}</div>
      <div class="rec-main">
        <div class="rec-cite">${cite}</div>${intext}
        <div class="rec-meta"><span class="chips-inline">${chipsFor(r)}</span>
          <div class="rec-actions">
            <button class="btn small" data-act="edit" type="button" aria-expanded="${open}">${open ? "Done" : "Edit"}</button>
            <button class="btn small" data-act="del" type="button" aria-label="Remove record ${i + 1}">Remove</button>
          </div>
        </div>
        ${open ? editForm(r) : ""}
      </div>
    </article>`;
  }).join("");
}

function editForm(r) {
  const id = (k) => `f-${r.id}-${k}`;
  const f = (k, label, wide) => `<label class="${wide ? "wide" : ""}" for="${id(k)}">${label}<input id="${id(k)}" data-k="${k}" value="${esc(r[k])}"></label>`;
  const types = Object.entries(TYPES).map(([k, v]) => `<option value="${k}"${k === r.type ? " selected" : ""}>${v}</option>`).join("");
  return `<div class="edit">
    <label for="${id("type")}">Type<select id="${id("type")}" data-k="type">${types}</select></label>
    ${f("year", "Year")}
    <label class="wide" for="${id("authors")}">Authors (one per line: Family, Given)<textarea id="${id("authors")}" data-k="authors">${esc(r.authors.map(authorToLine).join("\n"))}</textarea></label>
    ${f("title", "Title", true)}
    ${f("container", "Journal, book, proceedings or website", true)}
    ${f("volume", "Volume")}${f("issue", "Issue")}${f("pages", "Pages")}${f("edition", "Edition")}
    ${f("publisher", "Publisher or institution")}${f("place", "Place")}
    <label class="wide" for="${id("editors")}">Editors (one per line)<textarea id="${id("editors")}" data-k="editors">${esc(r.editors.map(authorToLine).join("\n"))}</textarea></label>
    ${f("doi", "DOI")}${f("url", "URL")}
    ${r.raw ? `<p class="raw">Original: ${esc(r.raw)}</p>` : ""}
  </div>`;
}

function updateRecordView(r) {
  const el = document.querySelector(`.rec[data-id="${r.id}"]`);
  if (!el) return;
  el.querySelector(".chips-inline").innerHTML = chipsFor(r);
  el.classList.toggle("is-warn", !!issues(r).length || dupes.has(r.id));
  el.classList.toggle("is-ok", !issues(r).length && !dupes.has(r.id));
  renderSummary();
}

/* ---------- export ---------- */
function exportText() { return EXPORTS[state.exportFmt].fn(state.records, { includeNote: state.note }); }
function renderExport() {
  const ex = EXPORTS[state.exportFmt];
  $("fmtSeg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.fmt === state.exportFmt)));
  $("noteWrap").hidden = state.exportFmt !== "ris";
  $("exportNote").textContent = "Import into: " + ex.note + ".";
  $("dlExport").textContent = `Download .${ex.ext}`;
  if (!state.records.length) { $("exportOut").textContent = "No records to export."; return; }
  const text = exportText();
  $("exportOut").innerHTML = state.exportFmt === "ris"
    ? esc(text).replace(/^([A-Z][A-Z0-9])(  - )/gm, '<span class="t">$1</span>$2')
    : esc(text);
}

/* ---------- bibliography formatting ---------- */
let fmtTimer, fmtGen = 0;
// The citation engine and the style index are large. They load the first time they are
// needed: when the converter comes near the screen, or on the first tap, click or key press.
let engineActive = false;
function activateEngine() {
  if (engineActive) return;
  engineActive = true;
  initStyles();
  scheduleFormat();
}
function watchForEngine() {
  const once = () => activateEngine();
  ["pointerdown", "keydown", "focusin", "touchstart"].forEach((ev) => document.addEventListener(ev, once, { once: true, passive: true, capture: true }));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); activateEngine(); }
    }, { rootMargin: "0px 0px 150px 0px" });
    io.observe(document.getElementById("tool") || document.getElementById("view-records"));
  } else activateEngine();
}
function scheduleFormat() { clearTimeout(fmtTimer); fmtTimer = setTimeout(runFormat, 150); }

async function runFormat() {
  const gen = ++fmtGen;
  const out = $("bibOut");
  if (!state.records.length) {
    out.innerHTML = `<div class="empty">Nothing to format yet.</div>`;
    formatted = { byId: new Map(), cites: new Map(), ok: false };
    return;
  }
  if (!engineActive) {
    out.innerHTML = `<div class="empty">Loading citation styles…</div>`;
    return;
  }
  try {
    const res = await formatBibliography(state.records, { styleId: state.styleId, lang: state.lang, format: "html", citations: true });
    if (gen !== fmtGen) return;
    const byId = new Map();
    const ids = (res.meta.entry_ids || []).map((x) => x[0]);
    res.entries.forEach((html, i) => { if (ids[i]) byId.set(ids[i], html); });
    formatted = { byId, cites: res.citations, ok: true, res };
    out.className = "bib" + (res.meta.hangingindent ? " hang" : "") + (res.meta["second-field-align"] ? " align" : "");
    if (!res.hasBib) {
      out.innerHTML = `<p class="note">This is a note style without a bibliography. The footnote text is shown for each record.</p><div class="csl-bib-body">${res.entries.map((e) => `<div class="csl-entry">${e}</div>`).join("")}</div>`;
    } else {
      let html = res.bibstart + res.entries.join("") + res.bibend;
      if (state.showCites) {
        html = res.bibstart + res.entries.map((e, i) => {
          const span = `<span class="intext">In text: ${res.citations.get(ids[i]) || ""}</span>`;
          return e.includes('class="csl-right-inline"')
            ? e.replace(/(<div class="csl-right-inline">[\s\S]*?)(<\/div>)/, `$1${span}$2`)
            : e.replace(/<\/div>\s*$/, `${span}</div>`);
        }).join("") + res.bibend;
      }
      out.innerHTML = html;
    }
    renderRecords();
  } catch (e) {
    if (gen !== fmtGen) return;
    formatted = { byId: new Map(), cites: new Map(), ok: false };
    out.innerHTML = `<div class="empty">${esc(e.message || "Formatting failed.")}</div>`;
  }
}

async function bibAs(format) {
  const res = await formatBibliography(state.records, { styleId: state.styleId, lang: state.lang, format });
  return res;
}

/* ---------- style picker ---------- */
const FORMAT_LABEL = { "author-date": "author-date", "numeric": "numeric", "note": "note", "author": "author", "label": "label" };
function showStyle() {
  const s = styleIndex && styleIndex.byId.get(state.styleId);
  $("styleName").textContent = s ? s.title : state.styleId;
  $("styleFormat").textContent = s ? (FORMAT_LABEL[s.format] || s.format || "style") : "";
  document.querySelectorAll("#popular button, #recent button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === state.styleId)));
  if ($("metaStyle")) renderSteps();
}
function renderRecent() {
  if (!styleIndex) return;
  const list = state.recent.filter((id) => styleIndex.byId.has(id));
  $("recentWrap").hidden = !list.length;
  $("recent").innerHTML = list.map((id) => `<button type="button" data-id="${esc(id)}" aria-pressed="${id === state.styleId}">${esc(shortName(styleIndex.byId.get(id)))}</button>`).join("");
}
let listItems = [], activeIdx = -1;
function renderStyleList() {
  if (!styleIndex) return;
  const q = $("styleSearch").value.trim();
  const field = $("fieldSel").value;
  $("stylePanel").classList.toggle("searching", !!q);
  listItems = searchStyles(styleIndex, q, field, 100);
  activeIdx = -1;
  $("styleList").innerHTML = listItems.length
    ? listItems.map((s, i) => `<li role="option" id="opt-${i}" data-id="${esc(s.id)}" aria-selected="${s.id === state.styleId}">
        <span class="t">${esc(s.title)}<span class="s">${esc(s.id)}${s.parent ? " · based on " + esc(s.parent) : ""}</span></span>
        <span class="fmt-badge">${esc(s.format || "")}</span></li>`).join("")
    : `<li class="empty" role="option" aria-disabled="true">No style matches “${esc(q)}”.</li>`;
  $("styleMeta").textContent = `${listItems.length === 100 ? "First 100 of many matches. Refine the search." : listItems.length + " matching styles."} ${styleIndex.styles.length.toLocaleString("en")} styles available, updated ${styleIndex.built}.`;
}
function chooseStyle(id) {
  state.styleId = id;
  state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 6);
  showStyle();
  const s = styleIndex && styleIndex.byId.get(id);
  if (s) toast(`Style set to ${s.title}.`, 2500);
  togglePanel(false);
  save();
  scheduleFormat();
}
function togglePanel(open) {
  const dlg = $("stylePanel");
  if (open) {
    if (!dlg.open) dlg.showModal();
    $("styleSearch").value = "";
    renderRecent(); renderStyleList(); $("styleSearch").focus();
  } else if (dlg.open) dlg.close();
}

async function initStyles() {
  try {
    styleIndex = await loadIndex();
    $("styleCount").textContent = (Math.floor(styleIndex.styles.length / 100) * 100).toLocaleString("en") + "+";
    $("buildInfo").textContent = `Styles updated ${styleIndex.built}.`;
    if (!styleIndex.byId.has(state.styleId)) state.styleId = "apa";
    const fields = new Set();
    styleIndex.styles.forEach((s) => s.fields.split(" ").filter(Boolean).forEach((f) => fields.add(f)));
    $("fieldSel").insertAdjacentHTML("beforeend", [...fields].sort().map((f) => `<option value="${f}">${f.replace(/_/g, " ")}</option>`).join(""));
    $("popular").innerHTML = POPULAR.filter((id) => styleIndex.byId.has(id))
      .map((id) => { const s = styleIndex.byId.get(id); return `<button type="button" data-id="${id}" aria-pressed="false">${esc(s.short && s.short.length < 28 ? shortName(s) : shortName(s))}</button>`; }).join("");
    showStyle();
    if ($("stylePanel").open) { renderRecent(); renderStyleList(); }
  } catch (e) {
    $("bibOut").innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
  const locales = await listLocales();
  $("langSel").insertAdjacentHTML("beforeend", locales.map((l) => `<option value="${l.code}">${esc(l.name)}</option>`).join(""));
  $("langSel").value = state.lang;
}
function shortName(s) {
  const map = { "apa": "APA 7", "modern-language-association": "MLA 9", "chicago-author-date": "Chicago author-date", "chicago-notes-bibliography": "Chicago notes", "harvard-cite-them-right": "Harvard", "ieee": "IEEE", "vancouver-nlm": "Vancouver", "american-medical-association": "AMA", "nature": "Nature", "elsevier-harvard": "Elsevier Harvard", "springer-basic-author-date": "Springer", "american-chemical-society": "ACS", "din-1505-2": "DIN 1505-2", "iso690-author-date-en": "ISO 690", "deutsche-gesellschaft-fur-psychologie": "DGPs", "oscola": "OSCOLA" };
  return map[s.id] || s.title;
}

/* ---------- Crossref ---------- */
let crossrefAbort = null;
function askCrossrefConsent() {
  const dlg = $("crossrefDialog");
  if (!dlg || typeof dlg.showModal !== "function") return Promise.resolve(false);
  return new Promise((resolve) => {
    dlg.returnValue = "";
    dlg.addEventListener("close", () => resolve(dlg.returnValue === "ok"), { once: true });
    dlg.showModal();
  });
}
async function runCrossref() {
  const btn = $("crossrefBtn");
  if (crossrefAbort) { crossrefAbort.abort(); return; }
  if (!state.records.length) { toast("Convert some references first."); return; }
  if (!state.crossrefOk) {
    if (!(await askCrossrefConsent())) { toast("Nothing was sent to Crossref."); return; }
    state.crossrefOk = true; save();
  }
  crossrefAbort = new AbortController();
  btn.textContent = "Stop";
  const counts = { updated: 0, matched: 0, nomatch: 0, notfound: 0, error: 0 };
  const list = state.records.slice();
  for (let i = 0; i < list.length; i++) {
    if (crossrefAbort.signal.aborted) break;
    $("crossrefProgress").hidden = false;
    $("crossrefProgress").setAttribute("aria-busy", "true");
    $("crossrefBar").style.width = `${Math.round((i / list.length) * 100)}%`;
    $("crossrefNote").textContent = `Checking ${i + 1} of ${list.length} with Crossref…`;
    try {
      const res = await verifyRecord(list[i], { signal: crossrefAbort.signal });
      counts[res]++;
    } catch (e) {
      if (e.name === "AbortError") break;
      counts.error++;
      if (e.retry) await new Promise((z) => setTimeout(z, 3000));
    }
    renderRecords();
    await new Promise((z) => setTimeout(z, 100));
  }
  crossrefAbort = null;
  btn.textContent = "Check with Crossref";
  const parts = [];
  if (counts.updated) parts.push(`${counts.updated} completed by DOI`);
  if (counts.matched) parts.push(`${counts.matched} matched and DOI added`);
  if (counts.nomatch) parts.push(`${counts.nomatch} without a confident match`);
  if (counts.notfound) parts.push(`${counts.notfound} DOI not found`);
  if (counts.error) parts.push(`${counts.error} could not be checked`);
  $("crossrefBar").style.width = "100%";
  $("crossrefProgress").removeAttribute("aria-busy");
  $("crossrefNote").textContent = parts.length ? "Crossref check finished: " + parts.join(", ") + "." : "Stopped.";
  renderAll();
  save();
}

/* ---------- tabs ---------- */
const TABS = ["records", "bib", "export"];
function selectTab(t, focus = false) {
  state.tab = t;
  TABS.forEach((x) => {
    const tab = $("tab-" + x);
    tab.setAttribute("aria-selected", String(x === t));
    tab.tabIndex = x === t ? 0 : -1;
    $("view-" + x).hidden = x !== t;
  });
  if (focus) $("tab-" + t).focus();
  saveSoon();
}

/* ---------- events ---------- */
function bind() {
  $("parseBtn").addEventListener("click", convert);
  $("exampleBtn").addEventListener("click", () => { $("src").value = PAGE.example === "doi" ? EXAMPLE_DOI : EXAMPLE; convert(); });
  $("src").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); convert(); } });
  $("splitSel").addEventListener("change", () => { state.split = $("splitSel").value; saveSoon(); });
  $("optRemember").addEventListener("change", () => {
    state.remember = $("optRemember").checked;
    if (state.remember) { save(); toast("Your work is now saved in this browser only."); }
    else { try { localStorage.removeItem(KEY); } catch {} state.crossrefOk = false; toast("Saved data deleted from this browser."); }
  });
  $("onlyFlagged").addEventListener("change", () => { state.onlyFlagged = $("onlyFlagged").checked; renderRecords(); });
  const clearAll = () => {
    $("src").value = ""; state.records = []; state.editing = null; $("crossrefProgress").hidden = true;
    fileInfo = null; $("fileChip").hidden = true;
    renderAll(); setStatus(""); save(); $("src").focus();
  };
  $("clearBtn").addEventListener("click", () => {
    const backup = { src: $("src").value, records: state.records, file: fileInfo };
    clearAll();
    toast("Cleared.", 6000, { label: "Undo", run: () => {
      $("src").value = backup.src; state.records = backup.records; fileInfo = backup.file; showFileChip(); renderAll(); save();
    } });
  });
  $("fileChipClear").addEventListener("click", clearAll);
  $("src").addEventListener("input", () => { $("dropEmpty").hidden = !!$("src").value.trim(); saveSoon(); });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-example]")) { $("exampleBtn").click(); } });
  // theme
  const applyTheme = () => {
    if (state.theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = state.theme;
    const label = `Colour theme: ${state.theme}`;
    $("themeBtn").setAttribute("aria-label", label); $("themeBtn").title = label;
    $("themeBtn").dataset.mode = state.theme;
  };
  $("themeBtn").addEventListener("click", () => {
    state.theme = { system: "light", light: "dark", dark: "system" }[state.theme] || "system";
    applyTheme(); save();
  });
  bind.applyTheme = applyTheme;
  // header shadow once the page scrolls
  const bar = document.querySelector(".topbar");
  const onScroll = () => bar.classList.toggle("scrolled", window.scrollY > 4);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  // global shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); selectTab("bib"); togglePanel(true); }
  });

  // file input and drag and drop
  const handleFile = async (file) => {
    if (!file) return;
    setStatus(`Reading ${file.name}…`);
    try {
      const text = await readFile(file, (m) => setStatus(`${file.name}: ${m}`));
      if (!text.trim()) throw new Error(`No text found in ${file.name}. A scanned PDF needs OCR first.`);
      $("src").value = text.trim();
      convert();
      fileInfo = { name: file.name, size: file.size, refs: state.records.length };
      showFileChip();
      setStatus($("srcStatus").textContent, !state.records.length);
    } catch (e) { setStatus(e.message || `Could not read ${file.name}.`, true); }
  };
  $("fileIn").addEventListener("change", (e) => { handleFile(e.target.files[0]); e.target.value = ""; });
  $("fileLabel").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("fileIn").click(); } });
  const dz = $("dropzone");
  dz.addEventListener("dragover", (e) => { if ([...(e.dataTransfer?.types || [])].includes("Files")) { e.preventDefault(); dz.classList.add("over"); } });
  dz.addEventListener("dragleave", (e) => { if (!dz.contains(e.relatedTarget)) dz.classList.remove("over"); });
  dz.addEventListener("drop", (e) => { const f = e.dataTransfer?.files?.[0]; dz.classList.remove("over"); if (f) { e.preventDefault(); handleFile(f); } });

  // records
  $("addBtn").addEventListener("click", () => {
    const r = blankRecord(""); r.source = "edited";
    state.records.push(r); state.editing = r.id; renderAll();
    document.getElementById(`f-${r.id}-title`)?.focus();
  });
  $("crossrefBtn").addEventListener("click", runCrossref);
  $("records").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const id = b.closest(".rec").dataset.id;
    if (b.dataset.act === "edit") {
      state.editing = state.editing === id ? null : id;
      renderRecords();
      if (state.editing) document.getElementById(`f-${id}-title`)?.focus();
      else scheduleFormat();
    } else if (b.dataset.act === "del") {
      const idx = state.records.findIndex((r) => r.id === id);
      const removed = state.records[idx];
      state.records.splice(idx, 1);
      if (state.editing === id) state.editing = null;
      renderAll(); save();
      toast(`Record ${idx + 1} removed.`, 6000, { label: "Undo", run: () => { state.records.splice(idx, 0, removed); renderAll(); save(); } });
    }
  });
  $("records").addEventListener("input", (e) => {
    const k = e.target.dataset.k; if (!k) return;
    const r = state.records.find((x) => x.id === e.target.closest(".rec").dataset.id); if (!r) return;
    if (k === "authors" || k === "editors") r[k] = e.target.value.split("\n").map(lineToAuthor).filter(Boolean);
    else if (k === "pages") r.pages = hyph(e.target.value.trim());
    else r[k] = e.target.value.trim();
    if (k === "authors") r.etal = false;
    if (r.source !== "edited") r.source = "edited";
    updateRecordView(r);
    renderExport();
    saveSoon();
    clearTimeout(bind.t); bind.t = setTimeout(async () => {
      await runFormat();
    }, 600);
  });

  // tabs
  TABS.forEach((t) => $("tab-" + t).addEventListener("click", () => selectTab(t)));
  document.querySelector(".tabs").addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const cur = TABS.indexOf(state.tab);
    const n = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (cur + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    selectTab(TABS[n], true);
  });

  // style picker
  $("styleBtn").addEventListener("click", () => togglePanel(true));
  $("paletteClose").addEventListener("click", () => togglePanel(false));
  $("stylePanel").addEventListener("click", (e) => { if (e.target === $("stylePanel")) togglePanel(false); });
  $("stylePanel").addEventListener("close", () => $("styleBtn").focus());
  $("recent").addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) chooseStyle(b.dataset.id); });
  $("styleSearch").addEventListener("input", renderStyleList);
  $("fieldSel").addEventListener("change", renderStyleList);
  $("styleList").addEventListener("click", (e) => { const li = e.target.closest("li[data-id]"); if (li) chooseStyle(li.dataset.id); });
  $("popular").addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) chooseStyle(b.dataset.id); });
  $("styleSearch").addEventListener("keydown", (e) => {
    const opts = [...$("styleList").querySelectorAll("li[data-id]")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      activeIdx = Math.max(0, Math.min(opts.length - 1, activeIdx + (e.key === "ArrowDown" ? 1 : -1)));
      opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === activeIdx)));
      if (opts[activeIdx]) { opts[activeIdx].scrollIntoView({ block: "nearest" }); $("styleSearch").setAttribute("aria-activedescendant", opts[activeIdx].id); }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = opts[activeIdx >= 0 ? activeIdx : 0]; if (o) chooseStyle(o.dataset.id);
    }
  });
  $("langSel").addEventListener("change", () => { state.lang = $("langSel").value; save(); scheduleFormat(); });
  $("optCites").addEventListener("change", () => { state.showCites = $("optCites").checked; save(); scheduleFormat(); });

  // bibliography output
  $("copyBib").addEventListener("click", async () => {
    if (!state.records.length) return toast("Convert some references first.");
    const res = await bibAs("html");
    const html = wordHtml(res, false);
    const text = (await bibAs("text")).entries.map((e) => e.trim()).join("\n");
    copy(text, html);
  });
  $("dlRtf").addEventListener("click", async () => {
    if (!state.records.length) return toast("Convert some references first.");
    const res = await bibAs("rtf");
    const indent = res.meta.hangingindent ? "\\li720\\fi-720" : "";
    const body = res.entries.map((e) => `\\pard\\sa160\\sl360\\slmult1${indent} ${e.trim()}\\par\n`).join("");
    const rtf = "{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\froman Times New Roman;}}\\f0\\fs24\n" + body + "}";
    download(fileStem() + ".rtf", rtf, "application/rtf");
  });
  $("dlHtml").addEventListener("click", async () => {
    if (!state.records.length) return toast("Convert some references first.");
    download(fileStem() + ".html", wordHtml(await bibAs("html"), true), "text/html");
  });
  $("dlTxt").addEventListener("click", async () => {
    if (!state.records.length) return toast("Convert some references first.");
    const res = await bibAs("text");
    download(fileStem() + ".txt", res.entries.map((e) => e.trim()).join("\r\n") + "\r\n", "text/plain");
  });

  // export
  $("fmtSeg").innerHTML = Object.entries(EXPORTS).map(([k, v]) => `<button type="button" role="radio" data-fmt="${k}" aria-checked="false">${v.label}</button>`).join("");
  $("fmtSeg").addEventListener("click", (e) => { const b = e.target.closest("button[data-fmt]"); if (!b) return; state.exportFmt = b.dataset.fmt; renderExport(); renderSteps(); save(); });
  $("optN1").addEventListener("change", () => { state.note = $("optN1").checked; renderExport(); save(); });
  $("copyExport").addEventListener("click", () => state.records.length ? copy(exportText()) : toast("Convert some references first."));
  $("dlExport").addEventListener("click", () => {
    if (!state.records.length) return toast("Convert some references first.");
    const ex = EXPORTS[state.exportFmt];
    download(`${fileStem()}.${ex.ext}`, exportText(), ex.mime);
  });
}

function entryInner(e) {
  return e.trim().replace(/^<div class="csl-entry">/, "").replace(/<\/div>$/, "")
    .replace(/<div class="csl-left-margin">([\s\S]*?)<\/div>/, "<span>$1</span> ")
    .replace(/<div class="csl-right-inline">([\s\S]*?)<\/div>/, "$1").trim();
}
function wordHtml(res, full) {
  const hang = res.meta.hangingindent ? "padding-left:0.5in;text-indent:-0.5in;" : "";
  const paras = res.entries.map((e) => `<p style="margin:0 0 8pt 0;${hang}">${entryInner(e)}</p>`).join("\n");
  const font = "font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5";
  if (!full) return `<div style="${font}">${paras}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>References</title></head><body style="${font};max-width:46em;margin:2em auto">\n${paras}\n</body></html>`;
}

function showFileChip() {
  if (!fileInfo) { $("fileChip").hidden = true; return; }
  const kb = fileInfo.size > 1048576 ? (fileInfo.size / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(fileInfo.size / 1024)) + " KB";
  $("fileChipText").innerHTML = `<strong>${esc(fileInfo.name)}</strong> <span>${kb}, ${fileInfo.refs} reference${fileInfo.refs === 1 ? "" : "s"} found</span>`;
  $("fileChip").hidden = false;
}

/* ---------- start ---------- */
function start() {
  bind();
  const had = restore();
  // a landing page can preselect a style, tab or export format
  if (PAGE.style) state.styleId = PAGE.style;
  if (PAGE.tab) state.tab = PAGE.tab;
  if (PAGE.exportFmt) state.exportFmt = PAGE.exportFmt;
  $("splitSel").value = state.split;
  $("optRemember").checked = state.remember;
  $("optCites").checked = state.showCites;
  $("optN1").checked = state.note;
  bind.applyTheme();
  selectTab(state.tab);
  if (!had || (!state.records.length && !$("src").value.trim())) {
    $("src").value = PAGE.example === "doi" ? EXAMPLE_DOI : EXAMPLE;
    convert();
    setStatus(PAGE.example === "doi"
      ? "Example DOIs loaded. Select Check with Crossref to fill in the details, or paste your own DOIs."
      : "Example references loaded. Paste your own list or upload a file, then select Convert references.");
  } else {
    renderAll();
    setStatus(state.records.length ? `Restored ${state.records.length} records from your last session.` : "Your last text was restored.");
  }
  watchForEngine();
}
start();
