// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Asif Altaf
// Content for the generated landing pages (SEO). Edit text here; the build turns it into pages.

export const STYLE_PAGES = [
  // [style id, URL slug, short name, who uses it]
  ["apa", "apa", "APA 7th edition", "psychology, education, nursing and the social sciences"],
  ["modern-language-association", "mla", "MLA 9th edition", "literature, languages and the humanities"],
  ["chicago-author-date", "chicago-author-date", "Chicago author-date", "the social and natural sciences"],
  ["chicago-notes-bibliography", "chicago-notes-bibliography", "Chicago notes and bibliography", "history, the arts and the humanities"],
  ["harvard-cite-them-right", "harvard", "Harvard (Cite Them Right)", "many UK, Irish and Australian universities"],
  ["ieee", "ieee", "IEEE", "engineering, electronics and computer science"],
  ["vancouver-nlm", "vancouver", "Vancouver", "medicine, dentistry and the health sciences"],
  ["american-medical-association", "ama", "AMA 11th edition", "medicine and medical journals"],
  ["nature", "nature", "Nature", "the journal Nature and many natural science journals"],
  ["science", "science", "Science", "the journal Science"],
  ["cell", "cell", "Cell", "Cell Press journals and the life sciences"],
  ["american-chemical-society", "acs", "ACS", "chemistry and chemical engineering"],
  ["american-sociological-association", "asa", "ASA", "sociology"],
  ["american-political-science-association", "apsa", "APSA", "political science"],
  ["apa-6th-edition", "apa-6", "APA 6th edition", "older theses and journals that have not moved to APA 7"],
  ["elsevier-harvard", "elsevier-harvard", "Elsevier Harvard", "many Elsevier journals"],
  ["elsevier-vancouver", "elsevier-vancouver", "Elsevier Vancouver", "Elsevier journals with numbered references"],
  ["springer-basic-author-date", "springer", "Springer basic (author-date)", "many Springer journals and books"],
  ["taylor-and-francis-chicago-author-date", "taylor-and-francis", "Taylor & Francis (Chicago author-date)", "Taylor & Francis journals"],
  ["sage-harvard", "sage-harvard", "SAGE Harvard", "SAGE journals"],
  ["emerald-harvard", "emerald-harvard", "Emerald Harvard", "Emerald journals, including many library and information science titles"],
  ["frontiers", "frontiers", "Frontiers", "Frontiers journals"],
  ["plos", "plos", "PLOS", "PLOS journals"],
  ["the-lancet", "lancet", "The Lancet", "The Lancet family of journals"],
  ["bmj", "bmj", "BMJ", "BMJ journals"],
  ["pnas", "pnas", "PNAS", "Proceedings of the National Academy of Sciences"],
  ["american-institute-of-physics", "aip", "AIP", "physics journals"],
  ["association-for-computing-machinery", "acm", "ACM", "computer science publications of the ACM"],
  ["oscola", "oscola", "OSCOLA", "law in the UK"],
  ["bluebook-law-review", "bluebook", "Bluebook", "law reviews in the United States"],
  ["turabian-author-date", "turabian", "Turabian author-date", "student papers and theses in the United States"],
  ["din-1505-2", "din-1505-2", "DIN 1505-2", "German theses and publications (now superseded by ISO 690)"],
  ["iso690-author-date-en", "iso-690", "ISO 690 (author-date)", "international and European institutions"],
  ["iso690-numeric-en", "iso-690-numeric", "ISO 690 (numeric)", "international publications with numbered references"],
  ["deutsche-gesellschaft-fur-psychologie", "dgps", "DGPs (Deutsche Gesellschaft für Psychologie)", "psychology in German-speaking countries"],
];

export const FOOTER_STYLES = ["apa", "mla", "harvard", "ieee", "vancouver", "chicago-author-date"];

