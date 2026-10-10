/* ============================================================================
   GAMAR MUZIKA -- bank soalan (semua pada peranti, tiada pelayan)
   Soalan datang dari js/questions-data.js (GM.BANK) dan dikeluarkan secara rawak
   (kocok sekali, tiada ulangan dalam satu permainan).
   ============================================================================ */
(function (root) {
  "use strict";
  const GM = root.GM;
  const sp = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();

  function normQ(raw) {
    if (!raw || typeof raw !== "object") return null;
    const q = sp(raw.q);
    const opts = Array.isArray(raw.options) ? raw.options.map(sp).filter(Boolean) : null;
    if (!q || !opts || opts.length < 2 || opts.length > 6) return null;
    const a = raw.answer;
    if (!Number.isInteger(a) || a < 0 || a >= opts.length) return null;
    return { q, options: opts, answer: a, topic: sp(raw.topic).slice(0, 40) };
  }
  const sig = (x) => x.q.toLowerCase() + "|" + x.options.map((o) => o.toLowerCase()).sort().join("|");
  function dedupe(list) {
    const seen = new Set(), out = [];
    for (const x of list) { const s = sig(x); if (!seen.has(s)) { seen.add(s); out.push(x); } }
    return out;
  }
  function shuffled(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const EMERGENCY = [
    { q: "Berapa ketukan krocet dalam satu semibrif?", options: ["2", "3", "4", "8"], answer: 2, topic: "Nilai Not" },
    { q: "Berapa not minim sama nilai dengan satu semibrif?", options: ["1", "2", "3", "4"], answer: 1, topic: "Nilai Not" },
  ];
  const Q = { list: [], deck: [], last: null };

  function load() {
    Q.list = dedupe((GM.BANK || []).map(normQ).filter(Boolean));
    Q.deck = [];
  }

  function buildDeck() {
    const list = Q.list.length ? Q.list : EMERGENCY;
    Q.deck = shuffled(list);
    if (Q.last && Q.deck.length > 1 && sig(Q.deck[Q.deck.length - 1]) === sig(Q.last)) Q.deck.unshift(Q.deck.pop());
  }

  GM.questions = {
    reset() { Q.deck = []; },
    pick() {
      if (!Q.deck.length) buildDeck();
      // random, but avoid two questions of the same topic in a row when possible
      let k = Q.deck.length - 1;
      if (Q.last && Q.last.topic) {
        for (let i = k; i >= Math.max(0, k - 6); i--) if (Q.deck[i].topic !== Q.last.topic) { k = i; break; }
      }
      const x = Q.deck.splice(k, 1)[0];
      Q.last = x;
      return { q: x.q, options: x.options.slice(), answer: x.answer, topic: x.topic || "Teori Muzik" };
    },
    get count() { return Q.list.length; },
  };
  load();
  ["verLbl", "verLbl2"].forEach((id) => {
    const lbl = root.document && root.document.getElementById(id);
    if (!lbl) return;
    const n = Q.list.length;
    lbl.textContent = "Versi 2.0.1 \u00b7 " + n + " soalan dimuatkan";
    if (n < 100) { lbl.style.color = "#ff6b6b"; lbl.style.opacity = 1; lbl.textContent += " \u2014 FAIL SOALAN TIDAK LENGKAP! Ekstrak semula SEMUA fail zip (terutama folder js) dan buka semula."; }
  });
})(typeof window !== "undefined" ? window : globalThis);
