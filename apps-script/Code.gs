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

/** Nama tab tempat data disimpan. Dibuat otomatis bila belum ada. */
var NAMA_SHEET = 'Ceklis';

/**
 * Kunci admin untuk membuka dan menghapus rekapan.
 *
 * Kunci TIDAK disimpan di dalam berkas ini dengan sengaja: berkas ini ada di
 * repositori GitHub yang publik, sehingga apa pun yang tertulis di sini ikut
 * terbaca siapa saja. Simpanlah lewat
 *
 *   Apps Script > Project Settings (roda gigi) > Script properties
 *   > Add script property
 *       Property : KUNCI_ADMIN
 *       Value    : kunci rahasia Anda
 *
 * Selama properti itu belum diisi, rekapan tidak bisa dibuka sama sekali.
 */
function kunciAdmin_() {
  try {
    return String(
      PropertiesService.getScriptProperties().getProperty('KUNCI_ADMIN') || ''
    ).trim();
  } catch (e) {
    return '';
  }
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

/**
 * Mengunci tipe tiap kolom sebelum data ditulis.
 *
 * Kolom A  (Waktu Input) = tanggal-waktu
 * Kolom M  (Pertemuan)   = bilangan bulat
 * Sisanya                = teks apa adanya ('@')
 *
 * Kolom teks WAJIB dipaksa '@'. Nilai seperti ID sesi "2267-1", kelas
 * "2026-A", atau NIM berawalan nol akan diubah sendiri oleh Google Sheets
 * bila dibiarkan bertipe otomatis.
 */
function formatKolom_(sh, jml) {
  if (jml < 1) return;
  sh.getRange(2, 2, jml, 11).setNumberFormat('@');   // B..L
  sh.getRange(2, 14, jml, 3).setNumberFormat('@');   // N..P
  sh.getRange(2, 1, jml, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sh.getRange(2, 13, jml, 1).setNumberFormat('0');
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
      var kunci = kunciAdmin_();
      if (!kunci) {
        return balas_({ ok: false, pesan: 'Kunci admin belum dipasang. Isi Script ' +
                        'property bernama KUNCI_ADMIN pada Apps Script.' }, e);
      }
      if (str_(p.kunci) !== kunci) {
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
    // Baris warisan versi lama: ID sesi sempat diubah Sheets menjadi tanggal
    // sehingga tidak bisa dicocokkan lagi dengan jadwal. Diabaikan.
    if (b[KOL_ID] instanceof Date) continue;
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
    // Dua bentuk kiriman yang diterima:
    //  1. badan JSON mentah      - dipakai fetch() dari halaman
    //  2. field form "payload"   - dipakai jalur cadangan (form + iframe)
    //     saat fetch diblokir CORS di perangkat PJ
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (abai) { body = {}; }
    }
    if (!body.sesi && e && e.parameter && e.parameter.payload) {
      try { body = JSON.parse(e.parameter.payload); } catch (abai2) { body = {}; }
    }
    var aksi = body.aksi || 'simpan';

    if (aksi === 'hapus') return hapus_(body, e);

    if (aksi !== 'simpan') {
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
        if (nilai[r][KOL_ID] instanceof Date) continue;    // baris rusak, dibuang
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
      // Format dipasang SEBELUM menulis. Tanpa ini Google Sheets menafsirkan
      // ID sesi "2267-1" sebagai tanggal (Januari 2267), sehingga ID di Sheet
      // tidak lagi cocok dengan ID di jadwal dan rekapan jadi kosong.
      formatKolom_(sh, gabung.length);
      sh.getRange(2, 1, gabung.length, JUDUL.length).setValues(gabung);
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

/**
 * Menghapus ceklis. Hanya untuk pengelola - wajib menyertakan kunci admin.
 *
 *   { aksi:'hapus', kunci:'...', idSesi:'2267-1' }   satu kelas
 *   { aksi:'hapus', kunci:'...', semua:true }        seluruh data
 *
 * Baris warisan yang ID-nya terlanjur menjadi tanggal ikut dibuang.
 */
function hapus_(body, e) {
  var kunci = kunciAdmin_();
  if (!kunci) {
    return balas_({ ok: false, pesan: 'Kunci admin belum dipasang. Isi Script ' +
                    'property bernama KUNCI_ADMIN pada Apps Script.' }, e);
  }
  if (str_(body.kunci) !== kunci) {
    return balas_({ ok: false, pesan: 'Kunci admin salah.' }, e);
  }

  var semua = body.semua === true || str_(body.semua) === 'true';
  var idSesi = str_(body.idSesi);
  if (!semua && !idSesi) {
    return balas_({ ok: false, pesan: 'Sebutkan idSesi, atau semua:true.' }, e);
  }

  var sh = sheet_();
  var n = sh.getLastRow();
  if (n < 2) return balas_({ ok: true, dihapus: 0, totalBaris: 0 }, e);

  var nilai = sh.getRange(2, 1, n - 1, JUDUL.length).getValues();
  var sisa = [], dihapus = 0;

  for (var r = 0; r < nilai.length; r++) {
    var idb = nilai[r][KOL_ID];
    if (idb instanceof Date) { dihapus++; continue; }   // baris rusak, sekalian dibuang
    if (!str_(idb)) continue;
    if (semua || str_(idb) === idSesi) { dihapus++; continue; }
    sisa.push(nilai[r]);
  }

  sh.getRange(2, 1, n - 1, JUDUL.length).clearContent();
  if (sisa.length) {
    formatKolom_(sh, sisa.length);
    sh.getRange(2, 1, sisa.length, JUDUL.length).setValues(sisa);
  }

  return balas_({ ok: true, aksi: 'hapus', dihapus: dihapus,
                  totalBaris: sisa.length }, e);
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
