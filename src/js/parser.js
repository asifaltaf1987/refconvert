// Rule-based reference parser.
// Splits free text into single references and parses each one into a record.
// Handles the common patterns of APA, Harvard, Chicago, MLA, IEEE, Vancouver/AMA and ISO 690.
// Pure functions only (no DOM), so the same file runs in the browser and in Node tests.

export const TYPES = {
  "article-journal": "Journal article",
  "book": "Book",
  "chapter": "Book chapter",
  "paper-conference": "Conference paper",
  "thesis": "Thesis",
  "report": "Report",
  "webpage": "Web page",
  "article-newspaper": "Newspaper article",
  "article-magazine": "Magazine article",
  "dataset": "Dataset",
  "document": "Other",
};

let nextId = 1;
export function newId() { return "r" + Date.now().toString(36) + (nextId++).toString(36); }

export function blankRecord(raw = "") {
  return {
    id: newId(), type: "article-journal", authors: [], editors: [], title: "", container: "",
    year: "", volume: "", issue: "", pages: "", publisher: "", place: "", edition: "",
    doi: "", url: "", raw, source: "rules", etal: false,
  };
}

/* ---------- small helpers ---------- */
const tidyEnd = (s) => String(s ?? "").replace(/[\s,;:]+$/, "").trim();
export function stripEndDot(s) {
  s = tidyEnd(s);
  if (/\.$/.test(s) && !/(?:^|[\s.\-])\p{Lu}\.$/u.test(s) && !/\b(ed|eds|Inc|Ltd|Co|Jr|St|al)\.$/i.test(s)) s = s.slice(0, -1);
  return s.trim();
}
export const hyph = (p) => String(p ?? "").replace(/\s*[-–—]+\s*/g, "-");
export function splitPages(p) {
  const m = hyph(p).match(/^([A-Za-z]?\d+[A-Za-z]?)(?:-([A-Za-z]?\d+[A-Za-z]?))?$/);
  if (!m) return { sp: String(p ?? ""), ep: "" };
  let sp = m[1], ep = m[2] || "";
  if (ep && /^\d+$/.test(sp) && /^\d+$/.test(ep) && ep.length < sp.length) ep = sp.slice(0, sp.length - ep.length) + ep;
  return { sp, ep };
}

/* ---------- names ---------- */
const ORG = /\b(organi[sz]ation|association|institute|institut|university|universität|hochschule|council|society|agency|department|ministry|office|commission|committee|group|foundation|bureau|centre|center|library|libraries|board|federation|network|consortium|government|national|international|IFLA|UNESCO|OECD|WHO|NISO|ALA|EU|European)\b/i;
const PARTICLES = /^(van|von|de|der|den|da|del|della|di|du|la|le|ten|ter|bin|al|el|dos|das)$/i;
const INIT_RX = /^(?:\p{Lu}\.?(?:[\s-]*\p{Lu}\.?){0,4})$/u;

function nameFromFirstLast(t) {
  t = t.trim();
  if (ORG.test(t)) return { literal: t };
  if (!/\s/.test(t)) return { family: t, given: "" };
  const parts = t.split(/\s+/);
  let i = parts.length - 1;
  while (i > 1 && PARTICLES.test(parts[i - 1])) i--;
  return { family: parts.slice(i).join(" "), given: parts.slice(0, i).join(" ") };
}

