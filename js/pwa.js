/* ============================================================================
   GAMAR MUZIKA -- PWA glue: service worker, install prompt, fullscreen, app mode
   ============================================================================ */
(function (root) {
  "use strict";
  const GM = root.GM;
  const $ = (id) => document.getElementById(id);
  const doc = document, de = doc.documentElement;

  /* ---------------------------------------------------------------- app / fullscreen mode */
  const mq = root.matchMedia ? root.matchMedia("(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)") : { matches: false };
  const isStandalone = () => !!(mq.matches || navigator.standalone === true);
  const fsElement = () => doc.fullscreenElement || doc.webkitFullscreenElement || null;
  const canFullscreen = !!(de.requestFullscreen || de.webkitRequestFullscreen);

  function syncAppMode() {
    doc.body.classList.toggle("app-mode", isStandalone() || !!fsElement());
    const b = $("fsBtn");
    if (b) { b.setAttribute("aria-pressed", String(!!fsElement())); b.title = fsElement() ? "Keluar skrin penuh" : "Skrin penuh"; }
  }
  async function toggleFullscreen() {
    try {
      if (fsElement()) { await (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc); return; }
      await (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
      // The game is wider than tall: ask for landscape where the browser allows it (Android/Chrome).
      try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape"); } catch (e) {}
    } catch (e) { GM.toast("Skrin penuh tidak dibenarkan oleh pelayar ini.", 3200); }
  }
  doc.addEventListener("fullscreenchange", syncAppMode);
  doc.addEventListener("webkitfullscreenchange", syncAppMode);
  if (mq.addEventListener) mq.addEventListener("change", syncAppMode);

  const fsBtn = $("fsBtn");
  if (fsBtn) {
    if (!canFullscreen) fsBtn.classList.add("hidden");      // e.g. iPhone Safari: use "Add to Home Screen"
    fsBtn.addEventListener("click", toggleFullscreen);
  }
  syncAppMode();


  /* ---------------------------------------------------------------- automatic fullscreen
     Browsers only allow fullscreen after a tap/click/keypress, so the very first interaction
     (typing the name, tapping MULA, etc.) switches to fullscreen automatically. If the player
     leaves fullscreen on purpose, we stop asking until the next page load. */
  let autoOff = false;
  async function enterFullscreen(e) {
    if (e && e.target && e.target.closest && e.target.closest("#fsBtn")) return;   // the button handles itself
    if (!canFullscreen || fsElement() || autoOff || isStandalone()) return;
    try {
      await (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
      try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape"); } catch (e) {}
    } catch (e) { /* not allowed (yet): try again on the next gesture */ }
  }
  ["pointerup", "touchend", "click", "keydown"].forEach((ev) => doc.addEventListener(ev, enterFullscreen, { capture: true, passive: true }));
  doc.addEventListener("fullscreenchange", () => { if (!fsElement()) { autoOff = true; } });
  doc.addEventListener("webkitfullscreenchange", () => { if (!fsElement()) { autoOff = true; } });

  /* ---------------------------------------------------------------- install */
  const installBtn = $("installBtn");
  let deferred = null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function showInstall() { if (installBtn && !isStandalone()) installBtn.classList.remove("hidden"); }
  function hideInstall() { if (installBtn) installBtn.classList.add("hidden"); }

  function sheet(title, steps) {
    const d = doc.createElement("div");
    d.className = "pwa-sheet";
    d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true");
    d.innerHTML = `<div><h3>${GM.esc(title)}</h3><ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      <button class="btn" type="button">FAHAM</button></div>`;
    d.addEventListener("click", (e) => { if (e.target === d || e.target.tagName === "BUTTON") d.remove(); });
    doc.body.appendChild(d);
    d.querySelector("button").focus();
  }

  root.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; showInstall(); });
  root.addEventListener("appinstalled", () => { deferred = null; hideInstall(); GM.toast("Aplikasi dipasang. Cari ikon Gamar Muzika pada skrin utama anda.", 4200, "ok"); });
  if (isIOS && !isStandalone()) showInstall();

  if (installBtn) installBtn.addEventListener("click", async () => {
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch (e) {}
      deferred = null; hideInstall();
    } else if (isIOS) {
      sheet("PASANG PADA iPAD / iPHONE", [
        "Buka halaman ini dalam <b>Safari</b>.",
        "Ketik ikon <b>Kongsi</b> (petak dengan anak panah ke atas).",
        "Pilih <b>Tambah ke Skrin Utama</b>, kemudian <b>Tambah</b>.",
        "Buka melalui ikon baharu: aplikasi berjalan <b>skrin penuh</b>.",
      ]);
    } else {
      sheet("PASANG APLIKASI", [
        "Buka menu pelayar (<b>&#8942;</b> atau <b>&#8943;</b>).",
        "Pilih <b>Pasang aplikasi</b> / <b>Install app</b> / <b>Tambah ke skrin utama</b>.",
      ]);
    }
  });

  /* ---------------------------------------------------------------- service worker */
  function updateBar() {
    if ($("gmUpdate")) return;
    const b = doc.createElement("div");
    b.id = "gmUpdate"; b.className = "gm-toast ok";
    b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:max(18px,env(safe-area-inset-bottom));z-index:3100;pointer-events:auto;display:flex;gap:12px;align-items:center";
    b.innerHTML = '<span>Versi baharu tersedia.</span><button class="btn" type="button" style="font-size:9px;padding:8px 12px">KEMAS KINI</button>';
    b.querySelector("button").onclick = () => root.location.reload();
    doc.body.appendChild(b);
  }
  const secure = root.isSecureContext || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if ("serviceWorker" in navigator && secure && location.protocol !== "file:") {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) updateBar(); });
    root.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((reg) => {
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000); // re-check hourly while open
      }).catch((e) => console.warn("SW:", e));
    });
  }

  GM.pwa = { toggleFullscreen, isStandalone, canFullscreen };
})(typeof window !== "undefined" ? window : globalThis);
