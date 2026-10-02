// Perilaku saat halaman digulir: bayangan header, bar progres baca,
// tombol "Ke atas", efek kartu muncul, dan pencatatan impresi produk.

import { $ } from './util.js';

const sudahTercatat = new Set();
const sudahDiamati = new WeakSet();
let pengamat = null;
let menunggu = false;

// Bagian ringan: hanya dijalankan paling banyak sekali per frame.
function perbaruiKepala() {
  menunggu = false;
  const y = window.scrollY;
  $('#kepala').classList.toggle('melayang', y > 8);
  $('#ke-atas').hidden = y < 900;

  const tinggiDokumen = document.documentElement.scrollHeight - window.innerHeight;
  $('#bar-gulir').style.width = (tinggiDokumen > 0 ? (y / tinggiDokumen) * 100 : 0) + '%';
}

function jadwalkan() {
  if (menunggu) return;
  menunggu = true;
  requestAnimationFrame(perbaruiKepala);
}

// Kartu yang masuk layar dimunculkan dan dicatat impresinya memakai
// IntersectionObserver (bukan lagi getBoundingClientRect untuk SEMUA kartu
// di setiap event gulir, yang membuat halaman macet).
function buatPengamat() {
  return new IntersectionObserver((entri) => {
    const impresiBaru = [];
    for (const e of entri) {
      if (!e.isIntersecting) continue;
      const kartu = e.target;
      if (!kartu.classList.contains('terlihat')) {
        kartu.style.minHeight = Math.round(e.boundingClientRect.height) + 'px'; // cegah kartu "mengempis"
        kartu.classList.add('terlihat');
      }
      const id = kartu.dataset.id;
      if (!sudahTercatat.has(id)) {
        sudahTercatat.add(id);
        impresiBaru.push(id);
      }
      pengamat.unobserve(kartu);
    }
    if (impresiBaru.length && window.Lacak) window.Lacak.kirim('impression', { produk: impresiBaru });
  }, { rootMargin: '80px 0px' });
}

// Dipanggil setelah kartu digambar ulang: daftarkan kartu baru ke pengamat.
export function periksaGulir() {
  perbaruiKepala();
  const kartuKartu = document.querySelectorAll('.kartu');
  if (!('IntersectionObserver' in window)) {
    kartuKartu.forEach((k) => k.classList.add('terlihat')); // cadangan: tampilkan semua
    return;
  }
  if (!pengamat) pengamat = buatPengamat();
  kartuKartu.forEach((k) => {
    if (sudahDiamati.has(k)) return;
    sudahDiamati.add(k);
    pengamat.observe(k);
  });
}

export function pasangGulir() {
  window.addEventListener('scroll', jadwalkan, { passive: true });
  window.addEventListener('resize', jadwalkan, { passive: true });

  // Cegah "pull to refresh" tak sengaja di Android ketika pengguna sedang di puncak halaman.
  let yAwal = 0;
  const utama = $('#utama');
  utama.addEventListener('touchstart', (e) => { yAwal = e.touches[0].clientY; }, { passive: true });
  utama.addEventListener('touchmove', (e) => {
    const menarikKeBawah = e.touches[0].clientY > yAwal;
    if (window.scrollY === 0 && menarikKeBawah && e.cancelable) e.preventDefault();
  }, { passive: false });
  // Listener "wheel" yang tidak pasif dihapus: hanya memperlambat gulir.

  $('#ke-atas').addEventListener('click', () => window.scrollTo({ top: 0 }));
  perbaruiKepala();
}