export const GENERAL_FAQ = [
  ["Is it free?", "Yes. You can convert and format as many references as you like without an account."],
  ["Are my references uploaded anywhere?", "No. Text and files are processed in your browser. Only the optional Check with Crossref button sends DOIs or reference text to the Crossref API to complete records."],
  ["Which reference managers can import the files?", "RIS files import into Zotero, EndNote, Mendeley, Citavi, RefWorks, JabRef and most library systems. BibTeX works with LaTeX, Overleaf and JabRef. CSL-JSON works with Zotero and Pandoc."],
  ["Which citation styles are available?", "All styles of the official Citation Style Language repository: more than 10,800, including APA, MLA, Chicago, Harvard, IEEE, Vancouver, AMA, ISO 690, DIN 1505-2 and thousands of journal styles."],
  ["Can it read references from a PDF or Word file?", "Yes. Upload a PDF, DOCX, RTF or TXT file. The tool extracts the text, finds the reference section and splits it into single references. Scanned PDFs without a text layer need OCR first."],
  ["How accurate is the parsing?", "The parser recognises the common patterns of APA, Harvard, Chicago, MLA, IEEE, Vancouver, AMA and ISO 690. Records with missing data are marked so you can check them. Check with Crossref completes records that have a DOI."],
  ["Can I paste a list of DOIs?", "Yes. Paste one DOI per line, convert, then select Check with Crossref to fill in all details."],
  ["Does it work offline or on my institution's server?", "The site is static and open source, so a library or IT department can host its own copy."],
];

export const TASK_PAGES = [
  {
    slug: "convert-references-to-ris",
    crumb: "References to RIS",
    title: "Convert References to RIS Online (Free)",
    h1: "Convert references to RIS",
    eyebrow: "Text to RIS converter",
    lede: "Paste a reference list in any citation style and download an RIS file for Zotero, EndNote, Mendeley or Citavi.",
    description: "Free online converter from plain-text references to RIS. Paste a bibliography or upload a PDF, check the records and download an RIS file for Zotero, EndNote, Mendeley or Citavi.",
    preset: { tab: "export", exportFmt: "ris" },
    body: `<h2>What is an RIS file?</h2>
<p>RIS is a plain-text format for bibliographic records. Each reference starts with <code>TY</code> (the item type) and ends with <code>ER</code>, with one tagged field per line, such as <code>AU</code> for authors, <code>TI</code> for the title and <code>DO</code> for the DOI. Almost every reference manager can import it.</p>
<h2>How to import the RIS file</h2>
<ul>
<li><strong>Zotero:</strong> File → Import, choose the .ris file.</li>
<li><strong>EndNote:</strong> File → Import → File, set Import Option to Reference Manager (RIS).</li>
<li><strong>Mendeley:</strong> File → Import → RIS.</li>
<li><strong>Citavi:</strong> File → Import, choose RIS as the format.</li>
</ul>`,
    faq: [
      ["Why convert references to RIS?", "Typing references into a reference manager by hand is slow and error-prone. Converting a finished reference list to RIS lets you import all items at once and reuse them in Word with any citation style."],
      ["Does the RIS file keep the original text?", "By default each record includes the original reference as a note (N1), so you can check the import. You can switch this off in the Export tab."],
    ],
  },
  {
    slug: "convert-references-to-bibtex",
    crumb: "References to BibTeX",
    title: "Convert References to BibTeX Online (Free)",
    h1: "Convert references to BibTeX",
    eyebrow: "Text to BibTeX converter",
    lede: "Turn a reference list from a paper or thesis into BibTeX entries for LaTeX, Overleaf or JabRef.",
    description: "Free online converter from plain-text references to BibTeX. Paste a bibliography or upload a PDF and download a .bib file for LaTeX, Overleaf or JabRef.",
    preset: { tab: "export", exportFmt: "bibtex" },
    body: `<h2>Using the .bib file</h2>
<p>Upload the downloaded <code>.bib</code> file to your Overleaf project or place it next to your <code>.tex</code> file, then cite entries with <code>\\cite{key}</code>. Keys are built from the first author, the year and the first word of the title, for example <code>garfield1955citation</code>.</p>
<p>Special characters such as <code>&amp;</code>, <code>%</code> and <code>_</code> are escaped for LaTeX. Page ranges use a double hyphen.</p>`,
    faq: [
      ["Which entry types are used?", "Journal articles become @article, books @book, chapters @incollection, conference papers @inproceedings, theses @phdthesis and reports @techreport."],
    ],
  },
  {
    slug: "extract-references-from-pdf",
    crumb: "References from PDF",
    title: "Extract References from a PDF Online (Free)",
    h1: "Extract references from a PDF",
    eyebrow: "PDF reference extractor",
    lede: "Upload a paper as PDF or Word file. The tool finds the reference list, splits it into single references and lets you export or reformat them.",
    description: "Extract the reference list from a PDF or Word document in your browser. Get structured records, export RIS or BibTeX, or reformat them in any citation style.",
    preset: { tab: "records" },
    body: `<h2>Tips for good results</h2>
<ul>
<li>The PDF needs a text layer. If you cannot select text in the PDF, run OCR first.</li>
<li>Keep "Find the reference section in long documents" switched on. The tool then reads only the text after a heading such as References, Bibliography or Literaturverzeichnis.</li>
<li>Two-column layouts are supported, but check records marked in orange.</li>
</ul>`,
    faq: [
      ["Is the PDF uploaded to a server?", "No. The PDF is read in your browser with pdf.js. It never leaves your device."],
    ],
  },
  {
    slug: "doi-to-citation",
    crumb: "DOI to citation",
    title: "DOI to Citation Converter: APA, MLA, Harvard and More",
    h1: "Convert DOIs to citations",
    eyebrow: "DOI to citation",
    lede: "Paste one or many DOIs, complete them from Crossref and format them in any citation style or export them as RIS or BibTeX.",
    description: "Convert a list of DOIs into formatted citations in APA, MLA, Harvard, IEEE, Vancouver or 10,000+ other styles, or export them as RIS and BibTeX.",
    preset: { tab: "records", example: "doi" },
    body: `<h2>How to convert DOIs</h2>
<ol>
<li>Paste one DOI per line. Links such as https://doi.org/10.… work too.</li>
<li>Select Convert references, then Check with Crossref. The tool fills in authors, title, journal, year, volume, issue and pages.</li>
<li>Open Format to choose a citation style, or Export to download RIS or BibTeX.</li>
</ol>`,
    faq: [
      ["Where does the data come from?", "From the Crossref REST API, the registration agency for most scholarly DOIs. Only the DOIs are sent."],
    ],
  },
];

