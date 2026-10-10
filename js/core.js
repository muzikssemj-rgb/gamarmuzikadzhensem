/* ============================================================================
   GAMAR MUZIKA -- core helpers (namespace GM)
   Small, dependency-free utilities shared by every other module.
   ============================================================================ */
(function (root) {
  "use strict";
  const GM = (root.GM = root.GM || {});
  GM.VERSION = "2.0.1";

  GM.$ = (sel, ctx) => (ctx || document).querySelector(sel);
  GM.$$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  GM.esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---- safe localStorage wrapper (private mode / blocked storage never throws) ----
  GM.ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // ---- lazy <script> loader: heavy libraries are only fetched when first needed ----
  const loaded = {};
  GM.loadScript = (src) => {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { delete loaded[src]; reject(new Error("Gagal memuatkan " + src + " (semak sambungan internet)")); };
      document.head.appendChild(s);
    });
    return loaded[src];
  };

  // ---- toast -------------------------------------------------------------------
  GM.toast = (msg, ms, kind) => {
    let host = document.getElementById("gmToastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "gmToastHost";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    const t = document.createElement("div");
    t.className = "gm-toast" + (kind ? " " + kind : "");
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, ms || 3200);
  };

  // ---- hashing (admin password is compared as a SHA-256 digest, never stored in clear) ----
  GM.sha256Hex = async (str) => {
    try {
      if (!root.crypto || !root.crypto.subtle) return null;
      const buf = await root.crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) { return null; }
  };

  // ---- school code ("kod kelas/sekolah") -------------------------------------------
  const KOD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L to avoid read-aloud mistakes
  GM.normKod = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  GM.validKod = (s) => /^[A-Z0-9]{4,12}$/.test(s || "");
  GM.genKod = () => {
    let out = "";
    const buf = new Uint32Array(8);
    (root.crypto || { getRandomValues: (a) => a.map(() => Math.random() * 4294967296) }).getRandomValues(buf);
    for (let i = 0; i < 6; i++) out += KOD_ALPHABET[buf[i] % KOD_ALPHABET.length];
    return out;
  };

  const p2 = (n) => String(n).padStart(2, "0");
  GM.fmtDate = (ms) => {
    const d = new Date(ms || Date.now());
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  };
  GM.fileStamp = (ms) => {
    const d = new Date(ms || Date.now());
    return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;
  };
  GM.slug = (s) =>
    String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "fail";

  // ---- files -------------------------------------------------------------------------
  GM.downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
  };
  GM.canShareFile = (blob, filename) => {
    try {
      if (!navigator.share || !navigator.canShare) return false;
      return navigator.canShare({ files: [new File([blob], filename, { type: blob.type })] });
    } catch (e) { return false; }
  };
  GM.shareFile = async (blob, filename, title, text) => {
    const file = new File([blob], filename, { type: blob.type });
    await navigator.share({ files: [file], title: title || filename, text: text || "" });
  };

  // Reads an uploaded image and returns a small PNG data-URL (kept small because the
  // logo is stored inside a Firestore document, which has a 1 MB limit).
  GM.resizeImageToDataUrl = (file, maxPx) => new Promise((resolve, reject) => {
    maxPx = maxPx || 256;
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Gagal membaca fail imej."));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Fail ini bukan imej yang sah (gunakan PNG atau JPG)."));
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0, w, h);
        let out = c.toDataURL("image/png");
        if (out.length > 140000) { // big photo-like logo: fall back to JPEG on white
          g.globalCompositeOperation = "destination-over";
          g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
          out = c.toDataURL("image/jpeg", 0.85);
        }
        resolve(out);
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });

  GM.imageSize = (dataUrl) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
})(typeof window !== "undefined" ? window : globalThis);
