/**
 * Rekap Ceklis Pertemuan Dosen - PGSD UPI Kampus Daerah Serang
 * Semester Ganjil 2026/2027 - 16 kali pertemuan
 *
 * Backend untuk halaman statis yang dipasang di GitHub Pages.
 * Seluruh ceklis dari semua PJ mata kuliah disimpan pada satu Google Sheet.
 *
 * Cara pasang: lihat apps-script/PANDUAN-PASANG.md
 */

// ============================================================================
// PENGATURAN - ubah bagian ini
// ============================================================================

/**
 * Kunci admin untuk membuka halaman rekap.
 *
 * CARA AMAN (dianjurkan bila repositori GitHub Anda bersifat Public):
 *   jangan tulis kunci asli di sini. Simpan lewat
 *   Apps Script > Project Settings > Script properties > Add script property
 *   dengan Property = KUNCI_ADMIN dan Value = kunci rahasia Anda.
 *   Nilai dari Script properties selalu menang atas nilai di bawah ini.
 *
 * Nilai di bawah hanya dipakai bila Script properties belum diisi. Apa pun
 * yang tertulis di sini ikut terbaca publik kalau berkas ini di-commit.
 */
var KUNCI_ADMIN = 'ganti-kunci-ini-2026';

/** Nama tab tempat data disimpan. Dibuat otomatis bila belum ada. */
var NAMA_SHEET = 'Ceklis';

function kunciAdmin_() {
  var p = '';
  try {
    p = PropertiesService.getScriptProperties().getProperty('KUNCI_ADMIN') || '';
  } catch (e) {
    p = '';
  }
  return p ? String(p).trim() : KUNCI_ADMIN;
}

// ============================================================================

var JUDUL = ['Waktu Input', 'PJ (Nama)', 'NIM', 'Kontak', 'ID Sesi', 'Kode MK',
             'Mata Kuliah', 'Kelas', 'Dosen', 'Hari', 'Jam', 'Ruangan',
             'Pertemuan', 'Tanggal', 'Status', 'Keterangan'];

var KOL_ID = 4;          // indeks kolom "ID Sesi" (0-based)
var KOL_PERTEMUAN = 12;  // indeks kolom "Pertemuan"

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(NAMA_SHEET);
  if (!sh) {
    sh = ss.insertSheet(NAMA_SHEET);
    sh.appendRow(JUDUL);
    sh.getRange(1, 1, 1, JUDUL.length)
      .setFontWeight('bold')
      .setBackground('#14366f')
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 145);
    sh.setColumnWidth(7, 260);
    sh.setColumnWidth(9, 220);
    sh.setColumnWidth(16, 260);
  }
  return sh;
}

