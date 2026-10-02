import { muatProduk, renderProduk } from './katalog.js';
import { pasangPencarian } from './pencarian.js';
import { pasangKeranjang, siapkanRiwayatContoh } from './keranjang.js';
import { pasangVoucher } from './harga-promo.js';
import { pasangPromo } from './promo.js';
import { pasangGulir } from './gulir.js';
import { pasangKaki } from './kategori.js';
import { $, el } from './util.js';

async function mulai() {
  pasangPromo();
  pasangGulir();

  let produk;
  try {
    produk = await muatProduk();
  } catch (galat) {
    console.error(galat);
    const kisi = $('#kisi');
    kisi.innerHTML = '';
    const kosong = el('div', 'kosong');
    kosong.append(el('strong', '', 'Produk gagal dimuat.'), el('p', '', 'Periksa koneksi internet lalu muat ulang halaman.'));
    kisi.append(kosong);
    return;
  }

  siapkanRiwayatContoh(produk);

  pasangPencarian();
  pasangKeranjang();
  pasangVoucher();
  renderProduk(produk); // produk tampil dulu, bagian kaki menyusul
  pasangKaki(produk);

  if (window.Lacak) window.Lacak.kirim('page_view', { halaman: 'flashsale-1212', jumlahProduk: produk.length });
}

mulai();

// Alat ukur untuk tugas: aktif jika URL diberi ?ukur=1
if (new URLSearchParams(location.search).has('ukur')) {
  import('/alat/ukur.js');
}
