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

  ### T-03: Pemrosesan voucher yang terlalu lama pada `hitungHargaPromo`

- Tiket terkait: TK-1057
  
- Gejala bagi pengguna: Ketika pengguna memasukkan voucher KILAT1212,
  halaman terlihat seperti membeku dalam waktu yang lama. Progress bar tidak
  memberikan umpan balik yang cukup cepat dan interaksi lain seperti scrolling
  terasa tidak responsif.
  
- Bukti:
  
  - Pada baseline S4 ditemukan long task sekitar 1696 ms.
  - Trace menunjukkan `terapkanVoucher` dan `hitungHargaPromo` sebagai bagian
    dari task yang dominan pada main thread.
  - Fungsi `simulasiCicilan` dan loop pemrosesan produk menyumbang sebagian
    besar waktu CPU.
  - Setelah perbaikan, INP S4 turun dari 1696 ms menjadi 496 ms.
  - Progress dapat diperbarui secara bertahap selama proses berlangsung.
  - Walaupun terjadi peningkatan, belum tersedia target numerik pada tabel S4
    untuk menentukan apakah hasil 496 ms sudah memenuhi target.
- Akar masalah dan mekanismenya: Perhitungan harga voucher melibatkan
  `simulasiCicilan()` yang melakukan perulangan hingga 24 tenor dan melakukan
  perhitungan tambahan untuk setiap bulan pada tenor tersebut.
  
  Fungsi `terapkanVoucher()` memproses produk dalam batch berisi 50 produk.
  Setelah satu batch selesai, fungsi `beri_napas()` menggunakan Promise dan
  `setTimeout(..., 0)` untuk memberikan kesempatan kepada browser melakukan
  rendering dan memproses input sebelum batch berikutnya.
  
  Mekanisme ini penting karena membuat pekerjaan tidak menjadi satu task
  JavaScript panjang yang berjalan terus-menerus. Browser memperoleh rendering
  opportunity di antara batch, sehingga progress bar dapat diperbarui dan
  interaksi pengguna memiliki kesempatan untuk diproses.
  
  Perlu diluruskan bahwa solusi akhir pada kode yang diperiksa tidak
  menggunakan `Promise.all()` seperti yang diprediksi pada PREDIKSI.md.
  Pemrosesan tetap dilakukan secara sekuensial dalam batch, tetapi diselingi
  dengan jeda melalui `beri_napas()`.
  
- Kualitas yang terdampak (ISO/IEC 25010): `performance efficiency`,
  khususnya `time behaviour`, terdampak karena perhitungan voucher memerlukan
  CPU time yang cukup besar. Selain itu, `interaction capability`, khususnya
  `operability` dan `user engagement`, terdampak karena pengguna mendapatkan
  feedback yang terlambat ketika aplikasi sedang menghitung voucher.
  
- Perbaikan: Memproses produk dalam batch sebanyak 50 produk dan memberikan
  browser kesempatan untuk menggambar progress serta merespons input setelah
  setiap batch melalui:
  
  `await beri_napas();`
  
  Dengan pendekatan tersebut, seluruh perhitungan tetap dilakukan sehingga
  aturan bisnis voucher dan simulasi cicilan tidak dihapus, tetapi pekerjaan
  tidak lagi dijalankan sebagai satu task panjang tanpa kesempatan rendering.
  
- Trade-off:
  
  - Alternatif yang dipertimbangkan:
    1. Web Worker untuk memindahkan perhitungan dari main thread, tetapi
      tidak dipilih karena menambah kompleksitas komunikasi dan transfer data.
    2. `Promise.all()` untuk menjalankan seluruh perhitungan secara paralel,
      tetapi tidak digunakan pada implementasi akhir karena menjalankan
      terlalu banyak pekerjaan sekaligus dapat meningkatkan penggunaan memori
      dan CPU.
    3. Menghapus simulasi cicilan, tetapi tidak diperbolehkan karena simulasi
      cicilan merupakan bagian dari aturan bisnis voucher.
  - Harga dari pilihan: Pemrosesan dalam batch masih menggunakan main thread,
    sehingga pekerjaan CPU tetap dilakukan oleh thread utama. Selain itu,
    proses keseluruhan tidak menjadi benar-benar paralel. Keuntungannya adalah
    pekerjaan dapat diselingi dengan rendering dan input processing tanpa
    mengubah aturan bisnis.
- Hasil: Hasil pengukuran menunjukkan INP S4 turun dari 1696 ms menjadi
  496 ms. Artinya, respons interaksi meningkat secara signifikan, meskipun
  hasil aktual belum mencapai angka sekitar 300 ms yang diprediksi.
  
  Prediksi awal mengusulkan `Promise.all()` sebagai mekanisme paralelisasi,
  tetapi implementasi akhir menggunakan pendekatan batching dan
  `setTimeout(0)` melalui `beri_napas()`. Jadi, penurunan waktu bukan
  disebabkan oleh paralelisasi penuh seperti yang diprediksi, melainkan karena
  pekerjaan panjang dipecah menjadi beberapa bagian sehingga browser mendapat
  rendering opportunity di antara batch.
  
  Dengan demikian, prediksi arah perbaikannya benar bahwa pemecahan pekerjaan
  dapat meningkatkan responsivitas, tetapi mekanisme dan angka hasil akhirnya
  berbeda dari prediksi.

### T-04: Dugaan logging berlebihan pada `gulir.js` ternyata tidak terbukti

- Tiket terkait: TK-1063
  