function balas_(obj, e) {
  var teks = JSON.stringify(obj);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    return ContentService
      .createTextOutput(cb + '(' + teks + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(teks)
    .setMimeType(ContentService.MimeType.JSON);
}

function str_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

// ----------------------------------------------------------------------------
// GET - membaca data
// ----------------------------------------------------------------------------

function doGet(e) {
  var p = (e && e.parameter) || {};
  var aksi = p.aksi || 'ping';

  try {
    if (aksi === 'ping') {
      return balas_({ ok: true, aksi: 'ping', versi: '2026.1',
                      waktu: new Date().toISOString() }, e);
    }

    if (aksi === 'sesi') {
      // dipakai PJ untuk memuat kembali ceklis yang sudah pernah dikirim
      var id = str_(p.id);
      if (!id) return balas_({ ok: false, pesan: 'Parameter id kosong.' }, e);
      return balas_({ ok: true, aksi: 'sesi', id: id, data: baca_(id) }, e);
    }

    if (aksi === 'rekap') {
      if (str_(p.kunci) !== kunciAdmin_()) {
        return balas_({ ok: false, pesan: 'Kunci admin salah.' }, e);
      }
      var semua = baca_(null);
      return balas_({ ok: true, aksi: 'rekap', jumlah: semua.length,
                      diperbarui: new Date().toISOString(), data: semua }, e);
    }

    return balas_({ ok: false, pesan: 'Aksi tidak dikenal: ' + aksi }, e);
  } catch (err) {
    return balas_({ ok: false, pesan: String(err) }, e);
  }
}

function baca_(idSesi) {
  var sh = sheet_();
  var n = sh.getLastRow();
  if (n < 2) return [];
  var nilai = sh.getRange(2, 1, n - 1, JUDUL.length).getValues();
  var out = [];
  for (var r = 0; r < nilai.length; r++) {
    var b = nilai[r];
    if (!str_(b[KOL_ID])) continue;
    if (idSesi && str_(b[KOL_ID]) !== idSesi) continue;
    out.push({
      waktu: b[0] instanceof Date ? b[0].toISOString() : str_(b[0]),
      pj: str_(b[1]), nim: str_(b[2]), kontak: str_(b[3]),
      idSesi: str_(b[4]), kodeMk: str_(b[5]), mk: str_(b[6]), kelas: str_(b[7]),
      dosen: str_(b[8]), hari: str_(b[9]), jam: str_(b[10]), ruangan: str_(b[11]),
      pertemuan: Number(b[12]) || 0,
      tanggal: b[13] instanceof Date
        ? Utilities.formatDate(b[13], 'Asia/Jakarta', 'yyyy-MM-dd')
        : str_(b[13]),
      status: str_(b[14]), keterangan: str_(b[15])
    });
  }
  return out;
}

// ----------------------------------------------------------------------------
// POST - menyimpan ceklis satu sesi (16 pertemuan sekaligus)
// ----------------------------------------------------------------------------

function doPost(e) {
  var gembok = LockService.getScriptLock();
  try {
    gembok.waitLock(30000);
  } catch (err) {
    return balas_({ ok: false, pesan: 'Server sibuk, coba lagi sebentar lagi.' }, e);
  }

  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    if ((body.aksi || 'simpan') !== 'simpan') {
      return balas_({ ok: false, pesan: 'Aksi tidak dikenal.' }, e);
    }

    var sesi = body.sesi || {};
    var pj = body.pj || {};
    var idSesi = str_(sesi.id);
    var nama = str_(pj.nama);

    if (!idSesi) return balas_({ ok: false, pesan: 'ID sesi kosong.' }, e);
    if (!nama) return balas_({ ok: false, pesan: 'Nama PJ wajib diisi.' }, e);

    var isi = body.isi || [];
    var baru = {};
    var stempel = new Date();

    for (var i = 0; i < isi.length; i++) {
      var it = isi[i];
      var p = Number(it.pertemuan) || 0;
      var status = str_(it.status);
      if (p < 1 || !status || status === 'Belum') continue;  // belum diisi: tidak disimpan
      baru[p] = [stempel, nama, str_(pj.nim), str_(pj.kontak), idSesi,
                 str_(sesi.kodeMk), str_(sesi.mk), str_(sesi.kelas),
                 str_(sesi.dosen), str_(sesi.hari), str_(sesi.jam),
                 str_(sesi.ruangan), p, str_(it.tanggal), status,
                 str_(it.keterangan)];
    }

    var sh = sheet_();
    var n = sh.getLastRow();
    var sisa = [];   // baris milik sesi lain, dipertahankan apa adanya
    if (n > 1) {
      var nilai = sh.getRange(2, 1, n - 1, JUDUL.length).getValues();
      for (var r = 0; r < nilai.length; r++) {
        if (!str_(nilai[r][KOL_ID])) continue;
        if (str_(nilai[r][KOL_ID]) === idSesi) continue;   // diganti data baru
        sisa.push(nilai[r]);
      }
    }

    var tambah = [];
    for (var k = 1; k <= 40; k++) if (baru[k]) tambah.push(baru[k]);

    var gabung = sisa.concat(tambah);
    gabung.sort(function (a, b) {
      var x = str_(a[KOL_ID]).localeCompare(str_(b[KOL_ID]));
      if (x !== 0) return x;
      return (Number(a[KOL_PERTEMUAN]) || 0) - (Number(b[KOL_PERTEMUAN]) || 0);
    });

    if (n > 1) sh.getRange(2, 1, n - 1, JUDUL.length).clearContent();
    if (gabung.length) {
      sh.getRange(2, 1, gabung.length, JUDUL.length).setValues(gabung);
      sh.getRange(2, 1, gabung.length, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }

    return balas_({ ok: true, idSesi: idSesi, tersimpan: tambah.length,
                    totalBaris: gabung.length,
                    waktu: stempel.toISOString() }, e);
  } catch (err) {
    return balas_({ ok: false, pesan: String(err) }, e);
  } finally {
    gembok.releaseLock();
  }
}

// ----------------------------------------------------------------------------
// Menu bantuan di dalam Google Sheet
// ----------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Rekap Ceklis')
    .addItem('Buat ringkasan per mata kuliah', 'buatRingkasan')
    .addItem('Buat ringkasan per dosen', 'buatRingkasanDosen')
    .addToUi();
}

function buatRingkasan() { ringkas_('Ringkasan MK', true, 'Mata Kuliah'); }
function buatRingkasanDosen() { ringkas_('Ringkasan Dosen', false, 'Dosen'); }

function ringkas_(namaTab, perMk, judulKolom) {
  var data = baca_(null);
  var peta = {};
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var k = perMk ? (d.kodeMk + ' - ' + d.mk) : d.dosen;
    if (!peta[k]) peta[k] = { terlaksana: 0, tidak: 0, lain: 0, total: 0, pj: {} };
    peta[k].total++;
    if (d.status === 'Terlaksana') peta[k].terlaksana++;
    else if (d.status === 'Tidak Terlaksana') peta[k].tidak++;
    else peta[k].lain++;
    if (d.pj) peta[k].pj[d.pj] = true;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(namaTab);
  if (sh) sh.clear(); else sh = ss.insertSheet(namaTab);

  var baris = [[judulKolom, 'Terlaksana', 'Tidak Terlaksana', 'Diganti/Ditunda',
                'Total Terisi', 'PJ Penginput']];
  var nama = Object.keys(peta).sort();
  for (var j = 0; j < nama.length; j++) {
    var v = peta[nama[j]];
    baris.push([nama[j], v.terlaksana, v.tidak, v.lain, v.total,
                Object.keys(v.pj).join(', ')]);
  }
  sh.getRange(1, 1, baris.length, 6).setValues(baris);
  sh.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#dde6f5');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 320);
  sh.setColumnWidth(6, 300);
  SpreadsheetApp.getUi().alert('Tab "' + namaTab + '" diperbarui: ' +
                               (baris.length - 1) + ' baris.');
}
