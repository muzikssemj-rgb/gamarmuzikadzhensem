# Gamar Muzika (versi ringkas)

Permainan platformer teori muzik untuk semua murid sekolah di Malaysia. Tiada akaun, tiada pelayan, tiada Firebase — semuanya berjalan pada peranti murid.

## Cara murid bermain
1. Buka pautan permainan.
2. Taip **nama**, tekan **MULA PERMAINAN** (skrin penuh bermula secara automatik pada sentuhan pertama).
3. Di hujung permainan: **tangkap skrin (screenshot)** kad skor, atau tekan **MUAT TURUN KEPUTUSAN (PDF)** / **KONGSI KEPADA GURU** dan hantar kepada guru.

## Cara letak di internet (percuma, ±5 minit)
Pilih satu:
- **Netlify Drop:** buka https://app.netlify.com/drop dan seret folder ini. Anda dapat pautan terus.
- **Cloudflare Pages / GitHub Pages / Firebase Hosting:** muat naik semua fail dalam folder ini (Firebase tidak diperlukan sebagai pangkalan data).

Kongsi pautan kepada guru-guru lain. Hendak pautan pendek? Gunakan nama sendiri semasa memilih nama tapak (contoh `gamar-muzika.netlify.app`).

## Skrin penuh & pasang
- Android / komputer: pelayar akan meminta skrin penuh pada sentuhan pertama; atau tekan **Pasang aplikasi** di menu.
- iPad: sokong skrin penuh dalam Safari; untuk paparan penuh sebenar guna **Kongsi → Tambah ke Skrin Utama**.
- iPhone: Safari tiada skrin penuh dalam halaman web — wajib guna **Kongsi → Tambah ke Skrin Utama**.
- Selepas dibuka sekali dengan internet, permainan boleh dimainkan tanpa internet.

## Menukar soalan
Soalan ada dalam `js/questions-data.js` (320 soalan, senarai `GM.BANK`). Setiap soalan: `q`, `options` (2–6 pilihan), `answer` (nombor, bermula 0 = A), `topic`. Soalan dikeluarkan secara rawak.

## Selepas mengemas kini fail
Naikkan `VERSION` dalam `sw.js` (cth. `gm-2.0.3`) sebelum muat naik semula, supaya peranti murid mendapat versi baharu.

## Nota
- Skor tertinggi dan nama disimpan pada peranti murid sahaja.
- Skor dalam permainan tidak boleh disahkan oleh guru (murid boleh tangkap skrin sebarang kad), jadi PDF/screenshot sesuai sebagai bukti penyertaan, bukan peperiksaan.
- Satu soalan klef bass dalam fail asal ada kunci jawapan salah dan tidak dimasukkan.