- Gejala bagi pengguna: Pengguna melaporkan scrolling daftar produk terasa
  patah-patah atau stutter.
  
- Bukti:
  
  - Baseline S5 menunjukkan 108 frame dengan durasi > 50 ms per 10 detik.
  - Baseline S6 menunjukkan 106 frame dengan durasi > 50 ms per 10 detik.
  - PREDIKSI.md menduga penyebabnya adalah `console.log` berlebihan di
    `gulir.js`.
  - Setelah kode diperiksa, tidak ditemukan statement `console.log`,
    `console.debug`, atau logging sinkron lain di dalam `gulir.js`.
  - `periksaGulir()` justru menggunakan `IntersectionObserver` untuk
    mengamati kartu yang masuk viewport.
  - Pencatatan impresi dilakukan melalui `window.Lacak.kirim()` hanya ketika
    terdapat impresi baru.
  - Hasil akhir S5 menunjukkan frame > 50 ms turun dari 108 menjadi 0.
  - Hasil akhir S6 menunjukkan frame > 50 ms turun dari 106 menjadi 1.
- Akar masalah dan mekanismenya: Dugaan awal mengenai logging tidak sesuai
  dengan implementasi kode yang ditemukan. Tidak terdapat operasi
  `console.log` berlebihan yang dapat dihapus.
  
  Implementasi `gulir.js` menggunakan `requestAnimationFrame()` untuk
  menjadwalkan pembaruan header dan progress bar paling banyak sekali per
  frame. Selain itu, `IntersectionObserver` digunakan untuk memproses kartu
  yang masuk viewport, sehingga browser tidak perlu menjalankan pemeriksaan
  posisi seluruh kartu pada setiap event scroll.
  
  Dengan demikian, mekanisme yang relevan terhadap performa scrolling adalah
  pembatasan pekerjaan per frame dan penggunaan `IntersectionObserver`, bukan
  penghapusan `console.log`.
  
- Kualitas yang terdampak (ISO/IEC 25010): `performance efficiency`,
  terutama `time behaviour`, berhubungan langsung dengan kelancaran frame
  rendering. Dari sisi `interaction capability`, scrolling yang lebih lancar
  mendukung `operability` dan `user engagement` karena pengguna dapat
  menjelajahi daftar produk tanpa gangguan visual yang signifikan.
  
- Perbaikan: Tidak ada perbaikan yang dilakukan terhadap `console.log` karena
  statement tersebut memang tidak ditemukan.
  
  Pendekatan yang sudah terdapat pada `gulir.js` dan relevan terhadap masalah
  scrolling adalah:
  
  1. menggunakan `requestAnimationFrame()` untuk pekerjaan visual yang
    berkaitan dengan scroll;
  2. menggunakan `IntersectionObserver` untuk mendeteksi kartu yang masuk
    viewport;
  3. menggunakan `Set` dan `WeakSet` agar kartu dan impresi yang sama tidak
    diproses berulang;
  4. mengirim data impresi melalui `window.Lacak.kirim()` hanya ketika
    diperlukan.
- Trade-off:
  
  - Alternatif yang dipertimbangkan:
    1. Menghapus `console.log`, tetapi tidak dilakukan karena tidak terdapat
      logging tersebut.
    2. Mengubah `console.log` menjadi `console.debug`, tetapi tidak relevan
      karena sumber masalah yang diprediksi tidak ada.
    3. Menggunakan `requestAnimationFrame()` untuk membatasi pekerjaan scroll,
      yang memang sesuai dengan kebutuhan rendering dan sudah diterapkan.
  - Harga dari pendekatan ini: `IntersectionObserver` dan struktur tracking
    tambahan membuat implementasi sedikit lebih kompleks. Selain itu,
    browser lama yang tidak mendukung `IntersectionObserver` memerlukan
    fallback yang menampilkan seluruh kartu.
- Hasil: Prediksi awal terbukti tidak tepat. Tidak ada `console.log` berlebihan
  pada `gulir.js`, sehingga tidak ada operasi logging sinkron yang dapat
  dihapus.
  
  Meskipun demikian, hasil pengukuran akhir menunjukkan perbaikan scrolling
  yang sangat besar. Frame > 50 ms pada S5 turun dari 108 menjadi 0 dan pada
  S6 turun dari 106 menjadi 1. Kedua hasil tersebut memenuhi target <= 2.
  
  Namun, penurunan tersebut tidak boleh diklaim sebagai akibat penghapusan
  `console.log`, karena operasi tersebut tidak pernah ada. Hasil ini lebih
  tepat dikaitkan dengan perubahan performa lain yang dilakukan pada aplikasi,
  terutama optimasi pekerjaan main thread, pemrosesan DOM, dan mekanisme
  rendering/observasi elemen.
  
  Temuan ini menunjukkan bahwa dugaan penyebab dari catatan awal perlu
  diverifikasi melalui source code dan trace sebelum perbaikan dilakukan.

## 5. Dugaan yang ternyata keliru

Dugaan dari catatan serah terima, dari tiket, atau dari tim Anda sendiri yang terbantah oleh
pengukuran. Sertakan angkanya. Bagian ini sama pentingnya dengan bagian temuan.

## 6. Yang belum beres dan rekomendasi

Masalah yang tersisa, risiko, dan usulan untuk tim lain (backend, vendor SDK, desain).

## 7. Pernyataan penggunaan AI dan pembagian kerja

Alat AI yang dipakai dan untuk apa. Kontribusi tiap anggota.
