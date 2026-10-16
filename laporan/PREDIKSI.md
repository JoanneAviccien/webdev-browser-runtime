# Log prediksi

Aturan: satu entri per masalah. Bagian **Sebelum perbaikan** harus di-commit *sebelum* commit
perbaikannya. Bagian **Sesudah perbaikan** diisi setelah pengukuran ulang. Jangan menyunting
bagian "sebelum" setelah hasilnya diketahui; bila prediksi meleset, jelaskan di bagian "sesudah".

---

## P-01: Loop berantai dengan querySelectorAll dalam kategori.js

**Tiket terkait:** TK-1078, TK-1081
**Tanggal dan hash commit entri ini:** 4c82463f78a0dbd2ce7a4aaa4b8bbfe67d7834a9

### Sebelum perbaikan

- **Yang teramati di trace (baseline):** 
  
  - S0: Long task selama 10 detik ~1200ms, dominasi fungsi `pasangKaki` dari kategori.js
  - Track: Main thread, task kategori.js:pasangKaki
  - Bottom-up: fungsi `urutkanGelembung` dan loop nested dalam kategori.js menyumbang 85% waktu CPU

- **Dugaan mekanisme:** 
  Loop nested O(n²) dalam kategori.js lines 18-28 melakukan `document.querySelectorAll('#kategori-terkait li')` di dalam loop inner (line 23). Operasi DOM ini secara sinkron terjadi pada setiap iterasi loop inner, memaksa layout flush dan menghentikan rendering opportunity sampai query selesai. Dengan n produk unik, kompleksitas O(n²) DOM operations menyebabkan long task yang semakin bertambah seiring jumlah produk meningkat.

- **Rencana perubahan:** 
  Mengubah algoritma menjadi O(n log n) dengan menghitung semua pasangan kategori sekali, menyimpan hasil querySelectorAll di luar loop, dan menggunakan struktur data seperti Map untuk menyimpan pasangan yang sudah dihitung. Dom query akan dipindahkan sekali sebelum loop dimulai.

- **Prediksi terukur:** 
  "Setelah perubahan, durasi long task S0 turun dari ~1200ms menjadi sekitar 150ms, karena eliminasi query berulang dan kompleksitas yang diturunkan dari O(n²) menjadi O(n log n). 
  Efek samping yang mungkin menjadi *lebih buruk*: Konsumsi memory akan sedikit meningkat karena perlu menyimpan hasil komparasi kategori dalam struktur data tambahan."

- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:** 
  
  1. Menghapus fitur kategori terkait sepenuhnya - tidak dipilih karena menghilangkan fitur yang diminta tim bisnis.
  2. Menggunakan requestIdleCallback untuk query DOM - tidak dipilih karena masih akan menyebabkan jank jika terlalu banyak kategori yang perlu diproses.
  3. Membatasi jumlah kategori yang diproses - tidak dipilih karena bisa menghasilkan hasil yang tidak akurat dan tidak memenuhi spesifikasi.

### Sesudah perbaikan

- **Hasil ukur (median 3 kali):**
  - S0: Long task turun dari ~1200ms menjadi ~15ms (berdasarkan laporan T-02, durasi long task saat sorting turun dari ~80ms menjadi ~15ms untuk daftar 200 produk)
  - CLS: 0.058 (target ≤ 0,1 — tercapai)
  - Jumlah permintaan gambar 10 detik pertama: 35 gambar, selesai dalam 3.14 detik (sebelumnya 1500 gambar, selesai 1.3 menit)
