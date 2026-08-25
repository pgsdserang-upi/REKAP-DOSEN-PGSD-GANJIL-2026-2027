# Ceklis Pelaksanaan Perkuliahan — 16 Pertemuan

Sistem ceklis daring untuk penanggung jawab (PJ) mata kuliah, beserta rekapan
terpusat bagi pengelola. Program Studi PGSD (K0651), UPI Kampus Daerah Serang,
Semester Ganjil 2026/2027.

**16 dosen · 24 mata kuliah · 100 kelas · 16 pertemuan · 1.600 titik ceklis**
**24 Agustus 2026 s.d. 11 Desember 2026**

---

## Apa yang berubah dari versi sebelumnya

| | Versi lama | Versi ini |
|---|---|---|
| Cakupan | 1 minggu (24–29 Agustus 2026) | **16 kali pertemuan**, berulang mingguan |
| Hari | Senin–Sabtu | **Senin–Jumat**; 29 Agustus 2026 (Sabtu) dihapus |
| Pengisi | Admin penginput | **PJ mata kuliah** (mahasiswa), mengisi sendiri |
| Penyimpanan | Hanya di browser masing-masing | **Terpusat** di satu Google Sheet |
| Rekapan | Harus gabung berkas manual | **Otomatis**, seluruh PJ dalam satu halaman |

Jadwal setiap kelas berulang pada hari dan jam yang sama setiap minggu:

| Hari | Pertemuan 1 | Pertemuan 16 |
|---|---|---|
| Senin | 24 Agustus 2026 | 7 Desember 2026 |
| Selasa | 25 Agustus 2026 | 8 Desember 2026 |
| Rabu | 26 Agustus 2026 | 9 Desember 2026 |
| Kamis | 27 Agustus 2026 | 10 Desember 2026 |
| Jumat | 28 Agustus 2026 | 11 Desember 2026 |

