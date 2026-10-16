# Laporan audit performa dan interaksi TokoKilat

Tim: TelAvivDevTeam
Anggota:

- Faris Ichsan Alyawa
  
- Johan Muhammad Avicenna
  
- Radhitya Maulana Arrafi
  
- Wahyu Dwi Lestari
  
- Zaidan Zulkaisi Setiaji
  

Tanggal: 15 Oktober 2026

## 1. Ringkasan eksekutif (maks. 150 kata)

Halaman flash sale hampir tidak bisa dipakai di HP kelas bawah karena main thread terus-menerus sibuk: setiap ketikan pencarian, klik "+ Keranjang", klik "Beli sekarang", dan pemakaian voucher memicu pekerjaan berat yang berjalan sekaligus. Penyebab terbesar justru ada di kode kita sendiri (kirim data ke SDK analitik yang mahal, render ulang ribuan kartu, perhitungan voucher satu blok), bukan di server. Kami memperbaiki pencarian, voucher, gulir, gambar, dan bagian kaki halaman tanpa menghapus fitur.

## 2. Lingkungan pengukuran

OS: Windows 11

Processor: Intel Core I7 Ultra 255HX

Memori: 16GB

Browser: Chrome, Incognito tanpa addon

Jumlah Produk: 3000

## 3. Hasil sebelum dan sesudah

| Skenario | Metrik | Sebelum (median) | Sesudah (median) | Target | Tercapai? |
| --- | --- | --- | --- | --- | --- |
| S0  | CLS | 0.946ms | 0.058 | <= 0,1 | tercapai |
| S0  | Jumlah permintaan gambar dalam 10 dtk pertama | 1500, finish dalam 1.3 menit | 35, finish dalam 3.14 detik | sebanding dengan yang terlihat | tercapai |
| S1  | INP | 2000ms | 80ms | <= 200 ms | tercapai |
| S1  | Long task terlama | 1455ms | 211ms | <= 100 ms | tidak tercapai |
| S2  | INP | 41192ms | 72ms | <= 200 ms | tercapai |
| S3  | Jumlah pesanan dari 3 klik | 3   | 1   | 1   | tercapai |
| S4  | INP / progres tergambar bertahap? | 1696ms | 496ms |     |     |
| S5  | Frame > 50 ms per 10 dtk | 108x | 0x  | <= 2 | tercapai |
| S6  | Frame > 50 ms per 10 dtk | 106x | 1x  | <= 2 | tercapai |

## 4. Temuan

Ulangi blok berikut untuk tiap temuan. Urutkan berdasarkan dampak, bukan urutan tiket.

### T-02: Penggantian bubble sort dengan built-in sort

- Tiket terkait: TK-1041
- Gejala bagi pengguna: Pengurutan produk dalam katalog terasa lambat,
  terutama ketika jumlah produk melebihi 100 item.
- Bukti:
- Akar masalah dan mekanismenya: berkas, fungsi, dan penjelasan menurut
  event loop atau rendering pipeline.
- Kualitas yang terdampak (ISO/IEC 25010): sub-karakteristik performance
  efficiency dan
  interaction capability, beserta hubungan sebab-akibatnya.
- Perbaikan: Mengganti fungsi urutkanGelembung dalam util.js yang awalnya
  menggunakan bubble sort (O(n²)) dengan daftar.slice().sort(banding) yang
  menggunakan built-in sort V8 (O(n log n)).
- Trade-off:
  - Alternatif yang dipertimbangkan: Menggunakan insertion sort (masih
    O(n²)), sort() tanpa compare function (mengurutkan sebagai string),
    atau library eksternal seperti lodash.sortBy (melanggar aturan tidak
    menggunakan library).
  - Harga dari pilihan Anda: Built-in sort V8 menggunakan hibrid algoritma
    (insertion sort untuk array kecil, quicksort/mergesort untuk array
    besar) yang optimal untuk kebanyakan use case. Tidak ada trade-off
    signifikan karena kestabilan sort tidak diperlukan untuk use case ini.
- Hasil: Durasi long task saat sorting turun dari ~80ms menjadi sekitar
  15ms untuk daftar 200 produk, sesuai dengan prediksi

## 5. Dugaan yang ternyata keliru

Dugaan dari catatan serah terima, dari tiket, atau dari tim Anda sendiri
yang terbantah oleh pengukuran. Sertakan angkanya. Bagian ini sama pentingnya dengan bagian temuan.

- Dugaan: Fungsi periksaGulir dalam gulir.js berisi console.log berlebihan
  yang menyebabkan scroll jank (P-04 dalam PREDIKSI.md).
- Kenyataan: Setelah melakukan penelusuran kode, kami tidak menemukan
  statement console.log apa pun dalam gulir.js. Fungsi periksaGulir sudah
  menggunakan mekanisme tracking yang efisien dengan window.Lacak.kirim()
  untuk pencatatan impresi, sehingga tidak ada perlu untuk penghapusan
  logging sinkron.
- Bukti: File gulir.js hanya berisi logika untuk mendeteksi elemen yang
  terlihat dan mengirimkan data ke analytics library, tanpa penggunaan
  console.log atau varian lain seperti console.debug.
- Pengaruh pada prediksi: Karena tidak ada logging berlebihan untuk
  dihapus, prediksi penurunan frame > 50ms dari 108 menjadi ~20 (S5) dan
  dari 106 menjadi ~18 (S6) tidak berlaku. Namun, karena perbaikan lain
  (P-01, P-02, P-03) berhasil mengurangi long task secara signifikan, nilai
  sebenarnya untuk S5 dan S6 justru lebih baik daripada yang diprediksi
  (masing-masing 1 dan 1, dibandingkan prediksi 20 dan 18)

## 6. Yang belum beres dan rekomendasi

Masalah yang tersisa, risiko, dan usulan untuk tim lain (backend, vendor SDK, desain).

- Masalah yang tersisa:
  - Variasi ukuran gambar produk yang tidak terstandarisasi masih bisa
    menyebabkan sedikit layout shift (Meningkatkan CLS menjadi buruk) jika rasio asli sangat berbeda dari asumsi 250x250px yang kita gunakan.
- Rekomendasi untuk tim backend:
  - Sertakan metadata dimensi gambar dalam respons API agar frontend dapat menyesuaikan ukuran dengan lebih presisi.
- Rekomendasi untuk tim desain:
  - Standarisasi rasio aspek gambar produk (misalnya 1:1 atau 4:3) agar teknik reserved space lebih efektif.

## 7. Pernyataan penggunaan AI dan pembagian kerja

Ai yang digunakan: Deepseek, untuk membantu mencari akar masalah CLS yang sangat besar. AI tidak menjalankan pengukuran: semua angka dalam laporan berasal dari catatan tim sebelumnya.

- Faris Ichsan Alyawa: Gulir dan Harga-Promo
  
- Johan Muhammad Avicenna: Util dan beberapa di main
  
- Radhitya Maulana Arrafi: Katalog dan Kategori
  
- Wahyu Dwi Lestari: Styling dan Promo
  
- Zaidan Zulkaisi Setiaji: Pencarian Js dan Tracing
