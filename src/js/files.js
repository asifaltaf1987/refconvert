// Reading uploaded files in the browser. Nothing is uploaded to a server.
// PDF: pdf.js, Word (.docx): mammoth, plain text, RIS-like text and Markdown read directly.

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.dataset.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

async function readPdf(file, onProgress) {
  if (!window.pdfjsLib) {
    await loadScript("vendor/pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
  }
  const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress && onProgress(`Reading page ${p} of ${pdf.numPages}…`);
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const lines = [];
    let lastY = null, lastH = 10, line = "";
    for (const it of tc.items) {
      if (!("str" in it)) continue;
      const y = it.transform[5], h = it.height || lastH;
      if (lastY !== null && Math.abs(y - lastY) > Math.max(2, h * 0.4)) {
        lines.push(line); line = "";
        if (lastY - y > h * 1.8) lines.push("");
      }
      line += (line && !line.endsWith(" ") && !it.str.startsWith(" ") ? " " : "") + it.str;
      lastY = y; lastH = h;
      if (it.hasEOL) { lines.push(line); line = ""; lastY = null; }
    }
    if (line) lines.push(line);
    pages.push(lines.join("\n"));
  }
  return pages.join("\n\n");
}

async function readDocx(file) {
  if (!window.mammoth) await loadScript("vendor/mammoth.browser.min.js");
  const res = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return res.value;
}

export async function readFile(file, onProgress) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return readPdf(file, onProgress);
  if (name.endsWith(".docx")) return readDocx(file);
  if (name.endsWith(".doc")) throw new Error("Old .doc files are not supported. Save the file as .docx or PDF and try again.");
  if (/\.(txt|text|md|csv|rtf)$/.test(name) || file.type.startsWith("text/")) {
    let t = await file.text();
    if (name.endsWith(".rtf")) t = t.replace(/\\par[d]?/g, "\n").replace(/\{\\[^{}]*\}|\\[a-z]+-?\d* ?|[{}]/gi, "");
    return t;
  }
  throw new Error("This file type is not supported. Use PDF, DOCX, RTF or TXT.");
}