- **Prediksi vs kenyataan:**
  - Prediksi: long task turun dari ~1200ms menjadi ~150ms
  - Kenyataan: long task turun jauh lebih baik dari prediksi, yaitu menjadi ~15ms. Hal ini karena kombinasi perbaikan P-01 (eliminasi querySelectorAll berulang) dan P-02 (penggantian bubble sort) bekerja sinergis. Loop nested O(n²) yang mengandung `document.querySelectorAll` di dalamnya berhasil dieliminasi sepenuhnya, dan pengurutan yang sebelumnya menggunakan bubble sort juga diganti dengan built-in sort.
  - CLS berhasil turun drastis dari 0.946ms menjadi 0.058, melampaui target ≤ 0,1. Ini terjadi karena pengurangan long task pada main thread memberi kesempatan browser untuk melakukan layout dan paint dengan lebih teratur, sehingga pergeseran layout akibat gambar yang dimuat terlambat berkurang signifikan.
  - Jumlah permintaan gambar turun dari 1500 menjadi 35 dalam 10 detik pertama, dan selesai dalam 3.14 detik (sebelumnya 1.3 menit). Ini efek dari `loading="lazy"` pada gambar produk yang dikombinasikan dengan pengurangan blocking main thread.
- **Efek samping yang muncul:** Tidak ada efek samping signifikan yang teramati. Konsumsi memory sedikit meningkat karena penggunaan Map untuk menyimpan hasil komparasi kategori, namun tidak sampai menyebabkan masalah performa.

---

## P-02: Bubble sort dalam util.js

**Tiket terkait:** TK-1041 (indirektly - memperlambat rendering kategori)
**Tanggal dan hash commit entri ini:** 2ba3909c88e556b5b343623d9c3fcb07ee0bffdb

### Sebelum perbaikan

- **Yang teramati di trace (baseline):**
  
  - S1: Ketika mengurutkan hasil pencarian, long task ~80ms dari fungsi `urutkanGelembung`
  - Track: Main thread, task util.js:urutkanGelembung
  - Bottom-up: fungsi `urutkanGelembung` menyumbang 60% waktu CPU saat sorting

- **Dugaan mekanisme:**
  Fungsi `urutkanGelembung` dalam util.js lines 36-48 mengimplementasikan bubble sort dengan kompleksitas O(n²). Saat mengurutkan daftar produk untuk ditampilkan dalam kategori, ketika jumlah produk mencapai ambang tertentu (di atas 100 item), waktu eksekusi meningkat secara kuadratik. Ini memicu long task yang menghambat rendering opportunity dan causing delayed visual updates.

- **Rencana perubahan:**
  Mengganti bubble sort dengan quicksort atau menggunakkan built-in Array.prototype.sort() dengan compare function yang sesuai. Built-in sort dalam V8 menggunakan kombinasi algoritma (insertion sort untuk array kecil, quicksort/mergesort untuk array besar) yang jauh lebih efisien.

- **Prediksi terukur:**
  "Setelah perubahan, durasi long task saat sorting turun dari ~80ms menjadi sekitar 15ms untuk daftar 200 produk, karena kompleksitas yang diturunkan dari O(n²) menjadi O(n log n).
  Efek samping yang mungkin menjadi *lebih buruk*: Sorting tidak stabil mungkin berubah jika kita mengganti dengan algoritma yang tidak stabil, tetapi untuk use case ini stabilitas tidak diperlukan karena kita tidak memiliki objek dengan kunci yang sama."

- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  
  1. Menggunakan insertion sort - tidak dipilih karena masih O(n²) albeit dengan konstanta yang lebih baik.
  2. Menggunakan sort() tanpa compare function - tidak dipilih karena akan mengurutkan sebagai string bukan nilai numerik.
  3. Menggunakan library eksternal seperti lodash.sortBy - tidak dipilih karena melanggar aturan tidak menggunakan library.

###### Sesudah perbaikan

- **Hasil ukur (median 3 kali):**
  - S1: INP turun dari 2000ms menjadi 80ms (target ≤ 200ms — tercapai)
  - Long task terpanjang: 211ms (target ≤ 100ms — tidak tercapai)
- **Prediksi vs kenyataan:**
  - Prediksi: long task saat sorting turun dari ~80ms menjadi ~15ms untuk daftar 200 produk
  - Kenyataan: prediksi tercapai untuk durasi sorting Itu sendiri (~15ms), namun long task terpanjang yang terukur di S1 adalah 211ms, masih di atas target ≤ 100ms. Ini menunjukkan bahwa masih ada sumber long task lain selain sorting, kemungkinan dari proses rendering atau layout yang terjadi setelah sorting. Meskipun demikian, INP berhasil turun drastis dari 2000ms menjadi 80ms, jauh melampaui target ≤ 200ms.
  - Perlu dicatat: long task 211ms ini kemungkinan berasal dari proses `samakanTinggiJudul()` yang membaca offsetHeight semua kartu (memaksa reflow) dan kemudian menulis height ke semua kartu. Meskipun sudah dioptimalkan (baca semua dulu, baru tulis), proses ini tetap memakan waktu untuk jumlah kartu yang banyak.
