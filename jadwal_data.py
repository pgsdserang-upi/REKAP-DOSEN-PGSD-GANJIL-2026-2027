# -*- coding: utf-8 -*-
"""Sumber data tunggal: membaca data.json (hasil ekstraksi PDF) lalu
menyusunnya menjadi 100 sesi perkuliahan dengan 16 kali pertemuan,
berulang setiap minggu, Senin s.d. Jumat.

Pertemuan 1 : minggu 24 - 28 Agustus 2026
Pertemuan 16: 7 - 11 Desember 2026
Hari Sabtu (29 Agustus 2026) dihapus - tidak ada jadwal perkuliahan.
"""
import json
import re
from datetime import date, timedelta

# --- Konfigurasi periode -----------------------------------------------------
JUMLAH_PERTEMUAN = 16
# Tanggal pertemuan ke-1 untuk masing-masing hari (Senin s.d. Jumat).
AWAL = {
    'Senin':  date(2026, 8, 24),
    'Selasa': date(2026, 8, 25),
    'Rabu':   date(2026, 8, 26),
    'Kamis':  date(2026, 8, 27),
    'Jumat':  date(2026, 8, 28),
}
HARI = list(AWAL)
# Tanggal yang dilewati (libur nasional / UTS). Isi dengan 'YYYY-MM-DD';
# pertemuan akan otomatis digeser ke minggu berikutnya.
LIBUR = set()

BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
         'Agustus', 'September', 'Oktober', 'November', 'Desember']
BULAN_SGKT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu',
              'Sep', 'Okt', 'Nov', 'Des']


def clean(s):
    if s is None:
        return ''
    # '\ufffd' muncul dari en-dash yang salah dekode saat ekstraksi PDF
    return s.replace('\ufffd', '\u2013').replace('\n', ' ').replace('  ', ' ').strip()


def tanggal_pertemuan(hari):
    """16 tanggal berurutan untuk satu hari, melewati tanggal libur."""
    out, d = [], AWAL[hari]
    while len(out) < JUMLAH_PERTEMUAN:
        if d.isoformat() not in LIBUR:
            out.append(d)
        d += timedelta(days=7)
    return out


def fmt_panjang(d):
    return '%d %s %d' % (d.day, BULAN[d.month], d.year)


def fmt_pendek(d):
    return '%d %s' % (d.day, BULAN_SGKT[d.month])


def muat(path='data.json'):
    docs = json.load(open(path, encoding='utf-8'))

    jadwal = {h: [t.isoformat() for t in tanggal_pertemuan(h)] for h in HARI}

    dosen, sesi = [], []
    for L in docs[:16]:
        kode = clean(L['kode'])
        nama = clean(L['nama'])
        # baris berukuran != 7 adalah tabel ringkasan yang ikut terekstraksi
        rows = [r for r in L['rows'] if len(r) == 7]
        n_sesi = 0
        for r in rows:
            no, mk, sks, kelas, hari, jam, ruangan = [clean(x) for x in r]
            if hari not in AWAL:          # buang hari di luar Senin-Jumat
                continue
            m = re.search(r'\(([A-Z]{2}\d{3})\)', mk)
            kode_mk = m.group(1) if m else ''
            nama_mk = re.sub(r'\s*\([A-Z]{2}\d{3}\)\s*$', '', mk).strip()
            n_sesi += 1
            sesi.append({
                'id': '%s-%s' % (kode, no),
                'dosenNo': L['no'],
                'dosen': nama,
                'kodeDosen': kode,
                'no': no,
                'mk': nama_mk,
                'kodeMk': kode_mk,
                'sks': sks,
                'kelas': kelas,
                'hari': hari,
                'jam': jam,
                'ruangan': ruangan,
                'tanggal': jadwal[hari],
            })
        dosen.append({'no': L['no'], 'nama': nama, 'kode': kode, 'jumlahSesi': n_sesi})

    urut = {h: i for i, h in enumerate(HARI)}
    sesi.sort(key=lambda s: (s['dosenNo'], urut[s['hari']], s['jam']))

    return {
        'meta': {
            'prodi': 'Pendidikan Guru Sekolah Dasar (K0651)',
            'kampus': 'UPI Kampus Daerah Serang',
            'semester': 'Ganjil 2026/2027',
            'jumlahPertemuan': JUMLAH_PERTEMUAN,
            'mulai': min(AWAL.values()).isoformat(),
            'selesai': max(tanggal_pertemuan(h)[-1] for h in HARI).isoformat(),
            'hari': HARI,
            'jumlahDosen': len(dosen),
            'jumlahSesi': len(sesi),
        },
        'pertemuan': jadwal,
        'dosen': dosen,
        'sesi': sesi,
    }


if __name__ == '__main__':
    d = muat()
    json.dump(d, open('jadwal.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    m = d['meta']
    print('%d dosen, %d sesi, %d pertemuan' %
          (m['jumlahDosen'], m['jumlahSesi'], m['jumlahPertemuan']))
    print('periode %s s.d. %s' % (m['mulai'], m['selesai']))
    print('total ceklis = %d' % (m['jumlahSesi'] * m['jumlahPertemuan']))
    for h in HARI:
        print(' ', h.ljust(7), ' '.join(t[5:] for t in d['pertemuan'][h]))
