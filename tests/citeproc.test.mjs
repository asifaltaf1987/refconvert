// Checks that parsed records render with citeproc-js and real CSL styles.
// Needs the built dist/ folder (npm run build); skipped when it is missing.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { parseReference, toCSL } from "../src/js/parser.js";

const require = createRequire(import.meta.url);
const CSL = require("citeproc");
const dist = new URL("../dist/csl/", import.meta.url);
const built = fs.existsSync(new URL("styles.json", dist));

function render(styleId, records, lang = "en-US") {
  const idx = JSON.parse(fs.readFileSync(new URL("styles.json", dist), "utf8"));
  const entry = idx.styles.find((s) => s[0] === styleId);
  const xml = fs.readFileSync(new URL(`styles/${entry[4] || styleId}.csl`, dist), "utf8");
  const locale = (l) => fs.readFileSync(new URL(`locales/locales-${l}.xml`, dist), "utf8");
  const items = new Map(records.map((r) => [r.id, toCSL(r)]));
  const engine = new CSL.Engine({ retrieveLocale: (l) => { try { return locale(l); } catch { return locale("en-US"); } }, retrieveItem: (id) => items.get(id) }, xml, lang, true);
  engine.setOutputFormat("text");
  engine.updateItems([...items.keys()]);
  return engine.makeBibliography()[1].map((s) => s.trim());
}

const garfield = () => parseReference("Garfield, E. (1955). Citation indexes for science: A new dimension in documentation through association of ideas. Science, 122(3159), 108–111. https://doi.org/10.1126/science.122.3159.108");

test("APA 7 output", { skip: !built }, () => {
  const [out] = render("apa", [garfield()]);
  assert.equal(out, "Garfield, E. (1955). Citation indexes for science: A new dimension in documentation through association of ideas. Science, 122(3159), 108–111. https://doi.org/10.1126/science.122.3159.108");
});

test("IEEE and Vancouver outputs", { skip: !built }, () => {
  const [ieee] = render("ieee", [garfield()]);
  assert.match(ieee, /E\. Garfield, “Citation indexes for science/);
  const [vanc] = render("vancouver-nlm", [garfield()]);
  assert.match(vanc, /^1\. Garfield E\. Citation indexes for science/);
});

test("German DIN 1505-2 with German locale", { skip: !built }, () => {
  const [din] = render("din-1505-2", [garfield()], "de-DE");
  assert.match(din, /GARFIELD, E/i);
});

test("style index lists independent and dependent styles", { skip: !built }, () => {
  const idx = JSON.parse(fs.readFileSync(new URL("styles.json", dist), "utf8"));
  assert.ok(idx.styles.length > 9000);
  const nature = idx.styles.find((s) => s[0] === "nature");
  assert.ok(nature);
});
