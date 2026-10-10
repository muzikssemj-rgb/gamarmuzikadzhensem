/* ============================================================================
   GAMAR MUZIKA -- reports
     * makeReviewPdf   student "Semakan Jawapan" (all questions, right/wrong marked)
   jsPDF is loaded on demand and bundled locally in /vendor (works offline).
   ============================================================================ */
(function (root) {
  "use strict";
  const GM = (root.GM = root.GM || {});

  // jsPDF's built-in fonts only cover Latin-1, so map the few music/typography symbols
  // that appear in questions (flat/sharp signs, curly quotes...) to safe equivalents.
  function pdfSafe(s) {
    return String(s == null ? "" : s)
      .replace(/♭/g, "b").replace(/♯/g, "#").replace(/♮/g, "")
      .replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—−]/g, "-").replace(/•/g, "-").replace(/…/g, "...")
      .replace(/→/g, "->").replace(/←/g, "<-").replace(/[✓✔]/g, "/")
      .replace(/ /g, " ")
      .replace(/[^ -~¡-ÿ]/g, "?");
  }
  GM.pdfSafe = pdfSafe;

  async function loadPdfLibs(table) {
    await GM.loadScript("vendor/jspdf.umd.min.js");
    if (table) await GM.loadScript("vendor/jspdf.plugin.autotable.min.js");
    return root.jspdf.jsPDF;
  }

  const C = {
    ink: [26, 20, 54], dim: [110, 104, 135], line: [200, 198, 212],
    ok: [27, 138, 59], okBg: [223, 245, 228], bad: [214, 59, 59], badBg: [253, 226, 226],
  };

  function imgFormat(dataUrl) { return /^data:image\/jpe?g/i.test(dataUrl) ? "JPEG" : "PNG"; }

  // Draws logo + school name + subtitle; returns the y where content may start.
  async function drawHeader(doc, school, subtitle, margin) {
    const title = pdfSafe((school && school.name) || "GAMAR MUZIKA").toUpperCase();
    let x = margin;
    if (school && school.logo) {
      const sz = await GM.imageSize(school.logo);
      if (sz) {
        const h = 54, w = Math.min(120, Math.max(24, (sz.w / sz.h) * h));
        try { doc.addImage(school.logo, imgFormat(school.logo), margin, 30, w, h, undefined, "FAST"); x = margin + w + 14; } catch (e) {}
      }
    }
    doc.setTextColor(...C.ink).setFont("helvetica", "bold").setFontSize(15);
    const maxW = doc.internal.pageSize.getWidth() - x - margin;
    const lines = doc.splitTextToSize(title, maxW).slice(0, 2);
    doc.text(lines, x, 50);
    doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...C.dim);
    doc.text(pdfSafe(subtitle), x, 50 + lines.length * 15 + 2);
    doc.setDrawColor(...C.line).setLineWidth(0.8);
    const ly = 98;
    doc.line(margin, ly, doc.internal.pageSize.getWidth() - margin, ly);
    return ly + 18;
  }

  function addFooters(doc, label) {
    const n = doc.getNumberOfPages(), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(170, 168, 185);
      doc.text(pdfSafe(`${label} - halaman ${i}/${n}`), W / 2, H - 26, { align: "center" });
    }
  }

  /* ------------------------------------------------------------------ student review */
  // run: {name, kelas, school, world, score, correct, asked, ts, items:[{q, options[], chosen, correct}]}
  GM.report = {};
  GM.report.makeReviewPdf = async function (run) {
    const JsPDF = await loadPdfLibs(false);
    const doc = new JsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
    let y = await drawHeader(doc, null, "Keputusan & Semakan Jawapan - Kuiz Teori Muzik", M);

    const total = run.items.length;
    const right = run.items.filter((x) => x.chosen === x.correct).length;
    const pct = total ? Math.round((right / total) * 100) : 0;
    const info = [
      [["Nama:", run.name || "-"], ["Tarikh:", GM.fmtDate(run.ts)]],
      [["Tahap / Dunia:", run.world || "-"], ["Tertinggi:", String(run.highScore != null ? run.highScore : run.score)]],
      [["Skor:", String(run.score)], ["Betul:", `${right} / ${total}  (${pct}%)`]],
    ];
    info.forEach((row) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold").setTextColor(...C.ink).text(pdfSafe(row[0][0]), M, y);
      doc.setFont("helvetica", "normal").text(doc.splitTextToSize(pdfSafe(row[0][1]), 170)[0], M + 78, y);
      doc.setFont("helvetica", "bold").text(pdfSafe(row[1][0]), 300, y);
      doc.setFont("helvetica", "normal").text(doc.splitTextToSize(pdfSafe(row[1][1]), 170)[0], 352, y);
      y += 16;
    });
    y += 4;
    doc.setDrawColor(...C.line).line(M, y, W - M, y);
    y += 22;

    if (!total) {
      doc.setFont("helvetica", "italic").setFontSize(11).setTextColor(...C.dim);
      doc.text("Tiada soalan dijawab dalam sesi ini.", M, y);
    }

    const STEM_W = W - 2 * M - 80, OPT_W = 330, bottom = H - 56;
    run.items.forEach((it, idx) => {
      const ok = it.chosen === it.correct;
      doc.setFont("helvetica", "bold").setFontSize(10);
      const stem = doc.splitTextToSize(pdfSafe(`${idx + 1}. ${it.q}`), STEM_W);
      doc.setFont("helvetica", "normal").setFontSize(9.5);
      const optLines = it.options.map((o, i) => doc.splitTextToSize(pdfSafe(`${String.fromCharCode(65 + i)}. ${o}`), OPT_W));
      const h = stem.length * 13 + 4 + optLines.reduce((a, l) => a + l.length * 12.5, 0) + 14;
      if (y + h > bottom) { doc.addPage(); y = 50; }

      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...C.ink);
      doc.text(stem, M, y);
      // BETUL / SALAH pill
      doc.setFillColor(...(ok ? C.okBg : C.badBg)).roundedRect(W - M - 58, y - 10, 58, 15, 3, 3, "F");
      doc.setFontSize(8).setTextColor(...(ok ? C.ok : C.bad));
      doc.text(ok ? "BETUL" : "SALAH", W - M - 29, y + 0.5, { align: "center" });
      y += stem.length * 13 + 4;

      optLines.forEach((lines, i) => {
        const isRight = i === it.correct, isChosen = i === it.chosen;
        const col = isRight ? C.ok : isChosen ? C.bad : C.ink;
        doc.setFont("helvetica", isRight || isChosen ? "bold" : "normal").setFontSize(9.5).setTextColor(...col);
        doc.text(lines, M + 12, y);
        let note = "";
        if (isRight && isChosen) note = "<- Jawapan anda (betul)";
        else if (isRight) note = "<- Jawapan betul";
        else if (isChosen) note = "<- Jawapan anda";
        if (note) { doc.setFontSize(7.5); doc.text(note, W - M - 2, y, { align: "right" }); }
        y += lines.length * 12.5;
      });
      y += 14;
    });

    addFooters(doc, `Gamar Muzika - ${run.name || "Pemain"}`);
    return { blob: doc.output("blob"), filename: `Keputusan_${GM.slug(run.name || "Pemain")}_${GM.fileStamp(run.ts)}.pdf` };
  };

})(typeof window !== "undefined" ? window : globalThis);