const HOSTS = {
  github: {
    name: "GitHub Pages",
    who: "GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA",
    policy: "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
  },
  cloudflare: {
    name: "Cloudflare Pages",
    who: "Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, USA",
    policy: "https://www.cloudflare.com/privacypolicy/",
  },
};

export function authorLinks(cfg) {
  const a = cfg.author || {};
  return [
    ["Website", a.website], ["LinkedIn", a.linkedin], ["ORCID", a.orcid], ["Google Scholar", a.googleScholar], ["GitHub", a.github],
  ].filter(([, u]) => u);
}

export function aboutBody(cfg) {
  const a = cfg.author || {};
  const links = authorLinks(cfg).map(([l, u]) => `<a href="${u}" rel="noopener me">${l}</a>`).join(" · ");
  return `<p>${cfg.siteName} converts reference lists into structured records, exports them as RIS, BibTeX or CSL-JSON, and formats them in any of the more than 10,800 styles of the Citation Style Language project.</p>
<figure class="video-square">
  <video controls preload="none" playsinline width="1080" height="1080" poster="../media/refconvert-intro-poster.jpg" aria-describedby="introCap">
    <source src="../media/refconvert-intro.mp4" type="video/mp4">
    <a href="../media/refconvert-intro.mp4">Download the intro video (MP4, 1.5 MB)</a>
  </video>
  <figcaption id="introCap">30-second introduction. For a step-by-step walkthrough, watch the <a href="../#how">one-minute tutorial</a>.</figcaption>
</figure>
${a.name ? `<h2>Who built it</h2>
<p>${cfg.siteName} is designed and maintained by <strong>${a.name}</strong>${a.role ? `, ${a.role.charAt(0).toLowerCase() + a.role.slice(1)}` : ""}. It grew out of years of helping students and researchers move reference lists into reference managers.</p>
${links ? `<p>${links}</p>` : ""}
<p>${cfg.siteName} is a personal, independent project. It is not affiliated with, endorsed by or operated on behalf of any employer, university or library.</p>` : ""}
${cfg.doi ? `<h2 id="cite">Cite ${cfg.siteName}</h2>
<p>If ${cfg.siteName} helped your research or teaching, please cite it:</p>
<p class="cite-box">${(cfg.author && cfg.author.name ? cfg.author.name.replace(/^Dr\.?\s+/, "").split(" ").reverse().join(", ").replace(/, (\S)\S*$/, ", $1.") : cfg.siteName)} (${new Date().getFullYear()}). <em>${cfg.siteName}: Reference converter and citation generator</em> [Computer software]. Zenodo. <a href="https://doi.org/${cfg.doi}" rel="noopener">https://doi.org/${cfg.doi}</a></p>
<p>The software is archived on <a href="https://doi.org/${cfg.doi}" rel="noopener">Zenodo</a>${cfg.repoUrl ? `, and GitHub's “Cite this repository” button on the <a href="${cfg.repoUrl}" rel="noopener">repository page</a> gives the citation in APA and BibTeX` : ""}.</p>` : ""}
<h2>Why it exists</h2>
<p>Researchers, students and librarians often have a finished reference list but not the records behind it: in a PDF, a Word file or an e-mail. Retyping them into a reference manager takes time. ${cfg.siteName} turns that list back into data in a few seconds, without an account and without sending your text to a server.</p>
<h2>How it works</h2>
<p>A rule-based parser recognises the common patterns of APA, Harvard, Chicago, MLA, IEEE, Vancouver, AMA and ISO 690 references. Formatting uses citeproc-js, the citation processor behind Zotero, with the official CSL styles and locales. The optional Crossref check completes records from the Crossref REST API.</p>
<h2>Trademarks</h2>
<p>APA, MLA, Chicago Manual of Style, IEEE, AMA, Vancouver, Harvard, ISO, DIN, Zotero, EndNote, Mendeley, Citavi, Crossref and all journal and publisher names are trademarks or names of their respective owners. They are used only to describe compatibility. ${cfg.siteName} is not affiliated with or endorsed by any of them.</p>
<h2>Open-source components</h2>
<p>${cfg.siteName} is free software under the GNU AGPL v3.0 or later${cfg.repoUrl ? `, with its <a href="${cfg.repoUrl}" rel="noopener">source code on GitHub</a>` : ""}. It is built on open-source software and openly licensed data. See <a href="../licenses/">Licences</a> for the full list and licence texts.</p>
${cfg.contactEmail ? `<h2>Contact</h2><p>Questions, errors or ideas: <a href="mailto:${cfg.contactEmail}">${cfg.contactEmail}</a>${cfg.repoUrl ? `, or open an issue on <a href="${cfg.repoUrl}/issues" rel="noopener">GitHub</a>` : ""}.</p>` : ""}`;
}

