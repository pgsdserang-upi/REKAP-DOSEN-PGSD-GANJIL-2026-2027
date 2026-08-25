/* Penghubung ke backend Google Apps Script.
   Dipakai bersama oleh index.html (ceklis PJ) dan rekap.html (rekap admin). */

(function (global) {
  'use strict';

  var KONFIG = global.KONFIG || {};

  function endpoint() {
    // urutan: config.js -> alamat yang pernah ditempel lewat halaman (localStorage)
    var u = (KONFIG.endpoint || '').trim();
    if (!u) {
      try { u = (localStorage.getItem('endpointServer') || '').trim(); } catch (e) { u = ''; }
    }
    return u;
  }

  function simpanEndpoint(u) {
    try { localStorage.setItem('endpointServer', (u || '').trim()); } catch (e) { /* abaikan */ }
  }

  /* Dua bentuk alamat Web App yang sah:
       akun biasa    https://script.google.com/macros/s/<id>/exec
       akun Workspace https://script.google.com/a/macros/<domain>/s/<id>/exec */
  var POLA = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+|macros)\/s\/[^/]+\/exec/;

  function aktif() {
    return POLA.test(endpoint());
  }

  /* --- POST -------------------------------------------------------------
     Body dikirim sebagai string biasa tanpa header tambahan, supaya browser
     memakai Content-Type text/plain dan tidak memicu preflight CORS yang
     tidak dilayani Apps Script. */
  function kirim(data) {
    if (!aktif()) {
      return Promise.reject(new Error(
        'Alamat server belum diatur. Isi "endpoint" pada berkas config.js.'));
    }
    return fetch(endpoint(), {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify(data)
    }).then(function (r) {
      return r.text();
    }).then(function (t) {
      var j;
      try { j = JSON.parse(t); } catch (e) {
        throw new Error('Jawaban server tidak dikenali. Pastikan Web App ' +
                        'dipasang dengan akses "Anyone".');
      }
      if (!j.ok) {
        // penolakan sah dari skrip (mis. nama PJ kosong) - jangan diulang
        var tolak = new Error(j.pesan || 'Server menolak permintaan.');
        tolak.dariServer = true;
        throw tolak;
      }
      return j;
    }).catch(function (err) {
      if (err && err.dariServer) throw err;
      // fetch gagal di tingkat jaringan/CORS - tempuh jalur cadangan
      return kirimLewatForm(data);
    });
  }

  /* --- Jalur cadangan tanpa CORS ---------------------------------------
     Sebagian peramban dan jaringan memblokir fetch lintas-origin ke
     script.google.com. Pengiriman lewat <form> yang menyasar iframe
     tersembunyi tidak tunduk pada CORS karena dihitung sebagai navigasi.
     Jawabannya tidak bisa dibaca, jadi keberhasilan dipastikan dengan
     membaca ulang sesi tersebut (yang punya cadangan JSONP). */
  function kirimLewatForm(data) {
    return new Promise(function (selesai, gagal) {
      var nama = '__kirim' + Date.now();

      var bingkai = document.createElement('iframe');
      bingkai.name = nama;
      bingkai.setAttribute('aria-hidden', 'true');
      bingkai.setAttribute('tabindex', '-1');
      bingkai.style.cssText = 'position:absolute;left:-9999px;width:0;height:0;border:0';
      document.body.appendChild(bingkai);

      var borang = document.createElement('form');
      borang.method = 'POST';
      borang.action = endpoint();
      borang.target = nama;
      borang.style.display = 'none';
      var isian = document.createElement('input');
      isian.type = 'hidden';
      isian.name = 'payload';
      isian.value = JSON.stringify(data);
      borang.appendChild(isian);
      document.body.appendChild(borang);
      borang.submit();

      var idSesi = (data.sesi && data.sesi.id) || '';
      var target = (data.isi || []).length;

      function bersihkan() {
        if (borang.parentNode) borang.parentNode.removeChild(borang);
        if (bingkai.parentNode) bingkai.parentNode.removeChild(bingkai);
      }

      // Apps Script bisa lambat saat pertama dibangunkan, jadi diperiksa
      // beberapa kali sebelum dinyatakan gagal.
      var sisaCoba = 4;

      function periksa() {
        if (!idSesi) {
          bersihkan();
          selesai({ ok: true, tersimpan: target, lewatCadangan: true });
          return;
        }
        ambil({ aksi: 'sesi', id: idSesi }).then(function (j) {
          var n = (j.data || []).length;
          if (n >= target) {
            bersihkan();
            selesai({ ok: true, tersimpan: n, lewatCadangan: true });
          } else {
            ulangi();
          }
        }).catch(ulangi);
      }

      function ulangi() {
        if (--sisaCoba > 0) {
          setTimeout(periksa, 3000);
        } else {
          bersihkan();
          gagal(new Error('Pengiriman tidak dapat dipastikan. Periksa sambungan ' +
                          'internet Anda, lalu tekan Kirim sekali lagi.'));
        }
      }

      setTimeout(periksa, 3000);
    });
  }

  /* --- GET --------------------------------------------------------------
     Coba fetch biasa; bila diblokir CORS, ulangi lewat JSONP. */
  function ambil(param) {
    if (!aktif()) {
      return Promise.reject(new Error(
        'Alamat server belum diatur. Isi "endpoint" pada berkas config.js.'));
    }
    var dasar = endpoint();
    var q = [];
    for (var k in param) {
      if (Object.prototype.hasOwnProperty.call(param, k)) {
        q.push(encodeURIComponent(k) + '=' + encodeURIComponent(param[k]));
      }
    }
    var url = dasar + (dasar.indexOf('?') < 0 ? '?' : '&') + q.join('&');

    return fetch(url, { redirect: 'follow' })
      .then(function (r) { return r.text(); })
      .then(function (t) { return JSON.parse(t); })
      .catch(function () { return jsonp(url); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.pesan) || 'Gagal membaca data.');
        return j;
      });
  }

  var noJsonp = 0;

  function jsonp(url) {
    return new Promise(function (selesai, gagal) {
      var nama = '__cb' + (++noJsonp) + '_' + Date.now();
      var s = document.createElement('script');
      var beres = false;

      var waktu = setTimeout(function () {
        if (!beres) { bersihkan(); gagal(new Error('Server tidak menjawab (habis waktu).')); }
      }, 45000);

      function bersihkan() {
        beres = true;
        clearTimeout(waktu);
        try { delete global[nama]; } catch (e) { global[nama] = undefined; }
        if (s.parentNode) s.parentNode.removeChild(s);
      }

      global[nama] = function (data) { bersihkan(); selesai(data); };

      s.src = url + '&callback=' + nama;
      s.onerror = function () {
        if (!beres) { bersihkan(); gagal(new Error('Tidak dapat menghubungi server.')); }
      };
      document.head.appendChild(s);
    });
  }

  global.API = {
    aktif: aktif,
    endpoint: endpoint,
    simpanEndpoint: simpanEndpoint,
    kirim: kirim,
    ambil: ambil
  };
})(window);