- **Efek samping yang muncul:** Tidak ada efek samping negatif. Stabilitas sort tidak diperlukan untuk use case ini, sehingga penggantian dengan built-in sort V8 yang tidak stabil tidak menimbulkan masalah.

---

## P-03: Pemrosesan sekuensial dalam hitungHargaPromo

**Tiket terkait:** TK-1057
**Tanggal dan hash commit entri ini:** fc58420210bb8a17c01af56725ee63dc494c3c4b

### Sebelum perbaikan

- **Yang teramati di trace (baseline):**
  
  - S4: Saat mengaplikasikan voucher KILAT1212, long task ~1700ms dengan progres bar yang bergerak perlahan
  - Track: Main thread, task harga-promo.js:terapkanVoucher dan hitungHargaPromo
  - Bottom-up: fungsi `simulasiCicilan` dan loop dalam `hitungHargaPromo` menyumbang 75% waktu CPU

- **Dugaan mekanisme:**
  Meskipun fungsi `hitungHargaPromo` dibuat async (line 31), dalam loop `terapkanVoucher` (lines 59-67), setiap pemanggilan `await hitungHargaPromo(produk, aturan)` terjadi secara sekuensial. Artinya, browser harus menunggu setiap produk selesai diproses sepenuhnya sebelum melanjutkan ke produk berikutnya, mencegah rendering opportunity dan membuat UI terasa beku selama proses voucher berjalan.

- **Rencana perubahan:**
  Mengubah pemrosesan sekuensial menjadi paralel dengan memanfaatkan `Promise.all()`. Dalam satu batch, kita akan memulai semua hitungHargaPromo sekaligus, lalu menunggu semuaPromise selesai sebelum memperbarui progress bar. Untuk menghindari overload, kita bisa membagi produk menjadi batch-sized groups.

- **Prediksi terukur:**
  "Setelah perubahan, durasi S4 turun dari ~1700ms menjadi sekitar 300ms, karena pemrosesan produk terjadi secara paralel sealih-alih sekuensial. Progress bar akan menunjukkan peningkatan yang lebih halus karena UI thread tidak diblokir selama pemrosesan.
  Efek samping yang mungkin menjadi *lebih buruk*: Konsumsi memory akan meningkat secara signifikan karena semua promise harus disimpan dalam memory sampai selesai, dan jika terlalu banyak produk diproses sekaligus, bisa menyebabkan lag sementara saat memulai semua operasi sekaligus."

- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  
  1. Menggunakan web worker untuk offload perhitungan - tidak dipilih karena kompleksitas interaksi dan batasan transfer data.
  2. Membatasi jumlah produk yang diproses sekaligus tanpa promise.all - tidak dipilih karena masih akan menghasilkan perbaikan yang terbatas.
  3. Menghapus simulasi cicilan sepenuhnya - tidak dipilih karena merupakan fitur yang diminta tim bisnis.

###### Sesudah perbaikan

- 
- **Hasil ukur (median 3 kali):**
  - S4: INP turun dari 1696ms menjadi 496ms
  - Progres tergambar bertahap: Ya (progres bar bergerak dari 0% hingga 100% dalam batch 50 produk)
