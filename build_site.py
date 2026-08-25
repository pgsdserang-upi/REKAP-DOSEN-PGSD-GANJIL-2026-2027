# -*- coding: utf-8 -*-
"""Membangun situs statis (index.html, jadwal.html, rekap.html) dari data.json.

    python build_site.py

Berkas gaya dan skrip berada di folder assets/ dan tidak ikut dibangkitkan,
sehingga bisa disunting langsung tanpa menjalankan ulang skrip ini.
"""
import json
import time
from datetime import date
from html import escape as E

import jadwal_data as JD

D = JD.muat()
META, PERTEMUAN, DOSEN, SESI = D['meta'], D['pertemuan'], D['dosen'], D['sesi']
JML = META['jumlahPertemuan']

# penanda versi pada tautan aset, supaya peramban tidak memakai berkas lama
VER = time.strftime('%Y%m%d%H%M')


def tgl_panjang(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    return '%d %s %d' % (d, JD.BULAN[m], y)


def tgl_pendek(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    return '%d %s' % (d, JD.BULAN_SGKT[m])


PERIODE = '%s s.d. %s' % (tgl_panjang(META['mulai']), tgl_panjang(META['selesai']))
SUBJUDUL = '%s &middot; %s &middot; %s' % (
    E(META['prodi']), E(META['kampus']), E(META['semester']))


def halaman(judul, aktif, isi, skrip, data=True, kelas_body=''):
    tab = [('index.html', 'Ceklis PJ'),
           ('jadwal.html', 'Jadwal 16 Pertemuan'),
           ('rekap.html', 'Rekapan Pengelola')]
    nav = '\n      '.join(
        '<a href="%s"%s>%s</a>' % (h, ' class="aktif"' if h == aktif else '', t)
        for h, t in tab)

    blok_data = ''
    if data:
        ringkas = {'meta': META, 'sesi': SESI}
        blok_data = ('<script id="data-jadwal">window.DATA=%s;</script>\n  '
                     % json.dumps(ringkas, ensure_ascii=False, separators=(',', ':')))

    return """<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{judul}</title>
<meta name="description" content="Ceklis dan rekapan pelaksanaan 16 kali pertemuan perkuliahan, {sem}.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text y='13' font-size='13'>&#9989;</text></svg>">
<link rel="stylesheet" href="assets/app.css?v={ver}">
</head>
<body{kb}>

<header class="top">
  <div class="wrap">
    <h1>{judul}</h1>
    <p>{sub}</p>
    <p>{periode} &middot; {n} kali pertemuan &middot; {ns} kelas &middot; {nd} dosen</p>
    <nav class="nav">
      {nav}
    </nav>
  </div>
</header>

<main class="wrap">
{isi}
</main>

<footer class="kaki">
  Rekap Pelaksanaan Perkuliahan {sem} &middot; {kampus}<br>
  Halaman dibangkitkan {dibuat}.
</footer>

{blokdata}<script src="config.js?v={ver}"></script>
<script src="assets/api.js?v={ver}"></script>
{skrip}
</body>
</html>
""".format(judul=E(judul), sub=SUBJUDUL, periode=E(PERIODE), n=JML,
           ns=META['jumlahSesi'], nd=META['jumlahDosen'], nav=nav, isi=isi,
           sem=E(META['semester']), kampus=E(META['kampus']),
           dibuat=tgl_panjang(date.today().isoformat()),
           blokdata=blok_data, skrip=skrip, ver=VER, kb=(' class="%s"' % kelas_body) if kelas_body else '')


# ============================================================================
# 1. index.html — ceklis untuk PJ mata kuliah
# ============================================================================

INDEX_ISI = """
  <div id="statusServer" class="pesan info">Memeriksa sambungan ke server…</div>

  <section class="kartu">
    <header><span class="langkah">1</span><h2>Identitas penanggung jawab</h2>
      <span class="sub">nama Anda akan muncul pada rekapan pengelola</span></header>
    <div class="isi">
      <div class="baris">
        <div class="bidang" style="flex:2 1 260px">
          <label for="pjNama">Nama lengkap PJ <span style="color:#b4232a">*</span></label>
          <input type="text" id="pjNama" autocomplete="name" placeholder="contoh: Siti Nurhaliza">
        </div>
        <div class="bidang">
          <label for="pjNim">NIM</label>
          <input type="text" id="pjNim" inputmode="numeric" placeholder="contoh: 2405123">
        </div>
        <div class="bidang">
          <label for="pjKontak">No. WhatsApp</label>
          <input type="text" id="pjKontak" inputmode="tel" placeholder="contoh: 0812xxxxxxx">
        </div>
      </div>
      <p class="bantuan">Identitas ini tersimpan otomatis di perangkat Anda, jadi tidak perlu
      diisi ulang setiap kali membuka halaman.</p>
    </div>
  </section>

  <section class="kartu">
    <header><span class="langkah">2</span><h2>Pilih mata kuliah dan kelas yang Anda pegang</h2></header>
    <div class="isi">
      <div class="baris">
        <div class="bidang" style="flex:2 1 300px">
          <label for="pilihMk">Mata kuliah</label>
          <select id="pilihMk"><option value="">— pilih mata kuliah —</option></select>
        </div>
        <div class="bidang" style="flex:2 1 300px">
          <label for="pilihKelas">Kelas</label>
          <select id="pilihKelas" disabled><option value="">— pilih mata kuliah dahulu —</option></select>
        </div>
      </div>
      <dl class="detail sembunyi" id="detailSesi"></dl>
      <p class="bantuan" id="statusMuat"></p>
    </div>
  </section>

  <section class="kartu sembunyi" id="kartuCeklis">
    <header><span class="langkah">3</span><h2>Ceklis {n} pertemuan</h2>
      <span class="sub">tandai pelaksanaan tiap pertemuan</span></header>
    <div class="isi">
      <div id="pesan" class="sembunyi"></div>
      <div class="alat tanpa-cetak" style="margin-bottom:12px">
        <button type="button" class="btn kecil" id="tombolSemuaHadir">Tandai semua terlaksana</button>
        <button type="button" class="btn kecil" id="tombolBersih">Kosongkan</button>
        <button type="button" class="btn kecil" id="tombolJson">Unduh JSON</button>
      </div>
      <div class="pertemuan" id="daftarPertemuan"></div>
      <p class="bantuan">Isian tersimpan otomatis di perangkat ini setiap kali diubah, tetapi
      <b>baru masuk rekapan pengelola setelah Anda menekan tombol Kirim ceklis</b>.</p>
    </div>
  </section>
"""

INDEX_BAWAH = """
<div class="bar-bawah sembunyi" id="barBawah">
  <div class="wrap">
    <div class="progres">
      <div class="angka" id="progresAngka"><b>0</b> dari {n} pertemuan terisi</div>
      <div class="rel"><i id="progresBar"></i></div>
    </div>
    <button type="button" class="btn utama" id="tombolKirim" disabled>Kirim ceklis</button>
  </div>
</div>
"""


def bangun_index():
    isi = INDEX_ISI.format(n=JML)
    skrip = INDEX_BAWAH.format(n=JML) + '<script src="assets/ceklis.js?v=%s"></script>' % VER
    return halaman('Ceklis Pelaksanaan Perkuliahan', 'index.html', isi, skrip)


# ============================================================================
# 2. jadwal.html — jadwal mengajar 16 pertemuan
# ============================================================================

def bangun_jadwal():
    bag = ['''
  <section class="kartu">
    <header><h2>Jadwal mengajar {n} kali pertemuan</h2>
      <span class="sub">berulang setiap minggu, Senin s.d. Jumat</span></header>
    <div class="isi">
      <div class="angka-grid" style="margin-bottom:14px">
        <div class="stat"><div class="nilai">{n}</div><div class="judul">Pertemuan per kelas</div></div>
        <div class="stat"><div class="nilai">{ns}</div><div class="judul">Kelas perkuliahan</div></div>
        <div class="stat"><div class="nilai">{nd}</div><div class="judul">Dosen pengampu</div></div>
        <div class="stat"><div class="nilai">{tot}</div><div class="judul">Total pertemuan</div></div>
      </div>
      <div class="gulung">
        <table>
          <thead><tr><th>Hari</th>{th}</tr></thead>
          <tbody>{tb}</tbody>
        </table>
      </div>
      <p class="bantuan">Pertemuan ke-1 jatuh pada minggu {mulai1}. Tidak ada perkuliahan
      pada hari Sabtu.</p>
    </div>
  </section>

  <div class="alat tanpa-cetak" style="margin:0 0 14px">
    <div class="bidang" style="flex:1 1 320px;max-width:420px">
      <label for="cariJadwal">Cari dosen, mata kuliah, kelas, atau ruangan</label>
      <input type="search" id="cariJadwal" placeholder="ketik untuk menyaring…">
    </div>
    <button type="button" class="btn" onclick="window.print()">Cetak / Simpan PDF</button>
  </div>
'''.format(n=JML, ns=META['jumlahSesi'], nd=META['jumlahDosen'],
           tot=META['jumlahSesi'] * JML,
           mulai1='%s s.d. %s' % (tgl_panjang(PERTEMUAN['Senin'][0]),
                                  tgl_panjang(PERTEMUAN['Jumat'][0])),
           th=''.join('<th class="c">P%d</th>' % p for p in range(1, JML + 1)),
           tb=''.join(
               '<tr><td><b>%s</b></td>%s</tr>' % (
                   h, ''.join('<td class="c nowrap">%s</td>' % tgl_pendek(t)
                              for t in PERTEMUAN[h]))
               for h in JD.HARI))]

    per_dosen = {}
    for s in SESI:
        per_dosen.setdefault(s['dosenNo'], []).append(s)

    for d in DOSEN:
        rows = per_dosen.get(d['no'], [])
        if not rows:
            continue
        baris = []
        for i, s in enumerate(rows, 1):
            cari = ' '.join([s['dosen'], s['kodeDosen'], s['mk'], s['kodeMk'],
                             s['kelas'], s['hari'], s['jam'], s['ruangan']]).lower()
            sel = ''.join('<td class="kol-p nowrap">%s</td>' % tgl_pendek(t)
                          for t in s['tanggal'])
            baris.append(
                '<tr data-cari="%s"><td class="c">%d</td><td>%s <small>(%s)</small></td>'
                '<td class="c">%s</td><td class="c">%s</td><td>%s</td>'
                '<td class="nowrap">%s</td><td>%s</td>%s</tr>'
                % (E(cari), i, E(s['mk']), E(s['kodeMk']), E(s['sks']), E(s['kelas']),
                   E(s['hari']), E(s['jam']), E(s['ruangan']), sel))

        kepala = ''.join(
            '<th class="kol-p"><span>%d</span></th>' % p for p in range(1, JML + 1))

        bag.append(
            '\n  <section class="kartu dosen-blok" data-dosen="%s">\n'
            '    <header><h2>%d. %s</h2>'
            '<span class="lencana">%d kelas &times; %d pertemuan = %d</span>'
            '<span class="sub">Kode Dosen: %s</span></header>\n'
            '    <div class="gulung">\n'
            '      <table>\n'
            '        <thead><tr><th class="c">NO</th><th>MATA KULIAH</th><th class="c">SKS</th>'
            '<th class="c">KELAS</th><th>HARI</th><th>JAM</th><th>RUANGAN</th>%s</tr></thead>\n'
            '        <tbody>\n%s\n        </tbody>\n'
            '      </table>\n    </div>\n  </section>'
            % (E(d['nama']), d['no'], E(d['nama']), len(rows), JML, len(rows) * JML,
               E(d['kode']), kepala, '\n'.join('          ' + b for b in baris)))

    skrip = '''<script>
(function () {
  var cari = document.getElementById('cariJadwal');
  cari.addEventListener('input', function () {
    var q = this.value.trim().toLowerCase();
    document.querySelectorAll('.dosen-blok').forEach(function (blok) {
      var tampil = 0;
      blok.querySelectorAll('tbody tr').forEach(function (tr) {
        var ok = !q || tr.getAttribute('data-cari').indexOf(q) >= 0 ||
                 blok.getAttribute('data-dosen').toLowerCase().indexOf(q) >= 0;
        tr.classList.toggle('sembunyi', !ok);
        if (ok) tampil++;
      });
      blok.classList.toggle('sembunyi', tampil === 0);
    });
  });
})();
</script>'''
    return halaman('Jadwal Mengajar %d Pertemuan' % JML, 'jadwal.html',
                   '\n'.join(bag), skrip, data=False)


# ============================================================================
# 3. rekap.html — rekapan seluruh ceklis PJ
# ============================================================================

REKAP_ISI = """
  <section class="kartu tanpa-cetak">
    <header><h2>Akses rekapan</h2>
      <span class="sub">masukkan kunci admin yang Anda pasang pada Apps Script</span></header>
    <div class="isi">
      <div class="baris">
        <div class="bidang" style="flex:2 1 260px">
          <label for="kunciAdmin">Kunci admin</label>
          <input type="password" id="kunciAdmin" autocomplete="current-password"
                 placeholder="kunci dari berkas Code.gs">
        </div>
        <div class="bidang" style="flex:0 0 auto;align-self:flex-end">
          <button type="button" class="btn utama" id="tombolMuat">Muat rekapan</button>
        </div>
        <div class="bidang" style="flex:0 0 auto;align-self:flex-end">
          <label for="berkasJson" class="btn" style="margin:0;cursor:pointer;font-weight:600;color:inherit">
            Muat berkas JSON</label>
          <input type="file" id="berkasJson" accept=".json" class="sr">
        </div>
      </div>
      <p class="bantuan"><label style="display:inline;font-weight:400">
        <input type="checkbox" id="ingatKunci"> Ingat kunci di peramban ini</label></p>
    </div>
  </section>

  <div id="pesan" class="sembunyi"></div>

  <div id="hasil" class="sembunyi">

    <section class="kartu">
      <header><h2>Ringkasan</h2></header>
      <div class="isi"><div class="angka-grid" id="stat"></div></div>
    </section>

    <section class="kartu">
      <header><h2>Kelengkapan per pertemuan</h2>
        <span class="sub">dari {ns} kelas</span></header>
      <div class="isi" id="perPertemuan"></div>
    </section>

    <section class="kartu">
      <header><h2>Matriks ceklis seluruh kelas</h2>
        <span class="sub" id="jumlahTampil"></span></header>
      <div class="isi">
        <div class="alat tanpa-cetak" style="margin-bottom:12px">
          <div class="bidang" style="flex:1 1 220px">
            <label for="cari">Cari</label>
            <input type="search" id="cari" placeholder="dosen, mata kuliah, PJ…">
          </div>
          <div class="bidang" style="flex:1 1 200px">
            <label for="filterDosen">Dosen</label>
            <select id="filterDosen"><option value="">Semua dosen</option></select>
          </div>
          <div class="bidang" style="flex:1 1 200px">
            <label for="filterMk">Mata kuliah</label>
            <select id="filterMk"><option value="">Semua mata kuliah</option></select>
          </div>
          <div class="bidang" style="flex:1 1 160px">
            <label for="filterKeadaan">Kelengkapan</label>
            <select id="filterKeadaan">
              <option value="">Semua kelas</option>
              <option value="belum">Belum diisi sama sekali</option>
              <option value="sebagian">Terisi sebagian</option>
              <option value="lengkap">Lengkap {n} pertemuan</option>
            </select>
          </div>
          <button type="button" class="btn" id="tombolCsv">Unduh CSV</button>
          <button type="button" class="btn" id="tombolJson">Unduh JSON</button>
          <button type="button" class="btn" id="tombolCetak">Cetak / PDF</button>
          <button type="button" class="btn bahaya" id="tombolKosongkan">Kosongkan semua data</button>
        </div>

        <div class="pesan salah tanpa-cetak sembunyi" id="panelKosongkan">
          <p style="margin:0 0 8px"><b>Hapus seluruh ceklis dari semua PJ?</b>
          Tindakan ini tidak bisa dibatalkan. Sebaiknya tekan <b>Unduh JSON</b>
          lebih dahulu sebagai cadangan.</p>
          <div class="alat" style="align-items:center">
            <div class="bidang" style="flex:0 1 220px">
              <label for="konfirmKosongkan">Ketik <code>HAPUS SEMUA</code> untuk menegaskan</label>
              <input type="text" id="konfirmKosongkan" autocomplete="off" placeholder="HAPUS SEMUA">
            </div>
            <button type="button" class="btn bahaya" id="tombolKosongkanYa" disabled>Ya, hapus semuanya</button>
            <button type="button" class="btn" id="tombolKosongkanBatal">Batal</button>
          </div>
        </div>
        <p class="bantuan" style="margin:0 0 8px">
          <span class="sel sel-hadir" style="padding:1px 6px;border-radius:4px">&#10004;</span> terlaksana &nbsp;
          <span class="sel sel-tidak" style="padding:1px 6px;border-radius:4px">&#10008;</span> tidak terlaksana &nbsp;
          <span class="sel sel-ganti" style="padding:1px 6px;border-radius:4px">&#8635;</span> diganti/ditunda &nbsp;
          <span class="sel sel-kosong" style="padding:1px 6px;border-radius:4px">&middot;</span> belum diisi
          &nbsp;— arahkan kursor ke kotak untuk melihat tanggal, keterangan, dan nama PJ.
        </p>
        <div class="gulung"><table id="tabelRekap"></table></div>
      </div>
    </section>

    <section class="kartu">
      <header><h2>Kelas yang belum diceklis</h2></header>
      <div class="isi" id="belumLapor"></div>
    </section>

    <section class="kartu">
      <header><h2>Rekap per penanggung jawab</h2></header>
      <div class="isi" id="perPj"></div>
    </section>

  </div>
"""


def bangun_rekap():
    isi = REKAP_ISI.format(n=JML, ns=META['jumlahSesi'])
    return halaman('Rekapan Ceklis Seluruh PJ', 'rekap.html', isi,
                   '<script src="assets/rekap.js?v=%s"></script>' % VER)


# ============================================================================

if __name__ == '__main__':
    json.dump(D, open('jadwal.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    for nama, teks in [('index.html', bangun_index()),
                       ('jadwal.html', bangun_jadwal()),
                       ('rekap.html', bangun_rekap())]:
        open(nama, 'w', encoding='utf-8', newline='\n').write(teks)
        print('%-13s %7d byte' % (nama, len(teks.encode('utf-8'))))

    print('jadwal.json   %d sesi x %d pertemuan = %d ceklis'
          % (META['jumlahSesi'], JML, META['jumlahSesi'] * JML))
