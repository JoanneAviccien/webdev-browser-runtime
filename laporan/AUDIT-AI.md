# Audit usulan perbaikan dari AI

Peran Anda di sini adalah **reviewer**. Minta sebuah AI (asisten chat atau coding agent) memperbaiki minimal dua tiket, sebaiknya di branch terpisah. Uji usulannya dengan protokol pengukuran yang sama.
Temukan minimal **dua** usulan bermasalah. Usulan AI yang bagus juga boleh dicatat, tetapi tidak
menggantikan dua temuan wajib.

Alat AI yang dipakai: Deepseek Branch atau commit tempat usulan diterapkan: main

---

## A-01: Diagnosis Deepseek untuk S2

- **Tiket yang diminta diperbaiki:** TK-1044
- **Prompt yang diberikan (ringkas):** Tolong bantu perbaiki INP dari kasus skenario S2 yang disebabkan karena stuttering yang terjadi pada project.
- **Usulan AI (ringkas):** T-01 menyatakan bahwa `Lacak.kirim` dengan payload `riwayat` 9.000 entri menjelaskan INP S2 baseline 41.192 ms, sebagai "satu task sangat panjang".
- **Jenis masalah pada usulan:**
  - [x] Salah diagnosis / klaim melampaui bukti (mekanisme benar, besaran tidak)
  - [x] Tidak lengkap
  - [ ] Menimbulkan regresi
  - [ ] Melanggar aturan main
  - [ ] Memperbaiki sesuatu yang tidak berpengaruh terukur
- **Bukti:** hasil nya sama saja. bahkan perbaikan dari tim menghasilkan 72ms

- **Mengapa AI bisa keliru di sini:** AI menalar dari kode dan memilih penyebab yang paling "terlihat mahal", tanpa menguji besaran dan tanpa melihat trace. Angka dari tim diterima begitu saja tanpa diperiksa konsistensinya.
- **Perbaikan yang benar menurut tim:** Draf T-01 sudah direvisi: mekanisme dipertahankan, besaran diganti dengan hasil benchmark, dan klaim 41 detik ditandai belum terjelaskan. Konfirmasi dengan trace S2 sebelum dikumpulkan.

---

## A-02: Usulan AI untuk S0 menutup sebagian sumber CLS dan permintaan gambar

- **Tiket yang diminta diperbaiki:** TK-1078, TK-1081
- **Prompt yang diberikan (ringkas):** Halaman TokoKilat saat dimuat lalu dibiarkan 10 detik (S0) punya CLS 0,946 dan ribuan permintaan gambar. Perbaiki tanpa menghapus fitur, tanpa mengubah `server.js`, `vendor/`, `alat/`, dan tanpa library
- **Usulan AI (ringkas):** `loading="lazy"`, `decoding="async"`, `width/height=300` pada gambar; `min-height: 132px` pada banner.
- **Jenis masalah pada usulan:**
  - [ ] Salah diagnosis / klaim melampaui bukti (mekanisme benar, besaran tidak)
  - [x] Memperbaiki sesuatu yang tidak berpengaruh terukur
  - [ ] Menimbulkan regresi
  - [ ] Melanggar aturan main
  - [ ] Memperbaiki sesuatu yang tidak berpengaruh terukur

- **Bukti:** Aturan Css Sudah ada

---

## Refleksi (maks. 200 kata)

AI paling membantu untuk membaca banyak berkas dan riwayat Git dengan cepat: ia menemukan bahwa `promo.js` sebelumnya kosong karena kesalahan commit. Dan menjelaskan mekanisme event loop (Seperti `await` hanya menjadwalkan microtask). Saya harus paling waspada pada besaran dan sebab-akibat. AI bisa benar tentang
mekanisme tetapi keliru tentang seberapa besar kontribusinya, seperti pada A-01. Angka dari pengukuran, hash commit, dan kondisi "sebelum/sesudah" juga mudah tercampur oleh AI, sehingga setiap klaim harus dicocokkan ulang dengan pengukuran.
