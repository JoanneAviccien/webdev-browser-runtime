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

### T-01: Pemrosesan kategori dan query DOM berulang pada `kategori.js`

- Tiket terkait: TK-1078, TK-1081
  
- Gejala bagi pengguna: Halaman terasa berat ketika daftar produk dimuat dan
  pengguna mulai berinteraksi dengan halaman. Pada kondisi baseline, proses
  JavaScript pada main thread berlangsung cukup lama sehingga dapat menunda
  kesempatan browser untuk melakukan rendering dan merespons input pengguna.
  Gejala yang berkaitan dengan gambar yang terlambat muncul juga terlihat pada
  S0, dengan 1500 permintaan gambar pada 10 detik pertama dan proses selesai
  sekitar 1,3 menit.
  
- Bukti:
  
  - Pada trace baseline S0 ditemukan long task sekitar 1200 ms.
  - Fungsi `pasangKaki` pada `kategori.js` terlihat sebagai bagian dominan
    dari pemrosesan main thread.
  - Prediksi awal menunjukkan bahwa operasi DOM berulang di dalam proses
    perhitungan kategori dapat memperpanjang task.
  - Setelah perbaikan, jumlah permintaan gambar pada 10 detik pertama turun
    dari 1500 menjadi 35 dan waktu penyelesaiannya turun dari sekitar 1,3 menit
    menjadi 3,14 detik.
  - CLS juga turun dari 0,946 menjadi 0,058 sehingga berada di bawah target
    0,1.
  - Namun, angka durasi long task khusus `pasangKaki` setelah perbaikan tidak
    dicatat secara terpisah dalam tabel hasil, sehingga penurunan dari 1200 ms
    ke angka tertentu tidak dapat diklaim secara langsung.
- Akar masalah dan mekanismenya: Pada versi awal, proses `pasangKaki` memiliki
  pemrosesan kategori yang menggunakan loop bersarang dan operasi DOM berulang.
  Operasi DOM seperti `querySelectorAll()` yang dilakukan berulang dapat
  menambah pekerjaan pada main thread dan berpotensi mengganggu rendering
  opportunity. Ketika JavaScript masih menjalankan task yang panjang, browser
  memiliki lebih sedikit kesempatan untuk menjalankan style calculation,
  layout, paint, dan merespons input pengguna.
  
  Pada versi perbaikan, pencarian elemen DOM dipindahkan keluar dari proses
  perhitungan pasangan kategori dan hasil tampilan dikumpulkan menggunakan
  `DocumentFragment`. Dengan demikian, perubahan DOM tidak dilakukan satu per
  satu selama proses perhitungan.
  
  Perlu dicatat bahwa implementasi akhir masih menggunakan loop bersarang
  terhadap daftar kategori. Namun jumlah kategori unik jauh lebih kecil dan
  relatif konstan dibandingkan jumlah produk, sehingga biaya tersebut tidak
  lagi bergantung langsung pada jumlah seluruh produk seperti pada dugaan awal.
  
- Kualitas yang terdampak (ISO/IEC 25010): Sub-karakteristik `performance
  efficiency`, terutama `time behaviour`, terdampak karena pekerjaan JavaScript
  yang panjang meningkatkan waktu yang diperlukan browser untuk menyelesaikan
  task. Hal tersebut juga berkaitan dengan `interaction capability`, terutama
  `operability`, karena task yang panjang dapat menunda respons terhadap
  interaksi pengguna.
  
- Perbaikan: Mengurangi operasi DOM yang dilakukan berulang pada proses
  perhitungan kategori. Hasil kategori dikumpulkan terlebih dahulu menggunakan
  `DocumentFragment`, kemudian dimasukkan ke DOM secara lebih efisien.
  
- Trade-off:
  
  - Alternatif yang dipertimbangkan:
    1. Menghapus fitur kategori terkait sepenuhnya, tetapi tidak dipilih karena
      fitur tersebut merupakan bagian dari kebutuhan aplikasi.
    2. Menggunakan `requestIdleCallback` untuk menunda pekerjaan DOM, tetapi
      tidak dipilih karena pekerjaan tetap harus dilakukan dan penundaan saja
      tidak menghilangkan biaya pemrosesannya.
    3. Membatasi jumlah kategori yang diproses, tetapi tidak dipilih karena
      dapat membuat hasil kategori menjadi tidak lengkap.
  - Harga dari pilihan: Implementasi menjadi sedikit lebih kompleks karena
    hasil perlu ditampung sementara sebelum dimasukkan ke DOM. Namun jumlah
    elemen yang ditampung relatif kecil sehingga penggunaan memori tambahan
    masih terbatas.
- Hasil: Prediksi bahwa pengurangan pekerjaan DOM akan mengurangi beban main
  thread didukung oleh hasil keseluruhan S0. Jumlah permintaan gambar pada
  10 detik pertama turun dari 1500 menjadi 35 dan waktu penyelesaiannya turun
  dari sekitar 1,3 menit menjadi 3,14 detik. CLS juga turun dari 0,946 menjadi
  0,058.
  
  Namun, prediksi spesifik bahwa long task S0 akan turun dari sekitar 1200 ms
  menjadi 150 ms tidak dapat diverifikasi dari data akhir karena durasi
  `pasangKaki` setelah perbaikan tidak dicatat secara terpisah. Oleh karena
  itu, hasil tersebut menunjukkan perbaikan pada performa keseluruhan S0,
  tetapi tidak cukup untuk menyatakan bahwa target 150 ms pada fungsi tersebut
  benar-benar tercapai.

### T-02: Penggantian bubble sort dengan built-in sort

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