export function privacyBody(cfg) {
  const ads = cfg.ads.enabled && cfg.ads.adsenseClient;
  const cf = cfg.analytics.cloudflareBeaconToken;
  const host = HOSTS[cfg.host] || HOSTS.github;
  const i = cfg.imprint;
  const contact = i.name && i.street && i.city && i.email
    ? `${i.name}<br>${i.street}<br>${i.city}<br>${i.country}<br>E-mail: <a href="mailto:${i.email}">${i.email}</a>`
    : "[Name, postal address and e-mail: fill in site.config.json → imprint]";
  let n = 0;
  const h = (t) => `<h2>${++n}. ${t}</h2>`;
  return `<p>Last updated: ${new Date().toISOString().slice(0, 10)}</p>
<p>This policy explains which personal data is processed when you use ${cfg.siteName}, why, and what rights you have under the EU General Data Protection Regulation (GDPR) and the German Telecommunications Digital Services Data Protection Act (TDDDG).</p>
${h("Controller")}
<p>${contact}</p>
<p>A data protection officer is not required and has not been appointed.</p>
${h("Your references and files")}
<p>Text you paste and files you upload are processed only in your browser on your own device. They are not transmitted to the operator or to any server, and the operator has no access to them.</p>
${h("Storage on your device")}
<p>By default nothing is stored on your device. If you tick <em>Remember my work in this browser</em>, your text, records and settings are saved in your browser's local storage so they are still there when you return. This data never leaves your device. Legal basis: your consent, § 25(1) TDDDG and Art. 6(1)(a) GDPR. You withdraw consent by unticking the box, which deletes the stored data, or by clearing your browser data.</p>
${h("Hosting and server log files")}
<p>The website is hosted on ${host.name} by ${host.who}. When you open a page, the host processes technical data that your browser sends automatically: IP address, date and time, page requested, referrer and browser type. This is necessary to deliver the website and protect it against attacks. Legal basis: Art. 6(1)(f) GDPR, our legitimate interest in a secure and working website. The operator has no access to these logs. Data may be processed in the USA. The provider states that it participates in the EU-U.S. Data Privacy Framework (Art. 45 GDPR); its status can be checked at <a href="https://www.dataprivacyframework.gov/list" rel="noopener">dataprivacyframework.gov</a>. Details: <a href="${host.policy}" rel="noopener">${host.name} privacy statement</a>.</p>
${h("Crossref check (optional)")}
<p>Only when you select <em>Check with Crossref</em> and confirm the notice that appears, the DOIs of your records, or for records without a DOI the reference text, are sent from your browser to the Crossref REST API, operated by Crossref (Publishers International Linking Association, Inc.), USA. Crossref receives your IP address as part of the request. Reference lists usually contain no personal data about you, but they contain the names of authors. Legal basis: your consent, Art. 6(1)(a) GDPR. Because Crossref is in the USA, the transfer is based on your explicit consent after being informed of possible risks, Art. 49(1)(a) GDPR: the USA may not offer a level of data protection equivalent to the EU. You can use ${cfg.siteName} fully without this feature. Crossref's privacy policy: <a href="https://www.crossref.org/operations-and-sustainability/privacy/" rel="noopener">crossref.org</a>.</p>
${cf ? `${h("Web analytics")}
<p>We count visits with Cloudflare Web Analytics (Cloudflare, Inc., USA). It sets no cookies, stores nothing on your device and does not build user profiles across websites. It processes your IP address briefly to count a visit. Legal basis: Art. 6(1)(f) GDPR, our interest in knowing how the site is used. Cloudflare states that it participates in the EU-U.S. Data Privacy Framework.</p>` : ""}
${ads ? `${h("Advertising (Google AdSense)")}
<p>This site shows ads from Google AdSense, Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. Google uses cookies and similar technologies to show ads, limit how often you see them, measure them and, with your consent, personalise them. Data may be transferred to Google LLC in the USA, which participates in the EU-U.S. Data Privacy Framework. Ads are loaded only after you choose in the consent banner, which is provided through a Google-certified consent management platform. Legal basis: § 25(1) TDDDG and Art. 6(1)(a) GDPR. You can change or withdraw your choice at any time with the privacy settings link shown at the bottom of the page. More: <a href="https://policies.google.com/technologies/ads" rel="noopener">how Google uses information from sites that use its services</a>.</p>` : ""}
${h("Fonts and other external content")}
<p>All fonts and program libraries are served from this website. No content is loaded from Google Fonts or other third-party servers${ads ? ", except the advertising described above" : ""}.</p>
${h("Your rights")}
<p>You have the right to access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and to object to processing based on legitimate interests (Art. 21). You can withdraw consent at any time with effect for the future (Art. 7(3)). Contact the controller at the address above.</p>
<p>You also have the right to lodge a complaint with a data protection supervisory authority (Art. 77 GDPR), in particular in the EU member state of your residence. For the operator, the competent authority is the Sächsische Datenschutz- und Transparenzbeauftragte, Dresden, Germany.</p>
${h("No automated decisions")}
<p>No automated decision-making or profiling within the meaning of Art. 22 GDPR takes place.</p>`;
}

