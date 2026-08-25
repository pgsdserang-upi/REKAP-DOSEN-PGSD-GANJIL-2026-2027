/* Halaman ceklis untuk PJ mata kuliah.
   Membaca window.DATA yang ditanam di dalam index.html. */

(function () {
  'use strict';

  var DATA = window.DATA;
  var SESI = DATA.sesi;
  var JML = DATA.meta.jumlahPertemuan;

  var STATUS = [
    { nilai: 'Terlaksana',       label: 'Terlaksana',  kelas: 'on-hadir'  },
    { nilai: 'Tidak Terlaksana', label: 'Tidak',       kelas: 'on-tidak'  },
    { nilai: 'Diganti/Ditunda',  label: 'Diganti',     kelas: 'on-ganti'  },
    { nilai: '',                 label: 'Belum',       kelas: 'on-kosong' }
  ];

  var HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
                  'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  var $ = function (s, akar) { return (akar || document).querySelector(s); };
  var $$ = function (s, akar) { return Array.prototype.slice.call((akar || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function tanggalPanjang(iso) {
    var b = iso.split('-');
    var d = new Date(+b[0], +b[1] - 1, +b[2]);
    return HARI_ID[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN_ID[d.getMonth()] + ' ' + d.getFullYear();
  }

  function tanggalPendek(iso) {
    var b = iso.split('-');
    return (+b[2]) + ' ' + BULAN_ID[+b[1] - 1].slice(0, 3);
  }

  function hariIni() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* ---------- penyimpanan lokal ---------------------------------------- */

  function bacaLS(kunci, bawaan) {
    try {
      var t = localStorage.getItem(kunci);
      return t ? JSON.parse(t) : bawaan;
    } catch (e) { return bawaan; }
  }

  function tulisLS(kunci, nilai) {
    try { localStorage.setItem(kunci, JSON.stringify(nilai)); } catch (e) { /* abaikan */ }
  }

  var KUNCI_PJ = 'pjIdentitas';
  var kunciDraf = function (id) { return 'draf:' + id; };

  /* ---------- keadaan ---------------------------------------------------- */

  var sesiAktif = null;
  var isi = {};        // pertemuan -> {status, keterangan}
  var terkirim = false;

  /* ---------- identitas PJ ---------------------------------------------- */

  function muatIdentitas() {
    var p = bacaLS(KUNCI_PJ, {});
    $('#pjNama').value = p.nama || '';
    $('#pjNim').value = p.nim || '';
    $('#pjKontak').value = p.kontak || '';
  }

  function identitas() {
    return {
      nama: $('#pjNama').value.trim(),
      nim: $('#pjNim').value.trim(),
      kontak: $('#pjKontak').value.trim()
    };
  }

  function simpanIdentitas() { tulisLS(KUNCI_PJ, identitas()); perbaruiTombol(); }

  /* ---------- pemilihan sesi -------------------------------------------- */

  function isiDaftarMk() {
    var peta = {};
    SESI.forEach(function (s) {
      var k = s.kodeMk + '|' + s.mk;
      if (!peta[k]) peta[k] = 0;
      peta[k]++;
    });
    var daftar = Object.keys(peta).sort(function (a, b) {
      return a.split('|')[1].localeCompare(b.split('|')[1], 'id');
    });
    var sel = $('#pilihMk');
    sel.innerHTML = '<option value="">— pilih mata kuliah —</option>' +
      daftar.map(function (k) {
        var b = k.split('|');
        return '<option value="' + esc(k) + '">' + esc(b[1]) +
               ' (' + esc(b[0]) + ') — ' + peta[k] + ' kelas</option>';
      }).join('');
  }

  function isiDaftarKelas() {
    var mk = $('#pilihMk').value;
    var sel = $('#pilihKelas');
    if (!mk) {
      sel.innerHTML = '<option value="">— pilih mata kuliah dahulu —</option>';
      sel.disabled = true;
      return;
    }
    var cocok = SESI.filter(function (s) { return s.kodeMk + '|' + s.mk === mk; })
                    .sort(function (a, b) { return a.kelas.localeCompare(b.kelas); });
    sel.disabled = false;
    sel.innerHTML = '<option value="">— pilih kelas —</option>' +
      cocok.map(function (s) {
        return '<option value="' + esc(s.id) + '">Kelas ' + esc(s.kelas) +
               ' — ' + esc(s.hari) + ' ' + esc(s.jam) + ' — ' + esc(s.dosen) + '</option>';
      }).join('');
  }

  function pilihSesi(id) {
    sesiAktif = null;
    isi = {};
    terkirim = false;
    for (var i = 0; i < SESI.length; i++) if (SESI[i].id === id) { sesiAktif = SESI[i]; break; }

    if (!sesiAktif) {
      $('#kartuCeklis').classList.add('sembunyi');
      $('#detailSesi').classList.add('sembunyi');
      $('#barBawah').classList.add('sembunyi');
      return;
    }

    var draf = bacaLS(kunciDraf(sesiAktif.id), null);
    if (draf && draf.isi) isi = draf.isi;

    gambarDetail();
    gambarPertemuan();
    $('#kartuCeklis').classList.remove('sembunyi');
    $('#barBawah').classList.remove('sembunyi');
    pesan('');
    ambilDariServer();
  }

  function gambarDetail() {
    var s = sesiAktif;
    var d = $('#detailSesi');
    d.innerHTML =
      kotak('Dosen Pengampu', s.dosen) +
      kotak('Mata Kuliah', s.mk + ' (' + s.kodeMk + ')') +
      kotak('Kelas', s.kelas) +
      kotak('SKS', s.sks) +
      kotak('Hari &amp; Jam', s.hari + ', ' + s.jam) +
      kotak('Ruangan', s.ruangan);
    d.classList.remove('sembunyi');

    function kotak(judul, nilai) {
      return '<div><dt>' + judul + '</dt><dd>' + esc(nilai) + '</dd></div>';
    }
  }

  /* ---------- daftar 16 pertemuan --------------------------------------- */

  function gambarPertemuan() {
    var s = sesiAktif;
    var kini = hariIni();
    var html = '';

    for (var p = 1; p <= JML; p++) {
      var tgl = s.tanggal[p - 1];
      var nilai = (isi[p] && isi[p].status) || '';
      var ket = (isi[p] && isi[p].keterangan) || '';
      var akanDatang = tgl > kini;

      html += '<div class="pt' + (nilai ? ' terisi' : '') + '" data-p="' + p + '">' +
        '<div><span class="ke">PERTEMUAN<b>' + p + '</b></span></div>' +
        '<div class="tgl">' + tanggalPendek(tgl) +
          '<small>' + tanggalPanjang(tgl) + (akanDatang ? ' · belum berlangsung' : '') + '</small></div>' +
        '<div class="pilihan"><div class="seg" role="group" aria-label="Status pertemuan ' + p + '">' +
          STATUS.map(function (st) {
            return '<label class="' + st.kelas + '">' +
              '<input type="radio" name="st' + p + '" value="' + esc(st.nilai) + '"' +
              (st.nilai === nilai ? ' checked' : '') + '>' +
              '<span>' + st.label + '</span></label>';
          }).join('') +
        '</div></div>' +
        '<div class="ket"><input type="text" data-ket="' + p + '" maxlength="180" ' +
          'placeholder="Keterangan (opsional)" value="' + esc(ket) + '"></div>' +
      '</div>';
    }

    $('#daftarPertemuan').innerHTML = html;
    hitung();
  }

  function bacaFormulir() {
    isi = {};
    $$('#daftarPertemuan .pt').forEach(function (el) {
      var p = el.getAttribute('data-p');
      var r = el.querySelector('input[type=radio]:checked');
      var status = r ? r.value : '';
      var ket = el.querySelector('input[data-ket]').value.trim();
      el.classList.toggle('terisi', !!status);
      if (status || ket) isi[p] = { status: status, keterangan: ket };
    });
  }

  function hitung() {
    var n = 0;
    for (var k in isi) if (isi[k] && isi[k].status) n++;
    var pct = Math.round(n / JML * 100);
    $('#progresAngka').innerHTML = '<b>' + n + '</b> dari ' + JML + ' pertemuan terisi';
    $('#progresBar').style.width = pct + '%';
    return n;
  }

  function simpanDraf() {
    if (!sesiAktif) return;
    tulisLS(kunciDraf(sesiAktif.id), { isi: isi, waktu: Date.now() });
  }

  /* ---------- kirim / muat ---------------------------------------------- */

  function pesan(teks, jenis) {
    var el = $('#pesan');
    if (!teks) { el.className = 'sembunyi'; el.textContent = ''; return; }
    el.className = 'pesan ' + (jenis || 'info');
    el.innerHTML = teks;
  }

  function perbaruiTombol() {
    var siap = !!sesiAktif && identitas().nama.length >= 3;
    $('#tombolKirim').disabled = !siap;
  }

  function ambilDariServer() {
    if (!window.API || !API.aktif() || !sesiAktif) return;
    var id = sesiAktif.id;
    $('#statusMuat').textContent = 'Memeriksa data di server…';
    API.ambil({ aksi: 'sesi', id: id }).then(function (j) {
      if (!sesiAktif || sesiAktif.id !== id) return;
      if (!j.data || !j.data.length) {
        $('#statusMuat').textContent = 'Belum ada ceklis tersimpan untuk kelas ini.';
        return;
      }
      var oleh = {}, waktu = '';
      j.data.forEach(function (b) {
        isi[b.pertemuan] = { status: b.status, keterangan: b.keterangan };
        if (b.pj) oleh[b.pj] = true;
        if (b.waktu > waktu) waktu = b.waktu;
      });
      gambarPertemuan();
      simpanDraf();
      $('#statusMuat').textContent = 'Dimuat dari server: ' + j.data.length +
        ' pertemuan, terakhir diisi oleh ' + Object.keys(oleh).join(', ') + '.';
    }).catch(function (err) {
      $('#statusMuat').textContent = 'Tidak dapat membaca server (' + err.message + ').';
    });
  }

  function kirim() {
    bacaFormulir();
    var pj = identitas();
    if (pj.nama.length < 3) { pesan('Nama PJ wajib diisi terlebih dahulu.', 'salah'); $('#pjNama').focus(); return; }
    if (!sesiAktif) return;

    var daftar = [];
    for (var p = 1; p <= JML; p++) {
      if (isi[p] && isi[p].status) {
        daftar.push({
          pertemuan: p,
          tanggal: sesiAktif.tanggal[p - 1],
          status: isi[p].status,
          keterangan: isi[p].keterangan || ''
        });
      }
    }
    if (!daftar.length) { pesan('Belum ada satu pun pertemuan yang diceklis.', 'awas'); return; }

    if (!window.API || !API.aktif()) {
      pesan('Alamat server belum diatur, jadi ceklis <b>hanya tersimpan di perangkat ini</b>. ' +
            'Minta pengelola mengisi <code>endpoint</code> pada berkas <code>config.js</code>, ' +
            'atau gunakan tombol <b>Unduh JSON</b> lalu kirimkan berkasnya.', 'awas');
      return;
    }

    var tombol = $('#tombolKirim');
    tombol.disabled = true;
    tombol.textContent = 'Mengirim…';
    pesan('Mengirim ' + daftar.length + ' pertemuan ke server…', 'info');

    API.kirim({
      aksi: 'simpan',
      pj: pj,
      sesi: {
        id: sesiAktif.id, kodeMk: sesiAktif.kodeMk, mk: sesiAktif.mk,
        kelas: sesiAktif.kelas, dosen: sesiAktif.dosen, hari: sesiAktif.hari,
        jam: sesiAktif.jam, ruangan: sesiAktif.ruangan
      },
      isi: daftar
    }).then(function (j) {
      terkirim = true;
      pesan('✔ Tersimpan. <b>' + j.tersimpan + ' pertemuan</b> untuk ' +
            esc(sesiAktif.mk) + ' kelas ' + esc(sesiAktif.kelas) +
            ' sudah masuk rekapan pengelola.' +
            (j.lewatCadangan ? ' <small>(terkirim lewat jalur cadangan)</small>' : ''), 'ok');
      simpanDraf();
    }).catch(function (err) {
      pesan('Gagal mengirim: ' + esc(err.message) +
            '<br>Ceklis tetap tersimpan di perangkat ini — coba kirim lagi nanti.', 'salah');
    }).then(function () {
      tombol.textContent = 'Kirim ceklis';
      perbaruiTombol();
    });
  }

  function unduhJson() {
    bacaFormulir();
    if (!sesiAktif) return;
    var obj = {
      pj: identitas(), sesi: sesiAktif, isi: isi,
      dibuat: new Date().toISOString()
    };
    var nama = 'ceklis-' + sesiAktif.kodeMk + '-' + sesiAktif.kelas + '.json';
    var b = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function isiSemua(nilai) {
    var kini = hariIni();
    $$('#daftarPertemuan .pt').forEach(function (el) {
      var p = +el.getAttribute('data-p');
      if (sesiAktif.tanggal[p - 1] > kini) return;   // lewati yang belum berlangsung
      var r = el.querySelector('input[value="' + nilai + '"]');
      if (r) r.checked = true;
    });
    bacaFormulir(); hitung(); simpanDraf();
    pesan('Semua pertemuan yang sudah berlangsung ditandai "' + nilai + '". ' +
          'Silakan ubah yang tidak sesuai, lalu tekan Kirim.', 'info');
  }

  /* ---------- pemasangan ------------------------------------------------- */

  function pasang() {
    muatIdentitas();
    isiDaftarMk();

    ['pjNama', 'pjNim', 'pjKontak'].forEach(function (id) {
      $('#' + id).addEventListener('input', simpanIdentitas);
    });

    $('#pilihMk').addEventListener('change', function () {
      isiDaftarKelas();
      pilihSesi('');
    });

    $('#pilihKelas').addEventListener('change', function () {
      pilihSesi(this.value);
      perbaruiTombol();
      if (this.value) $('#kartuCeklis').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('#daftarPertemuan').addEventListener('change', function () {
      bacaFormulir(); hitung(); simpanDraf();
    });

    $('#daftarPertemuan').addEventListener('input', function (e) {
      if (e.target.matches('input[data-ket]')) { bacaFormulir(); simpanDraf(); }
    });

    $('#tombolKirim').addEventListener('click', kirim);
    $('#tombolJson').addEventListener('click', unduhJson);
    $('#tombolSemuaHadir').addEventListener('click', function () { isiSemua('Terlaksana'); });
    $('#tombolBersih').addEventListener('click', function () {
      if (!confirm('Kosongkan seluruh ceklis pada kelas ini?')) return;
      isi = {}; gambarPertemuan(); simpanDraf(); pesan('');
    });

    window.addEventListener('beforeunload', function (e) {
      if (sesiAktif && !terkirim && hitung() > 0) { e.preventDefault(); e.returnValue = ''; }
    });

    // status sambungan ke server
    var s = $('#statusServer');
    if (window.API && API.aktif()) {
      s.className = 'pesan ok';
      s.innerHTML = '✔ Terhubung ke server rekap. Ceklis Anda langsung masuk ke rekapan pengelola.';
    } else {
      s.className = 'pesan awas';
      s.innerHTML = '⚠ <b>Alamat server belum diatur.</b> Ceklis masih bisa diisi dan ' +
        'tersimpan di perangkat ini, tetapi belum terkirim ke pengelola. ' +
        'Pengelola perlu mengisi <code>endpoint</code> pada berkas <code>config.js</code>.';
    }

    perbaruiTombol();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pasang);
  } else {
    pasang();
  }
})();