Hari libur nasional dan jadwal UTS/UAS **belum** diperhitungkan — lihat
[Menyesuaikan tanggal](#menyesuaikan-tanggal-libur--uts) bila perlu digeser.

---

## Tiga halaman

| Halaman | Untuk siapa | Isi |
|---|---|---|
| `index.html` | **PJ mata kuliah** | Isi nama → pilih mata kuliah & kelas → ceklis 16 pertemuan → Kirim |
| `jadwal.html` | Umum | Jadwal mengajar per dosen lengkap dengan tanggal 16 pertemuan |
| `rekap.html` | **Pengelola** | Rekapan seluruh ceklis dari semua PJ; terkunci kunci admin |

---

## Cara memasang

### 1. Pasang backend (wajib, sekali saja)

Ceklis dari banyak PJ perlu tempat simpan bersama. GitHub Pages hanya melayani
berkas statis, jadi penyimpanannya memakai **Google Sheets + Google Apps
Script** — gratis, tanpa kartu kredit, datanya di akun Google Anda sendiri.

➡ Ikuti **[apps-script/PANDUAN-PASANG.md](apps-script/PANDUAN-PASANG.md)**
(± 10 menit), lalu tempelkan alamat Web App ke `endpoint` pada `config.js`.

PJ **tidak** perlu akun Google.

### 2. Unggah ke GitHub Pages

```bash
git init
git add .
git commit -m "Ceklis 16 pertemuan Ganjil 2026-2027"
git branch -M main
git remote add origin https://github.com/<akun>/<nama-repo>.git
git push -u origin main
```

Atau lewat browser: **Add file → Upload files**, seret seluruh isi folder,
lalu **Commit changes**.

Kemudian **Settings → Pages → Source: Deploy from a branch → main → / (root) → Save**.
Setelah 1–2 menit halaman tersedia di:

```
https://<akun>.github.io/<nama-repo>/
```

> Repositori harus **Public** agar GitHub Pages gratis pada akun personal.
> `config.js` ikut terbaca publik — itu tidak masalah: yang ada di sana hanya
> alamat pengiriman.
>
> **Yang tidak boleh ikut publik adalah kunci admin.** Biarkan
> `apps-script/Code.gs` di repositori memakai nilai contoh, dan simpan kunci
> aslinya lewat **Script Properties** di Apps Script (lihat panduan). Kalau
> kunci asli diketik langsung ke `Code.gs` lalu ikut di-commit, siapa pun yang
> membuka repositori bisa membaca rekapan Anda.

### 3. Bagikan tautan

- Kepada **PJ mata kuliah**: `https://<akun>.github.io/<nama-repo>/`
- Untuk **Anda sendiri**: `https://<akun>.github.io/<nama-repo>/rekap.html`
  (masukkan kunci admin di sana)

---

## Cara pakai bagi PJ mata kuliah

1. Buka tautan yang dibagikan (bisa dari HP).
2. Isi **nama lengkap**, NIM, dan nomor WhatsApp. Cukup sekali — tersimpan
   otomatis di perangkat. Tidak ada pendaftaran dan tidak ada kata sandi.
3. Pilih **mata kuliah** lalu **kelas** yang menjadi tanggung jawabnya. Detail
   dosen, hari, jam, dan ruangan akan tampil sebagai penanda bahwa pilihannya benar.
4. Tandai tiap pertemuan: **Terlaksana**, **Tidak**, **Diganti**, atau biarkan
   **Belum**. Kolom keterangan boleh diisi bila ada catatan.
5. Tekan **Kirim ceklis**.

Catatan:
- Isian tersimpan otomatis di perangkat setiap kali diubah, tetapi **baru masuk
  rekapan setelah menekan Kirim**. Halaman akan memperingatkan bila ditutup
  sebelum dikirim.
- Boleh diisi bertahap — buka lagi kapan saja, ceklis yang sudah terkirim akan
  dimuat kembali dari server.
- Satu orang boleh memegang lebih dari satu kelas: cukup ganti pilihan kelas.
- Tombol **Tandai semua terlaksana** hanya mengisi pertemuan yang tanggalnya
  sudah lewat, sisanya dibiarkan kosong.

## Cara pakai bagi pengelola

Buka `rekap.html`, masukkan kunci admin, tekan **Muat rekapan**. Tersedia:

- **Ringkasan** — jumlah ceklis terisi, kelas yang sudah dilaporkan, jumlah
  pertemuan terlaksana/tidak/diganti, dan jumlah PJ yang sudah mengisi.
- **Kelengkapan per pertemuan** — berapa kelas yang sudah melaporkan
  pertemuan ke-1, ke-2, dan seterusnya.
- **Matriks 100 kelas × 16 pertemuan** — satu layar untuk seluruh program studi.
  Arahkan kursor ke kotak untuk melihat tanggal, keterangan, dan nama PJ.
  Bisa disaring per dosen, per mata kuliah, per tingkat kelengkapan, atau dicari bebas.
- **Kelas yang belum diceklis** — daftar siapa yang perlu ditagih.
- **Rekap per penanggung jawab** — siapa mengisi apa, berapa banyak, dan kapan.
- **Unduh CSV** (1.600 baris, pemisah `;`, siap dibuka Excel Indonesia),
  **Unduh JSON**, dan **Cetak / PDF**.

Data mentahnya juga selalu bisa dibuka langsung di Google Sheet Anda.

---

## Isi repositori

| Berkas | Keterangan |
|---|---|
| `index.html` | Halaman ceklis PJ — dibangkitkan `build_site.py` |
| `jadwal.html` | Jadwal mengajar 16 pertemuan — dibangkitkan `build_site.py` |
| `rekap.html` | Halaman rekapan pengelola — dibangkitkan `build_site.py` |
| `config.js` | **Satu-satunya berkas yang perlu Anda ubah** — alamat Web App |
| `assets/app.css` | Gaya tampilan seluruh halaman |
| `assets/api.js` | Penghubung ke Apps Script (POST simpan, GET baca) |
| `assets/ceklis.js` | Logika halaman ceklis PJ |
| `assets/rekap.js` | Logika halaman rekapan |
| `apps-script/Code.gs` | Kode backend untuk ditempel ke Google Apps Script |
| `apps-script/PANDUAN-PASANG.md` | Panduan pemasangan backend |
| `data.json` | Data mentah hasil ekstraksi PDF jadwal (sumber kebenaran) |
| `jadwal_data.py` | Mengubah `data.json` → 100 sesi × 16 pertemuan |
| `jadwal.json` | Hasil olahan `jadwal_data.py`, siap pakai |
| `build_site.py` | Membangun ketiga halaman HTML |
| `build.py` | Membangun versi cetak PDF |
| `Jadwal dan Ceklis 16 Pertemuan Ganjil 2026-2027.pdf` | Versi cetak (cadangan manual) |
| `Rekap Jadwal per Dosen Ganjil 2026-2027.pdf` | Dokumen sumber |
| `arsip/` | Berkas versi lama (form mingguan 24–29 Agustus) |

---

## Membangun ulang

```bash
python build_site.py   # index.html, jadwal.html, rekap.html, jadwal.json
python build.py        # versi PDF (butuh paket reportlab)
```

`build_site.py` menanam data jadwal langsung ke dalam HTML, sehingga halaman
tetap berfungsi meski dibuka tanpa server.

### Menyesuaikan tanggal libur / UTS

Buka `jadwal_data.py`, isi daftar `LIBUR`, lalu bangun ulang. Tanggal yang
disebut akan dilewati dan pertemuan bergeser ke minggu berikutnya:

```python
LIBUR = {'2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'}
```

Jumlah pertemuan diubah lewat `JUMLAH_PERTEMUAN`, dan tanggal mulai tiap hari
lewat `AWAL`.

> Setelah membangun ulang dan mengunggah, ceklis yang **sudah** terkirim tetap
> menyimpan tanggal lamanya di Google Sheet. Bila pergeseran dilakukan di
> tengah semester, kolom Tanggal pada baris lama perlu diperbaiki manual di
> spreadsheet.

### Bila jadwal mengajar berubah

`data.json` adalah sumbernya. Sunting di sana (format tiap baris:
`[no, mata kuliah, sks, kelas, hari, jam, ruangan]`), lalu bangun ulang.

---

## Bila backend belum/tidak dipasang

Halaman ceklis tetap dapat dipakai. Bilah atas akan berwarna kuning sebagai
penanda, isian tersimpan di perangkat masing-masing PJ, dan tersedia tombol
**Unduh JSON**. Berkas itu dikirimkan kepada pengelola, lalu dibuka di
`rekap.html` lewat **Muat berkas JSON**. Cara ini berjalan, hanya saja
rekapannya tidak otomatis.