export function termsBody(cfg) {
  const i = cfg.imprint;
  return `<p>Last updated: ${new Date().toISOString().slice(0, 10)}</p>
<h2>1. The service</h2>
<p>${cfg.siteName} is a free tool, provided by ${i.name || "the operator named in the imprint"}, that converts and formats bibliographic references in your browser. There is no account, no subscription and no payment. You may use it for private, academic and professional purposes.</p>
<h2>2. Check every result</h2>
<p>Reference parsing and formatting are automated and can be wrong or incomplete. Results are suggestions. You are responsible for checking references, citations and exports before you use them in theses, publications, grant applications or any other work. ${cfg.siteName} does not replace the style guide of your institution, publisher or journal.</p>
<h2>3. Your content</h2>
<p>Text and files you enter remain yours. They are processed in your browser and are not sent to the operator. Only enter content you are allowed to use. Do not use the service for unlawful purposes or try to disrupt it, for example with automated mass requests.</p>
<h2>4. Third-party services and styles</h2>
<p>The optional Crossref check uses the Crossref REST API, which is subject to Crossref's own terms. Citation styles come from the Citation Style Language project and are used under the Creative Commons Attribution-ShareAlike 3.0 licence. Style, publisher and software names are trademarks of their owners and are used only to describe compatibility.</p>
<h2>5. Availability</h2>
<p>The service is provided free of charge and without guarantee of availability. Features may change or be discontinued at any time.</p>
<h2>6. Liability</h2>
<p>The service is provided free of charge. The operator is liable without limitation for intent and gross negligence, for injury to life, body or health, and under the German Product Liability Act. In all other cases, liability for slight negligence is excluded, as far as legally permitted. In particular, the operator is not liable for incorrect references, lost data or consequences of using the results without checking them.</p>
<h2>7. Links</h2>
<p>This site links to external websites. Their operators are solely responsible for their content.</p>
<h2>8. Applicable law</h2>
<p>German law applies. If you are a consumer, mandatory consumer protection rules of the country where you live remain unaffected.</p>`;
}

