// Bagian kaki halaman: merek paling laris & kategori yang sering dibeli bersamaan.

import { $, el, urutkanGelembung } from './util.js';

export function pasangKaki(semuaProduk) {
  // --- merek paling laris ---
  const terjualPerMerek = {};
  for (const p of semuaProduk) terjualPerMerek[p.merek] = (terjualPerMerek[p.merek] || 0) + p.terjual;
  const merek = Object.keys(terjualPerMerek).map((nama) => ({ nama, terjual: terjualPerMerek[nama] }));
  const teratas = urutkanGelembung(merek, (a, b) => b.terjual - a.terjual).slice(0, 5);
  const daftarMerek = $('#merek-populer');
  for (const m of teratas) daftarMerek.append(el('li', '', m.nama + ' (' + m.terjual.toLocaleString('id-ID') + ' terjual)'));

  // --- kategori terkait ---
  // Jumlah kategori unik sedikit, jadi pencarian sederhana sudah cukup.
  // Skor pasangan (i, j) = (A[i] + B[j]) % 97; dipilih j != i dengan skor tertinggi
  // (seri -> indeks terkecil). Hasilnya sama dengan skema skor sebelumnya.
  const kategori = [...new Set(semuaProduk.map((p) => p.kategori))];
  const daftarTerkait = $('#kategori-terkait');

  const A = kategori.map((k, i) => (k.length * 31 + i) % 97);
  const B = kategori.map((k) => (k.length * 17) % 97);

  const potongan = document.createDocumentFragment();
  for (let i = 0; i < kategori.length; i++) {
    let terbaik = -1;
    let skorTerbaik = -1;
    for (let j = 0; j < kategori.length; j++) {
      if (j === i) continue;
      const skor = (A[i] + B[j]) % 97;
      if (skor > skorTerbaik) { skorTerbaik = skor; terbaik = j; }
    }
    // Hanya satu kategori -> tampilkan namanya saja, tanpa "+" menggantung.
    potongan.append(el('li', '', terbaik >= 0 ? kategori[i] + ' + ' + kategori[terbaik] : kategori[i]));
  }
  daftarTerkait.append(potongan);
}
