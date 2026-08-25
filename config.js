/* ===========================================================================
   PENGATURAN SITUS  -  satu-satunya berkas yang perlu Anda ubah
   ===========================================================================

   Tempelkan alamat Web App Google Apps Script Anda di bawah ini.
   Alamatnya diperoleh setelah menekan "Deploy > New deployment" pada
   Apps Script, dan bentuknya seperti:

       https://script.google.com/macros/s/AKfycb................/exec

   Langkah lengkapnya ada di apps-script/PANDUAN-PASANG.md
   =========================================================================== */

window.KONFIG = {

  /* WAJIB: alamat Web App Apps Script (harus berakhiran /exec) */
  endpoint: 'https://script.google.com/macros/s/AKfycbw8bUCmIS1TUhFmTrgMGEsSgiT99DBzVJO-Iw3avWGJjomfj-37tkqBGtEfOrQKjxHG/exec',

  /* Judul yang tampil di kepala halaman */
  prodi: 'Program Studi Pendidikan Guru Sekolah Dasar (K0651)',
  kampus: 'UPI Kampus Daerah Serang',
  semester: 'Semester Ganjil 2026/2027',

  /* Batas akhir pengisian yang ditampilkan sebagai imbauan (kosongkan bila
     tidak dipakai). Format bebas, hanya teks. */
  imbauan: 'Ceklis paling lambat diisi 3 hari setelah perkuliahan berlangsung.'
};