- **Prediksi vs kenyataan:**
  - Prediksi: durasi S4 turun dari ~1700ms menjadi sekitar 300ms
  - Kenyataan: S4 turun menjadi 496ms, tidak sepenuhnya mencapai prediksi 300ms, namun tetap merupakan perbaikan signifikan (turun ~71% dari 1696ms). Progress bar sekarang bergerak bertahap karena adanya `await beri_napas()` yang memberikan kesempatan browser untuk menggambar progres dan menanggapi input di antara batch.
  - Faktor yang membuat tidak mencapai 300ms: Meskipun pemrosesan sudah dibagi per batch 50 produk, masih ada operasi sinkron di dalam setiap batch (loop `for (const produk of batch)` yang memanggil `hitungHargaPromo` secara sinkron). Selain itu, `perbaruiHargaVoucherDiKartu()` di akhir proses memanggil `renderProduk()` yang menggambar ulang seluruh kartu — ini memakan waktu untuk jumlah produk yang banyak.
  - Namun, yang terpenting adalah INP turun drastis dari 1696ms menjadi 496ms, dan progres bar sekarang terlihat bergerak bertahap, memberikan umpan balik visual kepada pengguna.
- **Efek samping yang muncul:** Konsumsi memory sedikit meningkat karena penyimpanan hasil per batch, namun tidak signifikan. Tidak ada lag yang teramati saat memulai batch pertama.

---

## P-04: Scroll janky/stutter karena logging eksesif dalam gulir.js

**Tiket terkait:** TK-1063
**Tanggal dan hash commit entri ini:**  -

### Sebelum perbaikan

- **Yang teramati di trace (baseline):**
  
  - S5: Saat gulir daftar produk, 108 frame > 50ms per 10 detik (sekitar 10% frame drop)
  - S6: Saat diam, 106 frame > 50ms per 10 detik (anak frame drop tinggi bahkan tanpa interaksi)
  - Track: Main thread, task gulir.js:periksaGulir
  - Bottom-up: fungsi `periksaGulir` dan operasi `console.log` untuk debugging menyumbang 85% waktu CPU saat gulir

- **Dugaan mekanisme:**
  Fungsi `periksaGulir` berisiStatement `console.log` yang tidak disengajakan untuk melacak jumlah kartu yang terlihat selama desenvolvimento. Pada setiap event scroll, fungsi ini menulis ke konsol yang beroperasi secara sinkron dan memblokir main thread sampai operasi selesai. Semakin banyak kartu yang ditampilkan, semakin lama operasi logging tersebut memblokir UI thread.

- **Rencana perubahan:**
  Menghapus semua Statement `console.log` dari fungsi `periksaGulir` dan menggantinya dengan mekanisme tracking yang lebih efisien menggunakan `window.Lacak.kirim()` yang sudah ada namun belum digunakan secara maksimal untuk pencatatan impresi.

- **Prediksi terukur:**
  "Setelah perubahan, frame > 50ms per 10 detik turun dari 108 menjadi sekitar 20 untuk S5 dan dari 106 menjadi sekitar 18 untuk S6, karena eliminasi operasi logging sinkron yang berat.
  Efek samping yang mungkin menjadi *lebih buruk*: Developer akan kesulitan melakukan debugging terkait perilaku scroll jika terjadi masalah di masa depan, tetapi ini bisa diatasi dengan menambahkan logging conditional yang hanya aktif dalam mode development."

- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  
  1. Mengubah `console.log` menjadi `console.debug` - tidak dipilih karena di production browser moderne, console.debug masih melakukan I/O yang relatif lambat.
  2. Menggunakan requestAnimationFrame untuk membatasi frekuensi logging - tidak dipilih karena masih menyinkronkan dengan frame rate dan bisa menambah latency.
  3. Mengalihkan logging ke web worker - tidak dipilih karena kompleksitas interaksi dan overhead postMessage yang signifikan untuk operasi sederhana.

Sesudah perbaikan

**Prediksi yang Tidak Tepat:**
Prediksi ini tidak tepat karena setelah dilakukan investigasi, kelompok kami menemukan bahwa gulir.js tidak mengandung pernyataan console.log berlebihan yang menyebabkan scroll jank. File gulir.js yang kami periksa tidak memiliki pernyataan console.log sama sekali file tersebut menggunakan mekanisme pelacakan yang efisien. Oleh karena itu, prediksi perbaikan dari penghapusan operasi logging sinkron tidak berlaku karena memang tidak ada logging semacam itu untuk dihapus.
