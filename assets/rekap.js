/* Halaman rekapan pengelola: menarik seluruh ceklis dari semua PJ mata kuliah.
   Membaca window.DATA yang ditanam di dalam rekap.html. */

(function () {
  'use strict';

  var DATA = window.DATA;
  var SESI = DATA.sesi;
  var JML = DATA.meta.jumlahPertemuan;

  var LAMBANG = {
    'Terlaksana':       { tanda: '✔', kelas: 'sel-hadir' },
    'Tidak Terlaksana': { tanda: '✘', kelas: 'sel-tidak' },
    'Diganti/Ditunda':  { tanda: '↻', kelas: 'sel-ganti' }
  };

  var BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
                  'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  var $ = function (s, a) { return (a || document).querySelector(s); };
  var $$ = function (s, a) { return Array.prototype.slice.call((a || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function tglPendek(iso) {
    if (!iso) return '';
    var b = iso.split('-');
    return (+b[2]) + ' ' + BULAN_ID[+b[1] - 1].slice(0, 3);
  }

  function waktuLokal(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }

  /* ---------- keadaan ---------------------------------------------------- */

  var laporan = {};      // idSesi -> { pertemuan -> baris }
  var mentah = [];       // seluruh baris dari server
  var diperbarui = '';
  var kunciTerpakai = '';   // kunci admin yang terbukti diterima server

  /* ---------- memuat ----------------------------------------------------- */

  function pesan(teks, jenis) {
    var el = $('#pesan');
    if (!teks) { el.className = 'sembunyi'; el.innerHTML = ''; return; }
    el.className = 'pesan ' + (jenis || 'info');
    el.innerHTML = teks;
  }

  function muat(catatan) {
    if (typeof catatan !== 'string') catatan = '';
    var kunci = $('#kunciAdmin').value.trim();
    if (!kunci) { pesan('Masukkan kunci admin terlebih dahulu.', 'salah'); return; }
    if (!window.API || !API.aktif()) {
      pesan('Alamat server belum diatur. Isi <code>endpoint</code> pada berkas ' +
            '<code>config.js</code>, atau gunakan tombol <b>Muat berkas JSON</b>.', 'salah');
      return;
    }

    if ($('#ingatKunci').checked) {
      try { localStorage.setItem('kunciAdmin', kunci); } catch (e) { /* abaikan */ }
    } else {
      try { localStorage.removeItem('kunciAdmin'); } catch (e) { /* abaikan */ }
    }

    var t = $('#tombolMuat');
    t.disabled = true; t.textContent = 'Memuat…';
    pesan('Menarik data dari Google Sheet…', 'info');

    API.ambil({ aksi: 'rekap', kunci: kunci }).then(function (j) {
      kunciTerpakai = kunci;
      terapkan(j.data || []);
      diperbarui = j.diperbarui || new Date().toISOString();
      pesan((catatan ? '✔ ' + esc(catatan) + ' ' : '✔ ') +
            'Data dimuat: <b>' + (j.jumlah || 0) + ' baris ceklis</b> · ' +
            'per ' + waktuLokal(diperbarui), 'ok');
    }).catch(function (err) {
      pesan('Gagal memuat: ' + esc(err.message), 'salah');
    }).then(function () {
      t.disabled = false; t.textContent = 'Muat rekapan';
    });
  }

  function terapkan(baris) {
    mentah = baris;
    laporan = {};
    baris.forEach(function (b) {
      if (!laporan[b.idSesi]) laporan[b.idSesi] = {};
      laporan[b.idSesi][b.pertemuan] = b;
    });
    $('#hasil').classList.remove('sembunyi');
    gambarStat();
    gambarPerPertemuan();
    gambarTabel();
    gambarBelum();
    gambarPj();
  }

  /* ---------- ringkasan angka -------------------------------------------- */

  function hitungStat() {
    var s = { terlaksana: 0, tidak: 0, ganti: 0, terisi: 0,
              sesiLapor: 0, target: SESI.length * JML, pj: {} };
    SESI.forEach(function (x) { if (laporan[x.id]) s.sesiLapor++; });
    mentah.forEach(function (b) {
      s.terisi++;
      if (b.status === 'Terlaksana') s.terlaksana++;
      else if (b.status === 'Tidak Terlaksana') s.tidak++;
      else s.ganti++;
      if (b.pj) s.pj[b.pj] = (s.pj[b.pj] || 0) + 1;
    });
    return s;
  }

  function gambarStat() {
    var s = hitungStat();
    var persen = s.target ? Math.round(s.terisi / s.target * 100) : 0;
    $('#stat').innerHTML =
      kartu(s.terisi + ' / ' + s.target, 'Ceklis terisi (' + persen + '%)') +
      kartu(s.sesiLapor + ' / ' + SESI.length, 'Kelas sudah dilaporkan') +
      kartu(s.terlaksana, 'Pertemuan terlaksana') +
      kartu(s.tidak, 'Tidak terlaksana') +
      kartu(s.ganti, 'Diganti / ditunda') +
      kartu(Object.keys(s.pj).length, 'PJ yang sudah mengisi');

    function kartu(nilai, judul) {
      return '<div class="stat"><div class="nilai">' + esc(nilai) + '</div>' +
             '<div class="judul">' + esc(judul) + '</div></div>';
    }
  }

  function gambarPerPertemuan() {
    var h = '<div class="gulung"><table><thead><tr><th>Pertemuan</th>' +
            '<th class="c">Terlaksana</th><th class="c">Tidak</th>' +
            '<th class="c">Diganti</th><th class="c">Belum diisi</th>' +
            '<th style="min-width:170px">Kelengkapan</th></tr></thead><tbody>';
    for (var p = 1; p <= JML; p++) {
      var a = 0, b = 0, c = 0;
      SESI.forEach(function (s) {
        var r = laporan[s.id] && laporan[s.id][p];
        if (!r) return;
        if (r.status === 'Terlaksana') a++;
        else if (r.status === 'Tidak Terlaksana') b++;
        else c++;
      });
      var terisi = a + b + c;
      var pct = Math.round(terisi / SESI.length * 100);
      h += '<tr><td><b>Pertemuan ' + p + '</b></td>' +
           '<td class="c">' + a + '</td><td class="c">' + b + '</td>' +
           '<td class="c">' + c + '</td><td class="c">' + (SESI.length - terisi) + '</td>' +
           '<td><div class="rel"><i style="width:' + pct + '%"></i></div>' +
           '<small>' + pct + '%</small></td></tr>';
    }
    $('#perPertemuan').innerHTML = h + '</tbody></table></div>';
  }

  /* ---------- tabel matriks ---------------------------------------------- */

  function gambarTabel() {
    var kepala = '<tr><th class="c">NO</th><th>DOSEN</th><th>MATA KULIAH</th>' +
                 '<th class="c">KELAS</th><th>HARI / JAM</th><th>PJ PENGISI</th>' +
                 '<th class="c">ISI</th><th class="c tanpa-cetak">HAPUS</th>';
    for (var p = 1; p <= JML; p++) kepala += '<th class="kol-p"><span>' + p + '</span></th>';
    kepala += '</tr>';

    var badan = SESI.map(function (s, i) {
      var lap = laporan[s.id] || {};
      var pj = {}, terisi = 0;
      var sel = '';
      for (var p = 1; p <= JML; p++) {
        var r = lap[p];
        if (r) {
          terisi++;
          if (r.pj) pj[r.pj] = true;
          var L = LAMBANG[r.status] || { tanda: '?', kelas: '' };
          var tip = 'Pertemuan ' + p + ' · ' + tglPendek(r.tanggal) + ' · ' + r.status +
                    (r.keterangan ? ' · ' + r.keterangan : '') +
                    (r.pj ? ' · diisi ' + r.pj : '');
          sel += '<td class="kol-p sel ' + L.kelas + '" title="' + esc(tip) + '">' + L.tanda + '</td>';
        } else {
          sel += '<td class="kol-p sel sel-kosong" title="Pertemuan ' + p + ' · ' +
                 tglPendek(s.tanggal[p - 1]) + ' · belum diisi">·</td>';
        }
      }
      var namaPj = Object.keys(pj).join(', ');
      return '<tr data-cari="' + esc([s.dosen, s.mk, s.kodeMk, s.kelas, s.hari, s.jam, namaPj].join(' ').toLowerCase()) +
             '" data-dosen="' + esc(s.dosen) + '" data-mk="' + esc(s.kodeMk) +
             '" data-terisi="' + terisi + '">' +
             '<td class="c">' + (i + 1) + '</td>' +
             '<td>' + esc(s.dosen) + '</td>' +
             '<td>' + esc(s.mk) + ' <small>(' + esc(s.kodeMk) + ')</small></td>' +
             '<td class="c">' + esc(s.kelas) + '</td>' +
             '<td class="nowrap">' + esc(s.hari) + '<br><small>' + esc(s.jam) + '</small></td>' +
             '<td>' + (namaPj ? esc(namaPj) : '<small style="color:#b3bac7">belum ada</small>') + '</td>' +
             '<td class="c"><b>' + terisi + '</b>/' + JML + '</td>' +
             '<td class="c tanpa-cetak">' + (terisi
               ? '<button type="button" class="btn kecil bahaya hapus-sesi" data-id="' +
                 esc(s.id) + '" title="Hapus seluruh ceklis kelas ini">Hapus</button>'
               : '') + '</td>' +
             sel + '</tr>';
    }).join('');

    $('#tabelRekap').innerHTML = '<thead>' + kepala + '</thead><tbody>' + badan + '</tbody>';
    isiFilter();
    saring();
  }

  function isiFilter() {
    var dosen = {}, mk = {};
    SESI.forEach(function (s) { dosen[s.dosen] = 1; mk[s.kodeMk + ' — ' + s.mk] = s.kodeMk; });
    var fd = $('#filterDosen');
    if (fd.options.length <= 1) {
      fd.innerHTML = '<option value="">Semua dosen</option>' +
        Object.keys(dosen).sort().map(function (d) {
          return '<option value="' + esc(d) + '">' + esc(d) + '</option>';
        }).join('');
      $('#filterMk').innerHTML = '<option value="">Semua mata kuliah</option>' +
        Object.keys(mk).sort().map(function (t) {
          return '<option value="' + esc(mk[t]) + '">' + esc(t) + '</option>';
        }).join('');
    }
  }

  function saring() {
    var cari = $('#cari').value.trim().toLowerCase();
    var dosen = $('#filterDosen').value;
    var mk = $('#filterMk').value;
    var keadaan = $('#filterKeadaan').value;
    var tampil = 0;

    $$('#tabelRekap tbody tr').forEach(function (tr) {
      var terisi = +tr.getAttribute('data-terisi');
      var ok = true;
      if (cari && tr.getAttribute('data-cari').indexOf(cari) < 0) ok = false;
      if (ok && dosen && tr.getAttribute('data-dosen') !== dosen) ok = false;
      if (ok && mk && tr.getAttribute('data-mk') !== mk) ok = false;
      if (ok && keadaan === 'belum' && terisi !== 0) ok = false;
      if (ok && keadaan === 'sebagian' && !(terisi > 0 && terisi < JML)) ok = false;
      if (ok && keadaan === 'lengkap' && terisi !== JML) ok = false;
      tr.classList.toggle('sembunyi', !ok);
      if (ok) tampil++;
    });

    $('#jumlahTampil').textContent = tampil + ' dari ' + SESI.length + ' kelas';
  }

  /* ---------- kelas yang belum dilaporkan -------------------------------- */

  function gambarBelum() {
    var belum = SESI.filter(function (s) { return !laporan[s.id]; });
    var el = $('#belumLapor');
    if (!belum.length) {
      el.innerHTML = '<p class="pesan ok" style="margin:0">✔ Seluruh ' + SESI.length +
        ' kelas sudah memiliki ceklis dari PJ.</p>';
      return;
    }
    var perDosen = {};
    belum.forEach(function (s) {
      (perDosen[s.dosen] = perDosen[s.dosen] || []).push(s.mk + ' (' + s.kelas + ')');
    });
    el.innerHTML = '<p class="pesan awas" style="margin:0 0 10px">' + belum.length +
      ' kelas belum diceklis sama sekali oleh PJ-nya.</p>' +
      '<div class="gulung"><table><thead><tr><th>Dosen</th><th>Kelas yang belum diceklis</th>' +
      '<th class="c">Jumlah</th></tr></thead><tbody>' +
      Object.keys(perDosen).sort().map(function (d) {
        return '<tr><td>' + esc(d) + '</td><td>' + esc(perDosen[d].join('; ')) +
               '</td><td class="c">' + perDosen[d].length + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ---------- rekap per PJ ------------------------------------------------ */

  function gambarPj() {
    var peta = {};
    mentah.forEach(function (b) {
      var k = b.pj || '(tanpa nama)';
      if (!peta[k]) peta[k] = { nim: b.nim, kontak: b.kontak, kelas: {}, n: 0, waktu: '' };
      peta[k].n++;
      peta[k].kelas[b.idSesi] = b.kodeMk + ' ' + b.kelas;
      if (b.nim && !peta[k].nim) peta[k].nim = b.nim;
      if (b.kontak && !peta[k].kontak) peta[k].kontak = b.kontak;
      if (b.waktu > peta[k].waktu) peta[k].waktu = b.waktu;
    });
    var nama = Object.keys(peta).sort();
    if (!nama.length) { $('#perPj').innerHTML = '<p class="bantuan">Belum ada PJ yang mengisi.</p>'; return; }
    $('#perPj').innerHTML = '<div class="gulung"><table><thead><tr>' +
      '<th>Nama PJ</th><th>NIM</th><th>Kontak</th><th>Kelas yang diisi</th>' +
      '<th class="c">Ceklis</th><th>Terakhir mengisi</th></tr></thead><tbody>' +
      nama.map(function (n) {
        var v = peta[n];
        var daftar = Object.keys(v.kelas).map(function (k) { return v.kelas[k]; });
        return '<tr><td><b>' + esc(n) + '</b></td><td>' + esc(v.nim) + '</td>' +
               '<td>' + esc(v.kontak) + '</td><td>' + esc(daftar.join('; ')) + '</td>' +
               '<td class="c">' + v.n + '</td><td class="nowrap">' + esc(waktuLokal(v.waktu)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ---------- menghapus ceklis (khusus pengelola) ------------------------- */

  function balikkanTombol(b) {
    if (b.__jam) { clearTimeout(b.__jam); b.__jam = null; }
    b.setAttribute('data-siap', '');
    b.textContent = 'Hapus';
    b.classList.remove('tegas');
  }

  /* Penegasan dua langkah, bukan dialog confirm(): klik pertama mengubah
     tombol menjadi "Yakin?" selama 5 detik, klik kedua baru menghapus. */
  function klikHapusBaris(ev) {
    var b = ev.target.closest && ev.target.closest('.hapus-sesi');
    if (!b) return;

    if (b.getAttribute('data-siap') !== '1') {
      $$('.hapus-sesi').forEach(balikkanTombol);
      b.setAttribute('data-siap', '1');
      b.textContent = 'Yakin?';
      b.classList.add('tegas');
      b.__jam = setTimeout(function () { balikkanTombol(b); }, 5000);
      return;
    }

    balikkanTombol(b);
    var id = b.getAttribute('data-id');
    if (!kunciTerpakai) { pesan('Muat rekapan terlebih dahulu.', 'salah'); return; }

    b.disabled = true;
    b.textContent = 'Menghapus…';
    pesan('Menghapus ceklis kelas tersebut…', 'info');

    API.kirim({ aksi: 'hapus', kunci: kunciTerpakai, idSesi: id })
      .then(function () { muat('Ceklis kelas tersebut sudah dihapus.'); })
      .catch(function (err) {
        pesan('Gagal menghapus: ' + esc(err.message), 'salah');
        b.disabled = false; b.textContent = 'Hapus';
      });
  }

  function tutupPanelKosongkan() {
    $('#panelKosongkan').classList.add('sembunyi');
    $('#konfirmKosongkan').value = '';
    $('#tombolKosongkanYa').disabled = true;
  }

  function kosongkanSemua() {
    if (!kunciTerpakai) { pesan('Muat rekapan terlebih dahulu.', 'salah'); return; }
    var t = $('#tombolKosongkanYa');
    t.disabled = true; t.textContent = 'Menghapus…';
    pesan('Menghapus seluruh ceklis…', 'info');

    API.kirim({ aksi: 'hapus', kunci: kunciTerpakai, semua: true })
      .then(function () {
        tutupPanelKosongkan();
        muat('Seluruh ceklis sudah dihapus.');
      })
      .catch(function (err) {
        pesan('Gagal menghapus: ' + esc(err.message), 'salah');
        t.disabled = false;
      })
      .then(function () { t.textContent = 'Ya, hapus semuanya'; });
  }

  /* ---------- ekspor ------------------------------------------------------ */

  function unduh(nama, isi, tipe) {
    var b = new Blob([isi], { type: tipe });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function csv() {
    var kepala = ['No', 'Kode Dosen', 'Dosen', 'Kode MK', 'Mata Kuliah', 'SKS', 'Kelas',
                  'Hari', 'Jam', 'Ruangan', 'Pertemuan', 'Tanggal', 'Status',
                  'Keterangan', 'PJ', 'NIM PJ', 'Kontak PJ', 'Waktu Input'];
    var baris = [kepala];
    var no = 0;
    SESI.forEach(function (s) {
      var lap = laporan[s.id] || {};
      for (var p = 1; p <= JML; p++) {
        var r = lap[p];
        no++;
        baris.push([no, s.kodeDosen, s.dosen, s.kodeMk, s.mk, s.sks, s.kelas,
                    s.hari, s.jam, s.ruangan, p, s.tanggal[p - 1],
                    r ? r.status : 'Belum diisi', r ? r.keterangan : '',
                    r ? r.pj : '', r ? r.nim : '', r ? r.kontak : '',
                    r ? waktuLokal(r.waktu) : '']);
      }
    });
    var teks = '﻿' + baris.map(function (b) {
      return b.map(function (v) {
        v = String(v == null ? '' : v);
        return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(';');
    }).join('\r\n');
    unduh('rekap-ceklis-pertemuan-' + new Date().toISOString().slice(0, 10) + '.csv',
          teks, 'text/csv;charset=utf-8');
  }

  function json() {
    unduh('rekap-ceklis-' + new Date().toISOString().slice(0, 10) + '.json',
          JSON.stringify({ meta: DATA.meta, diperbarui: diperbarui, data: mentah }, null, 1),
          'application/json');
  }

  function muatBerkas(berkas) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var j = JSON.parse(fr.result);
        var baris = j.data || j;
        if (!Array.isArray(baris)) throw new Error('Isi berkas tidak dikenali.');
        terapkan(baris);
        diperbarui = j.diperbarui || '';
        pesan('✔ Dimuat dari berkas: <b>' + baris.length + ' baris</b>.', 'ok');
      } catch (e) {
        pesan('Berkas tidak dapat dibaca: ' + esc(e.message), 'salah');
      }
    };
    fr.readAsText(berkas);
  }

  /* ---------- pemasangan --------------------------------------------------- */

  function pasang() {
    try {
      var k = localStorage.getItem('kunciAdmin');
      if (k) { $('#kunciAdmin').value = k; $('#ingatKunci').checked = true; }
    } catch (e) { /* abaikan */ }

    $('#tombolMuat').addEventListener('click', function () { muat(); });
    $('#kunciAdmin').addEventListener('keydown', function (e) { if (e.key === 'Enter') muat(); });

    // menghapus ceklis
    $('#tabelRekap').addEventListener('click', klikHapusBaris);
    $('#tombolKosongkan').addEventListener('click', function () {
      if (!kunciTerpakai) { pesan('Muat rekapan terlebih dahulu.', 'salah'); return; }
      $('#panelKosongkan').classList.remove('sembunyi');
      $('#konfirmKosongkan').focus();
    });
    $('#tombolKosongkanBatal').addEventListener('click', tutupPanelKosongkan);
    $('#konfirmKosongkan').addEventListener('input', function () {
      $('#tombolKosongkanYa').disabled =
        this.value.trim().replace(/\s+/g, ' ').toUpperCase() !== 'HAPUS SEMUA';
    });
    $('#tombolKosongkanYa').addEventListener('click', kosongkanSemua);
    $('#tombolCsv').addEventListener('click', csv);
    $('#tombolJson').addEventListener('click', json);
    $('#tombolCetak').addEventListener('click', function () { window.print(); });
    $('#berkasJson').addEventListener('change', function () {
      if (this.files && this.files[0]) muatBerkas(this.files[0]);
      this.value = '';
    });

    ['cari', 'filterDosen', 'filterMk', 'filterKeadaan'].forEach(function (id) {
      $('#' + id).addEventListener('input', saring);
      $('#' + id).addEventListener('change', saring);
    });

    if (!window.API || !API.aktif()) {
      pesan('Alamat server belum diatur pada <code>config.js</code>. Anda tetap dapat ' +
            'membuka rekapan lewat tombol <b>Muat berkas JSON</b>.', 'awas');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pasang);
  } else {
    pasang();
  }
})();
