# Panduan Memasang Backend (Google Sheets + Apps Script)

Sekali pasang, kurang lebih 10 menit. Setelah ini seluruh ceklis dari semua PJ
mata kuliah masuk ke **satu Google Sheet milik Anda**, dan halaman rekap bisa
menariknya kapan saja.

Yang dibutuhkan: satu akun Google (boleh `andikaarisetyawan@upi.edu`). PJ mata
kuliah **tidak** perlu akun Google apa pun — mereka cukup membuka tautan.

---

## 1. Buat spreadsheet

1. Buka <https://sheets.google.com> lalu buat spreadsheet kosong.
2. Beri nama, misalnya **Rekap Ceklis Pertemuan Ganjil 2026-2027**.

Tidak perlu membuat kolom apa pun — tab `Ceklis` beserta judul kolomnya dibuat
otomatis saat data pertama masuk.

## 2. Tempelkan kode Apps Script

1. Pada spreadsheet tersebut: menu **Ekstensi → Apps Script**.
2. Hapus seluruh isi berkas `Code.gs` yang muncul.
3. Salin **seluruh isi** berkas [`Code.gs`](Code.gs) dari repositori ini,
   lalu tempelkan ke sana.
4. Simpan (ikon disket atau `Ctrl+S`).

## 2b. Pasang kunci admin

Kunci admin adalah kata sandi untuk membuka halaman **Rekapan Pengelola**.
Jangan dibagikan kepada PJ.

> **Penting bila repositori GitHub Anda Public.** Isi `apps-script/Code.gs` ikut
> terbaca siapa saja. Kunci yang diketik langsung ke dalam kode lalu di-commit
> otomatis menjadi publik. Karena itu simpan kunci aslinya lewat **Script
> properties**, bukan di dalam kode.

1. Di editor Apps Script: **Project Settings** (ikon roda gigi kiri) →
   gulir ke **Script properties** → **Add script property**.
2. Isi:
   - **Property**: `KUNCI_ADMIN`
   - **Value**: kunci rahasia Anda, contoh `pgsd-serang-ganjil-8842`
3. **Save script properties**.

Nilai ini selalu menang atas nilai `var KUNCI_ADMIN` di dalam kode, dan tidak
pernah ikut ke GitHub.

Kalau repositori Anda **Private**, boleh saja langsung mengubah baris

```javascript
var KUNCI_ADMIN = 'ganti-kunci-ini-2026';
```

di dalam kode dan melewati langkah Script properties.

## 3. Pasang sebagai Web App

1. Tombol **Deploy → New deployment** (kanan atas).
2. Klik ikon roda gigi di sebelah *Select type* → pilih **Web app**.
3. Isi:
   - **Description**: `rekap ceklis v1`
   - **Execute as**: **Me** (akun Anda sendiri)
   - **Who has access**: **Anyone**

   > **Wajib "Anyone".** Kalau dipilih *Anyone with Google account*, PJ yang
   > belum masuk akun Google akan gagal mengirim. Pilihan ini **tidak**
   > membuat isi spreadsheet Anda bisa dibaca publik — yang terbuka hanyalah
   > alamat pengiriman data, dan pembacaan rekapan tetap terkunci `KUNCI_ADMIN`.

4. **Deploy**. Google akan meminta izin: **Authorize access** → pilih akun Anda
   → muncul peringatan "Google hasn't verified this app" → **Advanced** →
   **Go to … (unsafe)** → **Allow**. Peringatan ini wajar karena skripnya
   buatan sendiri, bukan aplikasi terdaftar.
5. Salin **Web app URL** yang muncul. Bentuknya:

   ```
   https://script.google.com/macros/s/AKfycbx.....................5Qw/exec
   ```

## 4. Pasang alamatnya ke situs

Buka berkas `config.js` di repositori, isi `endpoint` dengan alamat tadi:

```javascript
window.KONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbx...../exec',
  ...
};
```

Simpan, lalu unggah/commit ke GitHub. Selesai.

## 5. Uji coba

1. Buka halaman **Ceklis PJ**. Bilah atas harus berwarna hijau:
   *"Terhubung ke server rekap."* Kalau masih kuning, `endpoint` belum benar.
2. Isi nama, pilih satu mata kuliah dan kelas, centang satu pertemuan,
   tekan **Kirim ceklis**.
3. Lihat Google Sheet Anda — tab `Ceklis` sudah terisi.
4. Buka halaman **Rekapan Pengelola**, masukkan `KUNCI_ADMIN`, tekan
   **Muat rekapan**.

---

## Bila kode diubah kemudian

Setiap kali `Code.gs` disunting, perubahan **belum aktif** sampai dipasang ulang:
**Deploy → Manage deployments →** ikon pensil **→ Version: New version → Deploy**.
Selama memakai *Manage deployments* (bukan *New deployment*), **alamat Web App
tidak berubah**, jadi `config.js` tidak perlu disentuh.

## Menu tambahan di dalam spreadsheet

Setelah kode terpasang, muat ulang spreadsheet. Akan muncul menu
**Rekap Ceklis** berisi:

- *Buat ringkasan per mata kuliah* → membuat tab `Ringkasan MK`
- *Buat ringkasan per dosen* → membuat tab `Ringkasan Dosen`

## Bagaimana data disimpan

- Satu baris = satu pertemuan pada satu kelas.
- Kunci baris adalah **ID Sesi + nomor pertemuan**. Jika PJ mengirim ulang
  kelas yang sama, baris lama kelas tersebut **diganti**, tidak menumpuk.
- Pertemuan yang berstatus "Belum" tidak disimpan, sehingga tabel tetap ramping.
- Kapasitas maksimal 1.600 baris (100 kelas × 16 pertemuan) — jauh di bawah
  batas Google Sheets.

## Kalau bermasalah

| Gejala | Penyebab yang paling sering |
|---|---|
| Bilah atas tetap kuning | `endpoint` kosong, salah ketik, atau tidak berakhiran `/exec` |
| "Kunci admin salah" | Kunci di **Script properties** (atau `var KUNCI_ADMIN`) berbeda dengan yang diketik di halaman rekap. Ingat: Script properties selalu menang |
| PJ bisa membuka halaman tapi gagal kirim | *Who has access* belum disetel **Anyone** |
| Perubahan kode tidak berpengaruh | Belum **Deploy → Manage deployments → New version** |
| "Server sibuk" | Dua PJ mengirim bersamaan; cukup tekan Kirim sekali lagi |

Selama backend belum terpasang, halaman ceklis tetap bisa dipakai: isian
tersimpan di perangkat masing-masing PJ, dan mereka dapat menekan **Unduh JSON**
lalu mengirimkan berkasnya kepada Anda. Berkas itu bisa dibuka di halaman
rekap lewat tombol **Muat berkas JSON**.