export function imprintBody(cfg) {
  const i = cfg.imprint;
  const filled = i.name && i.street && i.city && i.email;
  return `<h2>Angaben gemäß § 5 DDG · Information according to § 5 DDG</h2>
<p>${filled ? `${i.name}<br>${i.street}<br>${i.city}<br>${i.country}` : `${i.name || "[Name]"}<br>[Street and number]<br>[Postcode and city]<br>${i.country || "[Country]"}`}</p>
<h2>Kontakt · Contact</h2>
<p>E-Mail: ${i.email ? `<a href="mailto:${i.email}">${i.email}</a>` : "[E-mail address]"}</p>
<h2>Verantwortlich für den Inhalt · Responsible for the content</h2>
<p>${i.name || "[Name]"}, address as above.</p>
<h2>Privates Projekt · Private project</h2>
<p>${cfg.siteName} ist ein privates, nicht-kommerzielles Projekt und steht in keiner Verbindung zu einem Arbeitgeber, einer Hochschule oder Bibliothek. ${cfg.siteName} is a private, non-commercial project and is not affiliated with any employer, university or library.</p>
<h2>Haftung für Links · Liability for links</h2>
<p>Diese Website enthält Links zu externen Websites, auf deren Inhalte kein Einfluss besteht. Für diese Inhalte ist der jeweilige Anbieter verantwortlich. This website contains links to external websites; their operators are solely responsible for their content.</p>`;
}

export function licensesBody(cfg, texts) {
  const row = (name, by, lic, url, how) => `<tr><td><a href="${url}" rel="noopener">${name}</a></td><td>${by}</td><td>${lic}</td><td>${how}</td></tr>`;
  return `<p>${cfg.siteName} is built on the following open-source software and openly licensed data. Thank you to their authors.</p>
<div class="table-wrap"><table>
<thead><tr><th>Component</th><th>Author</th><th>Licence</th><th>Use</th></tr></thead>
<tbody>
${row("citeproc-js", "Frank Bennett", "CPAL-1.0 or AGPL-3.0 (used under CPAL-1.0)", "https://github.com/Juris-M/citeproc-js", "Citation formatting, unmodified")}
${row("CSL styles", "Citation Style Language project and contributors", "CC BY-SA 3.0", "https://github.com/citation-style-language/styles", "Citation styles, unmodified")}
${row("CSL locales", "Citation Style Language project and contributors", "CC BY-SA 3.0", "https://github.com/citation-style-language/locales", "Language terms, unmodified")}
${row("pdf.js", "Mozilla Foundation", "Apache-2.0", "https://github.com/mozilla/pdf.js", "Reading PDF files")}
${row("mammoth.js", "Michael Williamson", "BSD-2-Clause", "https://github.com/mwilliamson/mammoth.js", "Reading Word files")}
${row("Literata", "TypeTogether for Google", "SIL OFL 1.1", "https://github.com/googlefonts/literata", "Typeface")}
${row("IBM Plex", "IBM", "SIL OFL 1.1", "https://github.com/IBM/plex", "Typeface")}
</tbody></table></div>
<p>Bibliographic data from the optional Crossref check is provided by <a href="https://www.crossref.org" rel="noopener">Crossref</a>; Crossref makes its metadata available without restriction.</p>
<h2>${cfg.siteName} source code</h2>
<p>${cfg.siteName} is free software, copyright © ${new Date().getFullYear()} ${(cfg.author && cfg.author.name) || "the author"}, released under the <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noopener">GNU Affero General Public License v3.0 or later</a>. You may use, study, share and change it. If you run a modified version as a website, you must publish its complete source code under the same licence.${cfg.repoUrl ? ` The source code of this website is available at <a href="${cfg.repoUrl}" rel="noopener">${cfg.repoUrl.replace(/^https?:\/\//, "")}</a>.` : ""}</p>
<h2>Licence texts</h2>
${texts.map(([name, text]) => `<details class="lic"><summary>${name}</summary><pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre></details>`).join("\n")}`;
}
