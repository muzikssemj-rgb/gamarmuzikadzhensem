/* ============================================================================
   GAMAR MUZIKA -- sesi murid (semua pada peranti)
   * Murid hanya menaip nama.
   * Selepas tamat / menang: kad keputusan (untuk screenshot) + PDF keputusan & semakan
     jawapan yang boleh dimuat turun / dikongsi kepada guru.
   ============================================================================ */
(function (root) {
  "use strict";
  const GM = root.GM;
  const $ = (id) => document.getElementById(id);
  const ls = GM.ls;

  const S = { lastRun: null };
  GM.session = S;

  // Returns an error message, or "" when OK. Remembers the name for next time.
  S.validateStart = (name) => {
    name = (name || "").trim();
    if (!name) return "Sila masukkan nama anda dahulu!";
    ls.set("gm_name", name);
    return "";
  };
  if (!$("playerNameInput").value) $("playerNameInput").value = ls.get("gm_name", "") || "";

  // info: {name, status:'tamat'|'menang', worldLabel, score, highScore, correct, asked, items}
  S.finishRun = function (info) {
    const run = {
      name: info.name, world: info.worldLabel, score: info.score, highScore: info.highScore,
      correct: info.correct, asked: info.asked, ts: Date.now(), items: info.items || [], status: info.status,
    };
    S.lastRun = run;
    const when = GM.fmtDate(run.ts);
    const line = `Betul ${run.correct}/${run.asked}  ·  ${run.world || ""}  ·  ${when}`;
    ["rcLineOver", "rcLineWin"].forEach((id) => { const e = $(id); if (e) e.textContent = line; });
    ["shareBtnOver", "shareBtnWin"].forEach((id) => $(id).classList.toggle("hidden", !navigator.share));
  };

  async function buildReport() {
    if (!S.lastRun) return null;
    try { return await GM.report.makeReviewPdf(S.lastRun); }
    catch (e) { console.error(e); GM.toast("Gagal menjana PDF: " + e.message, 4500, "bad"); return null; }
  }
  S.download = async () => {
    const r = await buildReport(); if (!r) return;
    GM.downloadBlob(r.blob, r.filename);
    GM.toast("PDF dimuat turun: " + r.filename + ". Hantar kepada guru anda.", 4200, "ok");
  };
  S.share = async () => {
    const r = await buildReport(); if (!r) return;
    if (GM.canShareFile(r.blob, r.filename)) {
      try { await GM.shareFile(r.blob, r.filename, "Keputusan Gamar Muzika", "Keputusan kuiz teori muzik saya."); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    GM.downloadBlob(r.blob, r.filename);
    GM.toast("Peranti ini tidak menyokong Kongsi fail. PDF dimuat turun - hantar kepada guru secara manual.", 5000);
  };
  ["reviewBtnOver", "reviewBtnWin"].forEach((id) => $(id).addEventListener("click", S.download));
  ["shareBtnOver", "shareBtnWin"].forEach((id) => $(id).addEventListener("click", S.share));
})(typeof window !== "undefined" ? window : globalThis);
