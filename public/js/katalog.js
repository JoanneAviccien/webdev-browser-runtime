// Katalog: menyimpan data produk dan menggambar kisi kartu produk.

import { $, el, formatRupiah, formatRibuan, hargaSetelahDiskon } from './util.js';
import { tambahKeKeranjang, beliSekarang } from './keranjang.js';
import { periksaGulir } from './gulir.js';

export const keadaan = {
  semuaProduk: [],
  ditampilkan: [],
  hargaVoucher: new Map(), // id produk -> harga setelah voucher
};

export async function muatProduk() {
  const respons = await fetch('/api/produk');
  if (!respons.ok) throw new Error('Gagal memuat produk: HTTP ' + respons.status);
  const data = await respons.json();
  keadaan.semuaProduk = Array.isArray(data) ? data : [];
  return keadaan.semuaProduk;
}

function buatKartu(produk) {
  const kartu = el('article', 'kartu');
  kartu.dataset.id = produk.id;

  if (produk.flashSale) kartu.append(el('span', 'lencana-kilat', '⚡ Kilat'));

  const media = el('a', 'kartu-media');
  media.href = '#produk-' + produk.id;
  const gambar = document.createElement('img');
  gambar.loading = 'lazy';   // jangan unduh ribuan gambar sekaligus
  gambar.decoding = 'async';
  gambar.src = produk.gambar;
  gambar.alt = produk.nama;
  media.append(gambar);

  const badan = el('div', 'kartu-badan');
  badan.append(el('h3', 'kartu-judul', produk.nama));

  const harga = el('div', 'harga');
  harga.append(el('span', 'harga-kini', formatRupiah(hargaSetelahDiskon(produk))));
  if (produk.diskon > 0) {
    harga.append(el('span', 'harga-asli', formatRupiah(produk.harga)));
    harga.append(el('span', 'harga-diskon', '-' + produk.diskon + '%'));
  }
  const hargaVoucher = keadaan.hargaVoucher.get(produk.id);
  if (hargaVoucher) harga.append(el('span', 'harga-voucher', 'Pakai voucher: ' + formatRupiah(hargaVoucher)));
  badan.append(harga);

  const rating = Number(produk.rating) || 0;
  badan.append(el('div', 'keterangan', '★ ' + rating.toLocaleString('id-ID') + ' | ' + formatRibuan(produk.terjual || 0) + ' terjual'));
  badan.append(el('div', 'keterangan', produk.kota || ''));

  const aksi = el('div', 'aksi');
  const tombolTambah = el('button', 'tombol-tambah', '+ Keranjang');
  tombolTambah.type = 'button';
  tombolTambah.addEventListener('click', async () => {
    await tambahKeKeranjang(produk, tombolTambah);
  });
  const tombolBeli = el('button', 'tombol-beli', 'Beli sekarang');
  tombolBeli.type = 'button';
  tombolBeli.addEventListener('click', async () => {
    await beliSekarang(produk, tombolBeli);
  });
  aksi.append(tombolTambah, tombolBeli);
  badan.append(aksi);

  kartu.append(media, badan);
  return kartu;
}

// Judul produk panjangnya beda-beda (1-3 baris). Supaya harga & tombol sejajar,
// tinggi semua judul disamakan dengan judul tertinggi.
// Dulu hanya 24 judul pertama yang diukur sehingga judul lain bisa terpotong, dan
// tiap pengukuran memicu reflow. Sekarang: semua dibaca sekali, baru ditulis sekali.
function samakanTinggiJudul() {
  const judul = document.querySelectorAll('.kartu-judul');
  if (judul.length === 0) return;
  judul.forEach((j) => { j.style.height = 'auto'; });          // tulis semua
  let tertinggi = 0;
  for (const j of judul) tertinggi = Math.max(tertinggi, j.offsetHeight); // baca semua (1 reflow)
  const nilai = tertinggi + 'px';
  judul.forEach((j) => { j.style.height = nilai; });           // tulis semua
}

let pengaturResize;
window.addEventListener('resize', () => {
  clearTimeout(pengaturResize);
  pengaturResize = setTimeout(samakanTinggiJudul, 150);
});

export function renderProduk(daftar) {
  const kisi = $('#kisi');
  keadaan.ditampilkan = daftar;

  const potongan = document.createDocumentFragment();
  if (daftar.length === 0) {
    const kosong = el('div', 'kosong');
    kosong.append(el('strong', '', 'Produk tidak ditemukan.'), el('p', '', 'Periksa ejaan, atau coba kata kunci yang lebih umum seperti "sepatu" atau "serum".'));
    potongan.append(kosong);
  }
  for (const produk of daftar) potongan.append(buatKartu(produk));

  kisi.replaceChildren(potongan); // satu kali sentuh DOM

  samakanTinggiJudul();
  $('#ringkasan').textContent = daftar.length.toLocaleString('id-ID') + ' produk ditampilkan';
  periksaGulir();
}

export function perbaruiHargaVoucherDiKartu() {
  renderProduk(keadaan.ditampilkan);
}
