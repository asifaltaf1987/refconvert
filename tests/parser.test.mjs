import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReference, splitReferences, findReferenceSection, parseAuthors, issues } from "../src/js/parser.js";
import { toRIS, toBibTeX, toCSLJSON } from "../src/js/exporters.js";

test("APA journal article with DOI", () => {
  const r = parseReference("Garfield, E. (1955). Citation indexes for science: A new dimension in documentation through association of ideas. Science, 122(3159), 108–111. https://doi.org/10.1126/science.122.3159.108");
  assert.equal(r.type, "article-journal");
  assert.deepEqual(r.authors, [{ family: "Garfield", given: "E." }]);
  assert.equal(r.year, "1955");
  assert.equal(r.container, "Science");
  assert.equal(r.volume, "122");
  assert.equal(r.issue, "3159");
  assert.equal(r.pages, "108-111");
  assert.equal(r.doi, "10.1126/science.122.3159.108");
  assert.deepEqual(issues(r), []);
});

test("APA with two authors and ampersand", () => {
  const r = parseReference("Smith, J. A., & Doe, R. (2020). Open access in Germany. Journal of Librarianship, 52(3), 45-67.");
  assert.deepEqual(r.authors, [{ family: "Smith", given: "J. A." }, { family: "Doe", given: "R." }]);
  assert.equal(r.container, "Journal of Librarianship");
});

test("Vancouver with et al. and article number", () => {
  const r = parseReference("Page MJ, McKenzie JE, Bossuyt PM, Boutron I, Hoffmann TC, Mulrow CD, et al. The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. BMJ. 2021;372:n71. doi:10.1136/bmj.n71");
  assert.equal(r.authors.length, 6);
  assert.deepEqual(r.authors[0], { family: "Page", given: "MJ" });
  assert.equal(r.title, "The PRISMA 2020 statement: an updated guideline for reporting systematic reviews");
  assert.equal(r.container, "BMJ");
  assert.equal(r.year, "2021");
  assert.equal(r.volume, "372");
  assert.equal(r.pages, "n71");
  assert.ok(r.etal);
});

test("IEEE conference paper", () => {
  const r = parseReference('A. Vaswani et al., "Attention is all you need," in Advances in Neural Information Processing Systems, vol. 30, 2017, pp. 5998–6008.');
  assert.equal(r.type, "paper-conference");
  assert.deepEqual(r.authors[0], { family: "Vaswani", given: "A." });
  assert.equal(r.title, "Attention is all you need");
  assert.equal(r.container, "Advances in Neural Information Processing Systems");
  assert.equal(r.pages, "5998-6008");
});

test("APA book", () => {
  const r = parseReference("Ranganathan, S. R. (1931). The five laws of library science. Madras Library Association.");
  assert.equal(r.type, "book");
  assert.equal(r.publisher, "Madras Library Association");
});

test("APA book chapter with editor", () => {
  const r = parseReference("Altbach, P. G. (2015). Chapter title here. In J. Huisman (Ed.), The handbook of higher education (pp. 12–34). Springer.");
  assert.equal(r.type, "chapter");
  assert.deepEqual(r.editors, [{ family: "Huisman", given: "J." }]);
  assert.equal(r.container, "The handbook of higher education");
  assert.equal(r.pages, "12-34");
  assert.equal(r.publisher, "Springer");
});

test("MLA book", () => {
  const r = parseReference("Borgman, Christine L. Big Data, Little Data, No Data: Scholarship in the Networked World. MIT Press, 2015.");
  assert.equal(r.type, "book");
  assert.equal(r.authors[0].family, "Borgman");
  assert.equal(r.title, "Big Data, Little Data, No Data: Scholarship in the Networked World");
  assert.equal(r.publisher, "MIT Press");
  assert.equal(r.year, "2015");
});

test("Chicago author-date with abbreviated page range", () => {
  const r = parseReference('Bates, Marcia J. 1989. "The Design of Browsing and Berrypicking Techniques for the Online Search Interface." Online Review 13 (5): 407–24. https://doi.org/10.1108/eb024320');
  assert.equal(r.year, "1989");
  assert.equal(r.container, "Online Review");
  assert.equal(r.volume, "13");
  assert.equal(r.issue, "5");
  assert.equal(r.pages, "407-424");
});

test("Book with place and publisher", () => {
  const r = parseReference("Lancaster, F. W. (1998). Indexing and abstracting in theory and practice (2nd ed.). London: Library Association Publishing.");
  assert.equal(r.type, "book");
  assert.equal(r.edition, "2");
  assert.equal(r.place, "London");
  assert.equal(r.publisher, "Library Association Publishing");
});

test("splits numbered lists and wrapped lines", () => {
  const numbered = "[1] Smith J. A title. J Lib. 2020;1(2):3-4.\n[2] Doe R. Another title\ncontinued here. J Inf. 2019;5:6-9.";
  assert.equal(splitReferences(numbered).length, 2);
  const wrapped = "Garfield, E. (1955). Citation indexes for science: A new dimension in\ndocumentation. Science, 122(3159), 108–111.\nRanganathan, S. R. (1931). The five laws of library science. Madras Library\nAssociation.";
  assert.equal(splitReferences(wrapped).length, 2);
});

test("finds the reference section", () => {
  const doc = "Introduction\n" + "Body text. ".repeat(50) + "\nReferences\nSmith, J. (2020). Title. Journal, 1(1), 1-2.\n";
  assert.match(findReferenceSection(doc), /Smith, J\./);
});

test("organisation as author", () => {
  assert.deepEqual(parseAuthors("World Health Organization"), [{ literal: "World Health Organization" }]);
});

test("RIS, BibTeX and CSL-JSON exports", () => {
  const r = parseReference("Smith, J. A., & Doe, R. (2020). Open access in Germany. Journal of Librarianship, 52(3), 45-67. https://doi.org/10.1000/xyz123");
  const ris = toRIS([r]);
  assert.match(ris, /^TY {2}- JOUR\r\n/);
  assert.match(ris, /AU {2}- Smith, J\. A\./);
  assert.match(ris, /SP {2}- 45\r\nEP {2}- 67/);
  assert.match(ris, /DO {2}- 10\.1000\/xyz123/);
  assert.match(ris, /ER {2}- /);
  const bib = toBibTeX([r]);
  assert.match(bib, /^@article\{smith2020open,/);
  assert.match(bib, /pages = \{45--67\}/);
  const csl = JSON.parse(toCSLJSON([r]));
  assert.equal(csl[0].type, "article-journal");
  assert.deepEqual(csl[0].issued, { "date-parts": [[2020]] });
});
