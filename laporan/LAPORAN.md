# Laporan audit performa dan interaksi TokoKilat

Tim:   Anggota:   Tanggal: 
Panjang maksimal setara 6 halaman (tidak termasuk lampiran gambar).

## 1. Ringkasan eksekutif (maks. 150 kata)

Apa masalah terbesar, apa yang dilakukan, berapa hasilnya. Tulis untuk manajer produk, bukan untuk engineer.

## 2. Lingkungan pengukuran

Spesifikasi laptop, versi Chrome, jumlah produk (`npm start` atau varian lain), tingkat throttling,
dan penyimpangan apa pun dari protokol di TUGAS.md bagian 7.

## 3. Hasil sebelum dan sesudah

| Skenario | Metrik                                        | Sebelum (median)             | Sesudah (median) | Target                         | Tercapai? |
| -------- | --------------------------------------------- | ---------------------------- | ---------------- | ------------------------------ | --------- |
| S0       | CLS                                           | 0.946ms                      | 0.01                 | <= 0,1                         |           |
| S0       | Jumlah permintaan gambar dalam 10 dtk pertama | 1500, finish dalam 1.3 menit |                  | sebanding dengan yang terlihat |           |
| S1       | INP                                           | 2000ms                       |                  | <= 200 ms                      |           |
| S1       | Long task terlama                             | 1455ms                       |                  | <= 100 ms                      |           |
| S2       | INP                                           | 41192ms                      |                  | <= 200 ms                      |           |
| S3       | Jumlah pesanan dari 3 klik                    | 3                            |                  | 1                              |           |
| S4       | INP / progres tergambar bertahap?             | 1696ms                       |                  |                                |           |
| S5       | Frame > 50 ms per 10 dtk                      | 108                          |                  | <= 2                           |           |
| S6       | Frame > 50 ms per 10 dtk                      | 106                          |                  | <= 2                           |           |

## 4. Temuan

Ulangi blok berikut untuk tiap temuan. Urutkan berdasarkan dampak, bukan urutan tiket.

### T-01: Penggantian bubble sort dengan built-in sort

- Tiket terkait: TK-1041
  
- Gejala bagi pengguna: Ketika pengguna mengetik pencarian produk, hasil
  pencarian dapat terlambat diperbarui dan perangkat dengan kemampuan terbatas
  dapat terasa seperti hang.
  
- Bukti:
  
  - Pada baseline S1 ditemukan long task sekitar 80 ms yang berkaitan dengan
    fungsi `urutkanGelembung`.
  - Bottom-up trace menunjukkan fungsi tersebut menyumbang sekitar 60% waktu
    CPU ketika proses sorting berlangsung.
  - Setelah perbaikan, INP S1 turun dari 2000 ms menjadi 80 ms.
  - Long task terlama S1 turun dari 1455 ms menjadi 211 ms.
  - Target long task terlama <= 100 ms belum tercapai.
  - Implementasi akhir pada `util.js` menggunakan
    `daftar.slice().sort(banding)`.
- Akar masalah dan mekanismenya: Implementasi awal menggunakan bubble sort yang
  mempunyai kompleksitas O(n²). Ketika jumlah data bertambah, jumlah operasi
  perbandingan dan pertukaran meningkat secara kuadratik.
  
  Proses sorting dijalankan pada main thread JavaScript. Selama task tersebut
  berjalan, browser tidak dapat menggunakan main thread untuk melakukan
  pekerjaan rendering atau merespons input dengan normal. Akibatnya,
  pembaruan hasil pencarian dapat tertunda dan pengguna merasakan input yang
  terlambat.
  
  Pada versi perbaikan, fungsi tersebut menggunakan
  `Array.prototype.sort()` dengan comparison function. Implementasi ini
  memungkinkan engine JavaScript menggunakan algoritma sorting internal yang
  lebih sesuai untuk data berukuran besar dibandingkan bubble sort.
  
- Kualitas yang terdampak (ISO/IEC 25010): `performance efficiency`, terutama
  `time behaviour`, terdampak karena sorting yang lebih mahal memperpanjang
  task pada main thread. Dampaknya terhadap `interaction capability`, terutama
  `operability`, muncul ketika keterlambatan pemrosesan membuat input pencarian
  tidak segera menghasilkan pembaruan visual.
  
- Perbaikan: Mengganti implementasi bubble sort pada `urutkanGelembung()`:
  
  `daftar.slice().sort(banding)`
  
  Dengan perubahan tersebut, daftar tetap disalin sebelum diurutkan sehingga
  tidak mengubah array asli, sementara proses pengurutan diserahkan kepada
  built-in sorting engine JavaScript.
  
- Trade-off:
  
  - Alternatif yang dipertimbangkan:
    1. Insertion sort, tetapi tetap memiliki kompleksitas O(n²) pada kasus
      umum sehingga tidak menyelesaikan masalah utama secara memadai.
    2. `sort()` tanpa comparison function, tetapi akan menyebabkan nilai
      dibandingkan sebagai string sehingga tidak sesuai untuk pengurutan
      numerik.
    3. Library eksternal seperti `lodash.sortBy`, tetapi tidak diperbolehkan
      berdasarkan aturan tugas.
  - Harga dari pilihan: Built-in `sort()` dapat memiliki perilaku implementasi
    yang bergantung pada JavaScript engine. Selain itu, penggunaan
    `slice()` membuat salinan array sehingga membutuhkan memori tambahan
    sebesar O(n). Dalam kasus ini, tambahan tersebut masih dapat diterima
    karena diperlukan agar array sumber tidak berubah.
- Hasil: Hasil aktual menunjukkan peningkatan besar pada respons interaksi S1.
  INP turun dari 2000 ms menjadi 80 ms, sehingga berada di bawah target
  <= 200 ms.
  
  Long task terlama juga turun dari 1455 ms menjadi 211 ms. Namun hasil ini
  masih berada di atas target <= 100 ms. Karena angka 211 ms merupakan long
  task terlama pada keseluruhan skenario S1 dan bukan pengukuran khusus fungsi
  `urutkanGelembung`, angka tersebut tidak dapat dianggap sebagai durasi
  sorting setelah perbaikan.
  
  Dengan demikian, prediksi bahwa sorting dapat turun menjadi sekitar 15 ms
  tidak dapat dibuktikan secara langsung dari data pengukuran yang tersedia.
  Yang dapat dibuktikan adalah perbaikan pada respons interaksi secara
  keseluruhan, dengan INP turun dari 2000 ms menjadi 80 ms.

## 5. Dugaan yang ternyata keliru

Dugaan dari catatan serah terima, dari tiket, atau dari tim Anda sendiri yang terbantah oleh
pengukuran. Sertakan angkanya. Bagian ini sama pentingnya dengan bagian temuan.

## 6. Yang belum beres dan rekomendasi

Masalah yang tersisa, risiko, dan usulan untuk tim lain (backend, vendor SDK, desain).

## 7. Pernyataan penggunaan AI dan pembagian kerja

Alat AI yang dipakai dan untuk apa. Kontribusi tiap anggota.
