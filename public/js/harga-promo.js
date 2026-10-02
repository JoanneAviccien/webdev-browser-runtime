// Voucher: menghitung harga promo untuk setiap produk.
// Aturan promo bertingkat + simulasi cicilan ditentukan tim bisnis.

import { $, hargaSetelahDiskon, tampilkanToast } from './util.js';
import { keadaan, perbaruiHargaVoucherDiKartu } from './katalog.js';

const VOUCHER = {
  KILAT1212: { persen: 12, maksPotongan: 120000, minBelanja: 50000 },
  HEMAT50: { persen: 5, maksPotongan: 50000, minBelanja: 0 },
};

// Cicilan 0% sampai 24 bulan: cari tenor dengan angsuran paling ringan yang
// masih memenuhi batas minimal angsuran per bulan dari mitra pembiayaan.
function simulasiCicilan(harga) {
  let terbaik = { tenor: 1, angsuran: harga };
  for (let tenor = 1; tenor <= 24; tenor++) {
    let sisa = harga;
    let angsuran = Math.ceil(harga / tenor / 100) * 100;
    for (let bulan = 1; bulan <= tenor; bulan++) {
      const biayaAdmin = Math.round(sisa * 0.0005 * Math.log2(bulan + 1));
      sisa = sisa - angsuran + biayaAdmin;
      if (sisa < 0) sisa = 0;
    }
    angsuran += Math.ceil(sisa / tenor);
    if (angsuran >= 25000 && angsuran < terbaik.angsuran) terbaik = { tenor, angsuran };
  }
  return terbaik;
}

function hitungHargaPromo(produk, aturan) {
  const dasar = hargaSetelahDiskon(produk);
  if (dasar < aturan.minBelanja) return null;
  let potongan = Math.min(Math.round((dasar * aturan.persen) / 100), aturan.maksPotongan);
  if (produk.flashSale) potongan = Math.round(potongan / 2); // flash sale hanya dapat setengah
  const hargaAkhir = Math.max(dasar - potongan, 100);
  // (Dihapus: 40x simulasiCicilan "cek kestabilan" per produk, hasilnya tidak dipakai
  // dan membuat halaman membeku.)
  return { hargaAkhir, cicilan: simulasiCicilan(hargaAkhir) };
}

const beri_napas = () => new Promise((selesai) => setTimeout(selesai, 0));
let sedangMenghitung = false;

async function terapkanVoucher(kode) {
  const aturan = VOUCHER[kode];
  if (!aturan) {
    tampilkanToast('Kode voucher "' + kode + '" tidak dikenal. Coba KILAT1212.');
    return;
  }
  if (sedangMenghitung) return;
  sedangMenghitung = true;

  try {
    const progres = $('#progres');
    const isi = $('#progres-isi');
    const teks = $('#progres-teks');
    progres.hidden = false;
    isi.style.width = '0%';

    const total = keadaan.semuaProduk.length;
    let selesai = 0;
    keadaan.hargaVoucher.clear();
    const ukuranBatch = 50;

    for (let i = 0; i < total; i += ukuranBatch) {
      const batch = keadaan.semuaProduk.slice(i, i + ukuranBatch);
      for (const produk of batch) {
        const hasil = hitungHargaPromo(produk, aturan);
        if (hasil) keadaan.hargaVoucher.set(produk.id, hasil.hargaAkhir);
        selesai++;
      }
      const persen = Math.round((selesai / total) * 100);
      isi.style.width = persen + '%';
      teks.textContent = 'Menghitung harga promo… ' + persen + '% (' + selesai + ' dari ' + total + ' produk)';
      await beri_napas(); // beri browser kesempatan menggambar progres & menanggapi input
    }

    perbaruiHargaVoucherDiKartu();
    progres.hidden = true;
    tampilkanToast('Voucher ' + kode + ' dipakai di ' + keadaan.hargaVoucher.size.toLocaleString('id-ID') + ' produk.');
    if (window.Lacak) window.Lacak.kirim('voucher_applied', { kode, jumlahProduk: keadaan.hargaVoucher.size });
  } finally {
    sedangMenghitung = false;
  }
}

export function pasangVoucher() {
  const kolom = $('#kolom-voucher');
  $('#tombol-voucher').addEventListener('click', () => terapkanVoucher(kolom.value.trim().toUpperCase()));
  kolom.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') terapkanVoucher(kolom.value.trim().toUpperCase());
  });
}