export function parseAuthors(s) {
  if (!s) return [];
  s = String(s).replace(/\bet\s+al\.?/gi, "")
    .replace(/\s*(?:…|\.\.\.)\s*/g, ", ")
    .replace(/\((?:eds?|hrsg|ed|hg|edited by)\.?\)/gi, "")
    .replace(/^\s*(?:edited by|ed\.|eds\.|hrsg\. von)\s+/i, "")
    .replace(/\s*(?:&|\band\b|\bund\b|\bu\.)\s*/g, ", ")
    .replace(/[\s,;]+$/, "").replace(/^[\s,;]+/, "");
  if (/\.$/.test(s) && !/(?:^|[\s.\-])\p{Lu}\.$/u.test(s)) s = s.slice(0, -1).trim();
  if (!s) return [];
  const out = [];
  if (s.includes(";")) {
    for (const t of s.split(/\s*;\s*/).filter(Boolean)) {
      const m = t.match(/^([^,]+),\s*(.+)$/);
      if (m) out.push({ family: m[1].trim(), given: m[2].trim() });
      else out.push(...parseAuthors(t));
    }
    return out;
  }
  const toks = s.split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i], n = toks[i + 1];
    let m;
    if (ORG.test(t) && !(n && INIT_RX.test(n))) { out.push({ literal: t }); continue; }
    if ((m = t.match(/^((?:\p{Lu}\.\s?-?\s?)+)\s*(\p{Lu}[\p{L}'’\- ]+)$/u))) { out.push({ family: m[2].trim(), given: m[1].trim() }); continue; }
    if ((m = t.match(/^([\p{L}'’\- ]+?)\s+(\p{Lu}{1,4})$/u)) && !INIT_RX.test(t)) { out.push({ family: m[1].trim(), given: m[2] }); continue; }
    const nIsGiven = n && (INIT_RX.test(n) ||
      (/^\p{Lu}[\p{Ll}'’\-]+(?:\s+\p{Lu}\.?)*(?:\s+\p{Lu}[\p{Ll}'’\-]+)?$/u.test(n) && !/\s/.test(t) &&
        (i === 0 || (out.length && out[out.length - 1].given && /\p{Ll}/u.test(out[out.length - 1].given) === /\p{Ll}/u.test(n)))));
    if (nIsGiven) { out.push({ family: t, given: n }); i++; continue; }
    if (/\s/.test(t)) { out.push(nameFromFirstLast(t)); continue; }
    out.push({ family: t, given: "" });
  }
  return out;
}

export function authorToLine(a) { return a.literal ? a.literal : a.family + (a.given ? ", " + a.given : ""); }
export function lineToAuthor(l) {
  l = String(l).trim();
  if (!l) return null;
  const m = l.match(/^([^,]+),\s*(.+)$/);
  if (m) return { family: m[1].trim(), given: m[2].trim() };
  if (ORG.test(l)) return { literal: l };
  return /\s/.test(l) ? nameFromFirstLast(l) : { family: l, given: "" };
}

/* ---------- finding and splitting references ---------- */
const HEADING_RX = /^\s*(?:\d+\.?\s*)?(references|reference list|bibliography|works cited|literature cited|cited literature|sources|literaturverzeichnis|literatur|quellenverzeichnis|quellen|bibliographie|références)\s*:?\s*$/gim;
const END_RX = /^\s*(?:appendix|appendices|anhang|supplementary|acknowledg(?:e)?ments|danksagung|author contributions|conflicts? of interest)\b.*$/im;

export function findReferenceSection(text) {
  let last = null, m;
  HEADING_RX.lastIndex = 0;
  while ((m = HEADING_RX.exec(text))) last = m;
  if (!last) return null;
  let after = text.slice(last.index + last[0].length);
  const e = after.match(END_RX);
  if (e && e.index > 200) after = after.slice(0, e.index);
  return after.trim().length > 30 ? after : null;
}

export function splitReferences(text) {
  text = String(text || "").replace(/\r\n?/g, "\n").replace(/­/g, "").replace(/ /g, " ").replace(/\f/g, "\n");
  text = text.replace(/(\p{Ll})-\n(\p{Ll})/gu, "$1$2");
  const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim());
  const numRx = /^(?:\[\d{1,4}\]|\(\d{1,4}\)|\d{1,4}[.)])\s+/;
  const numbered = lines.filter((l) => numRx.test(l)).length;
  const refs = [];
  let cur = null;
  const push = () => { if (cur && cur.trim()) refs.push(cur.trim()); cur = null; };
  if (numbered >= 2) {
    for (const l of lines) {
      if (!l) continue;
      if (numRx.test(l)) { push(); cur = l.replace(numRx, ""); }
      else if (cur !== null) cur += " " + l;
    }
    push();
  } else {
    const startRx = /^(?:\p{Lu}[\p{L}'’\-]+(?:\s(?:van|von|de|der|da|del|di|du|le|la)\s\p{Lu}[\p{L}'’\-]+)?(?:,\s*\p{Lu}|\s+\p{Lu}{1,4}[,.]|\s+\p{Lu}\.)|(?:\p{Lu}\.\s?){1,3}\s?\p{Lu}[\p{Ll}'’\-]+[,\s]|\p{Lu}[\p{Ll}]+(?:\s\p{Lu}[\p{Ll}]+){0,5}\.\s\(?\d{4})/u;
    let prev = "";
    for (const l of lines) {
      if (!l) { push(); prev = ""; continue; }
      if (cur === null) cur = l;
      else if (startRx.test(l) && /[.)\]]$|\d$|\/\S+$/.test(prev)) { push(); cur = l; }
      else cur += " " + l;
      prev = l;
    }
    push();
  }
  return refs
    .map((r) => r.replace(/^[•\-–·*]\s+/, "").replace(/\s+/g, " ").trim())
    .filter((r) => r.length >= 20 && /\b(1[5-9]\d{2}|20\d{2})\b|n\.\s?d\.|o\.\s?J\.|\b10\.\d{4,9}\//.test(r));
}

/* ---------- sentence boundaries that respect initials and abbreviations ---------- */
const ABBR = /(?:^|\s)(?:ed|eds|vol|vols|no|nos|pp|p|ch|chap|rev|trans|Inc|Ltd|Co|Corp|Jr|Sr|St|Dr|Mr|Mrs|Ms|Prof|Dept|Univ|e\.g|i\.e|cf|vs|Bd|Hrsg|Aufl|Nr|Jg|Hg)$/i;
function firstSentenceEnd(s, from = 0) {
  const rx = /([.?!])["”’']?\s+(?=["“‘'(\[]?[\p{Lu}\d])/gu;
  rx.lastIndex = from;
  let m;
  while ((m = rx.exec(s))) {
    const before = s.slice(0, m.index);
    if (m[1] === "." && (/(?:^|[\s(.\-])\p{Lu}$/u.test(before) || ABBR.test(before))) continue;
    return { end: m.index + 1, next: m.index + m[0].length };
  }
  return null;
}
function lastDotSplit(s) { const i = s.lastIndexOf(". "); return i > 0 ? { end: i + 1, next: i + 2 } : null; }
function looksLikeAuthors(a) {
  return /^\p{Lu}[\p{L}'’\-]+,\s*\p{Lu}/u.test(a) || /^(?:\p{Lu}\.\s?)+\s?\p{Lu}/u.test(a) ||
    /^[\p{L}'’\- ]+\s\p{Lu}{1,3}(,|\.)/u.test(a) || ORG.test(a);
}
function vancouverAuthorEnd(head) {
  const rx = /\.\s+/g;
  let m;
  while ((m = rx.exec(head))) {
    const seg = head.slice(0, m.index).split(",").pop().trim();
    if (/^[\p{L}'’\- ]+\s\p{Lu}{1,4}$/u.test(seg) || /et al$/i.test(seg) || ORG.test(seg)) return { end: m.index, next: m.index + m[0].length };
  }
  const f = firstSentenceEnd(head);
  return f || { end: 0, next: 0 };
}

/* ---------- main parser ---------- */
export function parseReference(raw) {
  const r = blankRecord(raw);
  let s = String(raw).replace(/\s+/g, " ").trim();
  let m;

  m = s.match(/(?:https?:\/\/(?:dx\.)?doi\.org\/|\bdoi:?\s*)(10\.\d{4,9}\/\S+)|\b(10\.\d{4,9}\/[^\s,;]+)/i);
  if (m) { r.doi = (m[1] || m[2]).replace(/[.,;)\]>]+$/, ""); s = s.replace(m[0], " "); }
  m = s.match(/(?:\[?(?:Online|Internet)\]?\.?\s*)?(?:Retrieved(?:\s+\w+\s+\d{1,2},\s*\d{4},)?\s+from|Available\s+(?:at|from)|URL|Verfügbar unter)?:?\s*<?(https?:\/\/[^\s>]+)>?/i);
  if (m) { r.url = m[1].replace(/[.,;)\]]+$/, ""); s = s.replace(m[0], " "); }
  s = s.replace(/[\[(]?(?:accessed|cited|retrieved|viewed|abgerufen|zugegriffen)(?:\s+(?:on|am))?:?\s+[^\])]*?\d{4}[\])]?\.?/gi, " ");
  s = s.replace(/\s+/g, " ").replace(/^[\s.,;]+|[\s,;]+$/g, "").trim();

  if (/\b(doctoral dissertation|dissertation|ph\.?\s?d\.? thesis|master'?s thesis|doctoral thesis|thesis|masterarbeit|bachelorarbeit)\b/i.test(s)) r.type = "thesis";

  let authorsPart = "", rest = "";
  if ((m = s.match(/^(.+?)\s*\((\d{4}[a-z]?|n\.\s?d\.|in press|o\.\s?J\.)(?:,\s*[^)]*)?\)\s*[.,:]?\s*(.+)$/i)) && m[1].length < 400 && !/["“]/.test(m[1])) {
    // APA / Harvard: Authors (2020). Title. Source.
    authorsPart = m[1]; r.year = /\d{4}/.test(m[2]) ? m[2].slice(0, 4) : ""; rest = m[3];
    takeTitleAndContainer(r, rest);
  } else if ((m = s.match(/(\d{4})(?:\s+[A-Z][a-z]{2}(?:\s+\d{1,2})?)?\s*;\s*([A-Za-z]?\d+)?\s*(?:\(([^)]+)\))?\s*:\s*([A-Za-z]?\d+[A-Za-z]?(?:\s*[-–—]\s*[A-Za-z]?\d+[A-Za-z]?)?)/))) {
    // Vancouver / AMA: Authors. Title. Journal. 2020;12(3):45-67.
    r.year = m[1]; r.volume = m[2] || ""; r.issue = m[3] || ""; r.pages = hyph(m[4]);
    const head = s.slice(0, m.index);
    const ae = vancouverAuthorEnd(head);
    authorsPart = head.slice(0, ae.end);
    const tail = head.slice(ae.next);
    const t = firstSentenceEnd(tail) || lastDotSplit(tail);
    if (t) { r.title = stripEndDot(tail.slice(0, t.end)); r.container = stripEndDot(tail.slice(t.next)); }
    else r.title = stripEndDot(tail);
    if (r.type !== "thesis") r.type = "article-journal";
  } else if ((m = s.match(/^(.+?[.,)])\s*["“](.+?)[,.?!]?["”]\s*[,.]?\s*(.*)$/)) || (m = s.match(/^(.+?[.,)])\s+[‘'](.{8,}?)[,.?!]?[’']\s*[,.]?\s+(.*)$/))) {
    // Quoted title: IEEE, MLA, Chicago, Harvard
    authorsPart = m[1]; r.title = stripEndDot(m[2]); rest = m[3];
    const y = authorsPart.match(/[.,]?\s*\(?(\d{4})[a-z]?\)?\.?$/);
    if (y) { r.year = y[1]; authorsPart = authorsPart.slice(0, y.index); }
    parseContainer(r, rest);
  } else if ((m = s.match(/^(.{3,300}?)[.,]\s+(\d{4})[a-z]?\.\s+(.+)$/))) {
    // Chicago / ISO 690 author-date: Authors. 2020. Title. Source.
    authorsPart = m[1]; r.year = m[2]; rest = m[3];
    takeTitleAndContainer(r, rest);
  } else {
    // Authors. Title. Source.  (MLA books and others)
    const mla = s.match(/^(\p{Lu}[\p{L}'’\-]+(?:\s\p{Lu}[\p{L}'’\-]+)?,\s*\p{Lu}[\p{Ll}'’\-]+(?:\s+\p{Lu}[\p{Ll}'’\-]+)?(?:\s+\p{Lu}(?=\.))?(?:,\s*(?:and\s+[^.]+|et al))?)\.\s+(.+)$/u);
    if (mla) { authorsPart = mla[1]; rest = mla[2]; }
    else {
      const a = firstSentenceEnd(s);
      if (a) { authorsPart = s.slice(0, a.end); rest = s.slice(a.next); if (!looksLikeAuthors(authorsPart)) { authorsPart = ""; rest = s; } }
      else rest = s;
    }
    takeTitleAndContainer(r, rest);
  }
  r.etal = /\bet\s+al\b/i.test(authorsPart);
  r.authors = parseAuthors(stripEndDot(authorsPart));
  finalize(r);
  return r;
}

function takeTitleAndContainer(r, rest) {
  rest = rest.trim();
  let m;
  if ((m = rest.match(/^["“‘'](.+?)[,.?!]?["”’']\s*[,.]?\s*(.*)$/))) { r.title = stripEndDot(m[1]); parseContainer(r, m[2]); return; }
  if ((m = rest.match(/^(.+?)\s*\[([^\]]*(?:dissertation|thesis)[^\]]*)\]\.?\s*(.*)$/i))) {
    r.title = stripEndDot(m[1]); r.type = "thesis";
    const inst = m[2].split(",").slice(1).join(",").trim();
    if (inst) r.publisher = inst;
    if (m[3]) parseContainer(r, m[3]);
    return;
  }
  const t = firstSentenceEnd(rest);
  if (t) { r.title = stripEndDot(rest.slice(0, t.end)); parseContainer(r, rest.slice(t.next)); }
  else r.title = stripEndDot(rest);
}

const PUB_RX = /\b(press|publish|publications|verlag|books|wiley|springer|elsevier|routledge|sage|emerald|taylor|francis|oxford|cambridge|mit|harvard|mcgraw|pearson|academic|association|libraries unlimited|facet|de gruyter|ala editions|neal-schuman|chandos|university|hanser|beltz|kohlhammer|utb)\b/i;
const YEAR_RX = /(?:^|[\s,(])((?:1[5-9]|20)\d{2})[a-z]?\b(?![-–]\d)/;

function parseContainer(r, c) {
  c = String(c || "").trim().replace(/^[\s,.;]+/, "");
  if (!c) { if (r.type !== "thesis") r.type = r.title ? "book" : "document"; return; }
  let m;
  if ((m = c.match(/\(?\b(\d+)(?:st|nd|rd|th|\.)?\s*(?:ed|edn|edition|Aufl|Auflage)\b\.?\)?[.,]?/i))) { r.edition = m[1]; c = c.replace(m[0], " ").trim(); }
  if (!r.edition && (m = r.title.match(/\s*\((\d+)(?:st|nd|rd|th|\.)\s*(?:ed|Aufl)\.?\)$/i))) { r.edition = m[1]; r.title = r.title.replace(m[0], ""); }

  // Chapter: In Editors (Eds.), Book (pp. x–y). Publisher.
  if ((m = c.match(/^In:?\s+(.+?)\s*\((?:eds?|hrsg|ed|Hg)\.?\)\s*[,:]?\s*(.+)$/i))) {
    r.type = "chapter"; r.editors = parseAuthors(m[1]);
    let tail = m[2], pm;
    if ((pm = tail.match(/\(?\b(?:pp?|S)\.?\s*([A-Za-z]?\d+[A-Za-z]?\s*[-–—]\s*[A-Za-z]?\d+[A-Za-z]?|\d+)\)?/i))) { r.pages = hyph(pm[1]); tail = tail.replace(pm[0], " "); }
    const parts = splitBookTail(tail);
    r.container = parts.title; assignPublisher(r, parts.rest);
    if (!r.year) yearFrom(r, tail);
    return;
  }
  const isIn = /^in:?\s/i.test(c);
  if (isIn) c = c.replace(/^in:?\s+/i, "");
  if ((m = c.match(/,?\s*(?:edited by|ed\. by|hrsg\. von)\s+([^.,]+(?:,\s*[^.,]+)*?)(?=[,.]\s)/i))) { r.editors = parseAuthors(m[1]); c = c.replace(m[0], ""); }

  let firstIdx = c.length;
  const mark = (rx, fn) => { const mm = c.match(rx); if (mm) { fn(mm); if (mm.index < firstIdx) firstIdx = mm.index; } };
  mark(/\b(?:vol|volume|bd|jg|jahrgang)\.?\s*([A-Za-z]?\d+)/i, (mm) => { r.volume = r.volume || mm[1]; });
  mark(/\b(?:no|issue|iss|nr|heft|number)\.?\s*([A-Za-z]?\d+(?:[-\/]\d+)?)/i, (mm) => { r.issue = r.issue || mm[1]; });
  mark(/\b(?:pp|p|s)\.\s*([A-Za-z]?\d+[A-Za-z]?(?:\s*[-–—]\s*[A-Za-z]?\d+[A-Za-z]?)?)/i, (mm) => { r.pages = r.pages || hyph(mm[1]); });
  mark(/\b(?:article|art\.|paper|e)\s*(?:no\.?|number)?\s*([A-Za-z]?\d{2,}[A-Za-z]?)/i, (mm) => { if (!r.pages) r.pages = mm[1]; });
  if (!r.volume) {
    let mm = c.match(/[,\s]\s*([A-Za-z]?\d{1,5})\s*\(([^)]{1,15})\)\s*[,:]?\s*(?:pp?\.?\s*)?([A-Za-z]?\d+[A-Za-z]?(?:\s*[-–—]\s*[A-Za-z]?\d+[A-Za-z]?)?)?/);
    if (mm && !/^(?:19|20)\d{2}$/.test(mm[1])) {
      r.volume = mm[1]; r.issue = r.issue || mm[2]; if (mm[3] && !r.pages) r.pages = hyph(mm[3]);
      if (mm.index < firstIdx) firstIdx = mm.index;
    } else if ((mm = c.match(/,\s*(\d{1,4})\s*,\s*(?:pp?\.?\s*)?(\d+[A-Za-z]?\s*[-–—]\s*\d+[A-Za-z]?)/)) && !/^(?:19|20)\d{2}$/.test(mm[1])) {
      r.volume = mm[1]; if (!r.pages) r.pages = hyph(mm[2]);
      if (mm.index < firstIdx) firstIdx = mm.index;
    }
  }
  if (!r.pages) {
    const mm = c.match(/[,:\s]\s*(\d+[A-Za-z]?\s*[-–—]\s*\d+[A-Za-z]?)\s*\.?$/);
    if (mm) { r.pages = hyph(mm[1]); if (mm.index < firstIdx) firstIdx = mm.index; }
  }
  const ym = c.match(YEAR_RX);
  if (ym && !r.year) r.year = ym[1];
  const hasNumbers = !!(r.volume || r.issue || (r.pages && r.type !== "chapter"));
  let name = c.slice(0, firstIdx);
  if (ym && ym.index < firstIdx && hasNumbers) name = c.slice(0, ym.index);
  name = stripEndDot(name.replace(/[\s,;:(]+$/, ""));

  if (r.type === "thesis") {
    let p = c.replace(/(?:^|[\s,(])((?:1[5-9]|20)\d{2})[a-z]?\)?/, " ")
      .replace(/\b(doctoral dissertation|dissertation|ph\.?\s?d\.? thesis|master'?s thesis|doctoral thesis|thesis|masterarbeit|bachelorarbeit)\b[,.:]?/gi, " ");
    p = stripEndDot(p.replace(/\s+/g, " ").replace(/^[\s,.;:]+/, ""));
    if (p && !r.publisher) r.publisher = p;
    return;
  }
  if (isIn) {
    r.type = /\b(proc|proceedings|conference|conf\.|symposium|workshop|congress|meeting|tagung|advances in)\b/i.test(c) ? "paper-conference" : "chapter";
    if (r.type === "chapter" || !r.volume) {
      const parts = splitBookTail(name);
      r.container = parts.title;
      if (parts.rest) assignPublisher(r, parts.rest);
      else {
        const after = c.slice(firstIdx).replace(/^[^.]*?\.\s*/, "");
        if (after && !/\d/.test(after)) assignPublisher(r, after);
      }
    } else r.container = name;
    return;
  }
  if (hasNumbers) {
    r.type = /\b(proc|proceedings|conference|symposium|workshop|congress)\b/i.test(name) ? "paper-conference" : "article-journal";
    r.container = name;
    return;
  }
  let pubText = c.replace(/(?:^|[\s,(])((?:1[5-9]|20)\d{2})[a-z]?\)?\.?/, " ").replace(/\s+/g, " ").trim();
  pubText = stripEndDot(pubText.replace(/^[\s,.;:]+|[\s,;:]+$/g, ""));
  if (/\b(report|working paper|white paper|technical report|policy brief|bericht)\b/i.test(c + " " + r.title)) r.type = "report";
  else if (r.url && !r.doi && !PUB_RX.test(pubText)) r.type = "webpage";
  else r.type = "book";
  if (r.type === "webpage") r.container = pubText;
  else assignPublisher(r, pubText);
}

function splitBookTail(t) {
  t = t.trim().replace(/^[\s,.;:]+/, "");
  const e = firstSentenceEnd(t);
  if (e) return { title: stripEndDot(t.slice(0, e.end)), rest: t.slice(e.next).trim() };
  const k = t.match(/^(.+?)[,.]\s+([^,.]*?(?:press|verlag|publish\w*|books|wiley|springer|elsevier|routledge|sage|emerald|ieee|acm)[^,.]*)\.?$/i);
  if (k) return { title: stripEndDot(k[1]), rest: k[2] };
  return { title: stripEndDot(t), rest: "" };
}
function assignPublisher(r, t) {
  t = String(t || "").replace(/(?:^|[\s,(])((?:1[5-9]|20)\d{2})[a-z]?\)?\.?/, (mm) => { if (!r.year) r.year = mm.match(/\d{4}/)[0]; return " "; });
  t = stripEndDot(t.replace(/\s+/g, " ").replace(/^[\s,.;:]+|[\s,;:]+$/g, ""));
  if (!t) return;
  const m = t.match(/^([^:\d]{2,40}):\s*(.+)$/);
  if (m) { r.place = m[1].trim(); r.publisher = stripEndDot(m[2]); }
  else r.publisher = t;
}
function yearFrom(r, t) { const y = String(t).match(/\b((?:1[5-9]|20)\d{2})\b/); if (y) r.year = y[1]; }

function finalize(r) {
  r.title = r.title.replace(/^["“‘']|["”’']$/g, "").replace(/\s+/g, " ").trim();
  r.container = (r.container || "").replace(/^["“]|["”]$/g, "").trim();
  if (!r.year) yearFrom(r, r.raw);
  if (r.type === "article-journal" && !r.container && !r.volume && !r.pages) r.type = r.publisher ? "book" : r.url ? "webpage" : "document";
  if (r.doi && r.url && /doi\.org/i.test(r.url)) r.url = "";
  if (r.pages) { const { sp, ep } = splitPages(r.pages); if (ep) r.pages = sp + "-" + ep; }
}

/* ---------- quality checks ---------- */
export function issues(r) {
  const w = [];
  if (!r.authors.length) w.push("no author");
  else if (r.etal && r.source !== "crossref") w.push("author list shortened (et al.)");
  if (!r.title) w.push("no title");
  if (!r.year) w.push("no year");
  if (["article-journal", "chapter", "paper-conference"].includes(r.type) && !r.container) w.push(r.type === "article-journal" ? "no journal" : "no book or proceedings title");
  if (r.type === "article-journal" && !r.volume && !r.pages && !r.doi) w.push("no volume or pages");
  if (r.title && r.title.length > 300) w.push("title looks too long");
  return w;
}

/* ---------- conversion to CSL-JSON (for citeproc-js and export) ---------- */
export function toCSL(r) {
  const people = (list) => list.map((a) => (a.literal ? { literal: a.literal } : { family: a.family, given: a.given || undefined }));
  const item = { id: r.id, type: TYPES[r.type] ? r.type : "document" };
  if (r.authors.length) item.author = people(r.authors);
  if (r.editors.length) item.editor = people(r.editors);
  if (r.title) item.title = r.title;
  if (r.container) item["container-title"] = r.container;
  if (r.year) item.issued = { "date-parts": [[Number(r.year)]] };
  if (r.volume) item.volume = r.volume;
  if (r.issue) item.issue = r.issue;
  if (r.pages) item.page = r.pages;
  if (r.publisher) item.publisher = r.publisher;
  if (r.place) item["publisher-place"] = r.place;
  if (r.edition) item.edition = r.edition;
  if (r.doi) item.DOI = r.doi;
  if (r.url) item.URL = r.url;
  if (r.type === "thesis" && r.publisher && !item.genre) item.genre = "Thesis";
  return item;
}
