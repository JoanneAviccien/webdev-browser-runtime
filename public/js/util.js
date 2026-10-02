// Fungsi bantu yang dipakai di banyak tempat.

export const $ = (selektor, akar = document) => akar.querySelector(selektor);

export function el(tag, kelas, teks) {
  const node = document.createElement(tag);
  if (kelas) node.className = kelas;
  if (teks !== undefined) node.textContent = teks;
  return node;
}

// Pemformat dibuat sekali saja (membuat Intl.NumberFormat itu mahal, dan dipanggil per kartu).
const pemformatRupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatRupiah(angka) {
  return pemformatRupiah.format(angka);
}

export function formatRibuan(angka) {
  if (angka >= 1000) return (Math.floor(angka / 100) / 10).toLocaleString('id-ID') + ' rb';
  return String(angka);
}

export function hargaSetelahDiskon(produk) {
  return Math.round((produk.harga * (100 - produk.diskon)) / 100 / 100) * 100;
}

// Salinan dalam (deep copy) supaya objek konfigurasi tidak termutasi.
export function salinDalam(objek) {
  return JSON.parse(JSON.stringify(objek));
}

// Pengurutan sederhana, dipakai untuk daftar pendek di bagian kaki halaman.
export function urutkanGelembung(daftar, banding) {
  return daftar.slice().sort(banding);
}

let pengaturWaktuToast;
export function tampilkanToast(pesan) {
  const toast = $('#toast');
  toast.textContent = pesan;
  toast.classList.add('tampil');
  clearTimeout(pengaturWaktuToast);
  pengaturWaktuToast = setTimeout(() => toast.classList.remove('tampil'), 2600);
}
