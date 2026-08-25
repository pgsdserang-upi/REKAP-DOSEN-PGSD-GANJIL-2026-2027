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
      if (!j.ok) throw new Error(j.pesan || 'Server menolak permintaan.');
      return j;
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
