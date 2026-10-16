// Elemen kampanye: hitung mundur, teks berjalan, dan banner promo.

import { $, el, tampilkanToast } from './util.js';

// Flash sale berakhir tengah malam nanti (waktu perangkat).
// Dulu setHours(2911, ...) -> berakhir ~121 hari lagi. Jam 24 = tengah malam berikutnya.
function akhirFlashSale() {
  const t = new Date();
  t.setHours(24, 0, 0, 0);
  return t.getTime();
}

const duaDigit = (n) => String(n).padStart(2, '0');

function pasangHitungMundur() {
  const akhir = akhirFlashSale();
  const awal = Date.now();
  const wadah = $('#hitung-mundur');
  const garis = $('#hm-garis');
  const jam = $('#hm-jam'), menit = $('#hm-menit'), detik = $('#hm-detik'), senti = $('#hm-senti');

  // Lebar wadah diukur sekali (dan saat resize), tidak lagi di setiap tick.
  let lebarPenuh = wadah.offsetWidth;
  window.addEventListener('resize', () => { lebarPenuh = wadah.offsetWidth; });

  function tik() {
    const sisa = Math.max(akhir - Date.now(), 0);
    jam.textContent = duaDigit(Math.floor(sisa / 3600000));
    menit.textContent = duaDigit(Math.floor((sisa % 3600000) / 60000));
    detik.textContent = duaDigit(Math.floor((sisa % 60000) / 1000));
    senti.textContent = duaDigit(Math.floor((sisa % 1000) / 10));
    garis.style.width = Math.round(lebarPenuh * (sisa / (akhir - awal + 1))) + 'px';
    if (sisa > 0) requestAnimationFrame(tik);
  }
  requestAnimationFrame(tik);
}

function pasangTeksBerjalan() {
  const teks = $('#berjalan-teks');
  const induk = teks.parentElement;
  let lebarInduk = induk.offsetWidth;
  let lebarTeks = teks.offsetWidth;
  window.addEventListener('resize', () => { lebarInduk = induk.offsetWidth; lebarTeks = teks.offsetWidth; });

  const KECEPATAN = 100; // px per detik (setara 1px per 10 ms seperti sebelumnya)
  let x = lebarInduk;
  let terakhir = performance.now();
  function geser(sekarang) {
    x -= ((sekarang - terakhir) / 1000) * KECEPATAN;
    terakhir = sekarang;
    if (x < -lebarTeks) x = lebarInduk;
    teks.style.left = x + 'px';
    requestAnimationFrame(geser);
  }
  requestAnimationFrame(geser);
}

async function pasangBannerPromo() {
  let promo;
  try {
    const respons = await fetch('/api/promo');
    if (!respons.ok) return;
    promo = await respons.json();
  } catch (galat) {
    console.error(galat);
    return; // banner opsional, jangan ganggu halaman
  }

  const banner = el('section', 'promo-banner');
  const teks = el('div');
  teks.append(el('h2', '', promo.judul), el('p', '', promo.isi));
  const tombol = el('button', '', promo.tombol);
  tombol.type = 'button';
  tombol.addEventListener('click', () => {
    tampilkanToast('Syarat promo: berlaku 12 Desember, satu voucher per akun, tidak bisa digabung.');
    if (window.Lacak) window.Lacak.kirim('promo_click', { judul: promo.judul });
  });
  banner.append(teks, tombol);

  $('#utama').prepend(banner);
}

export function pasangPromo() {
  pasangHitungMundur();
  pasangTeksBerjalan();
  pasangBannerPromo();
}
