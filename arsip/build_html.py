# -*- coding: utf-8 -*-
"""Membuat index.html (form ceklis kehadiran dosen) dari data.json."""
import json
from html import escape

DAYS = [('Senin', '24'), ('Selasa', '25'), ('Rabu', '26'),
        ('Kamis', '27'), ('Jumat', '28'), ('Sabtu', '29')]
TANGGAL = {d: '2026-08-%s' % t for d, t in DAYS}


def clean(s):
    if s is None:
        return ''
    return s.replace('�', '–').replace('\n', ' ').strip()


docs = json.load(open('data.json', encoding='utf-8'))
lecturers = [dict(d) for d in docs[:16]]
rekap_rows = [r for r in lecturers[15]['rows'] if len(r) == 5]
lecturers[15]['rows'] = [r for r in lecturers[15]['rows'] if len(r) == 7]

sesi = []
blocks = []

for L in lecturers:
    kode = clean(L['kode'])
    nama = clean(L['nama'])
    rows_html = []
    for r in L['rows']:
        no, mk, sks, kelas, hari, jam, ruangan = [clean(x) for x in r]
        sid = '%s-%s' % (kode, no)
        sesi.append({'id': sid, 'dosenNo': L['no'], 'dosen': nama, 'kode': kode,
                     'no': no, 'mk': mk, 'sks': sks, 'kelas': kelas, 'hari': hari,
                     'jam': jam, 'ruangan': ruangan,
                     'tanggal': TANGGAL.get(hari, '')})
        cells = []
        for d, tgl in DAYS:
            if d.lower() == hari.lower():
                cells.append(
                    '<td class="hari-col aktif">'
                    '<label class="cb" title="{n} – {d} {t} Agustus 2026, {j}">'
                    '<input type="checkbox" id="cb-{i}" data-id="{i}">'
                    '<span aria-hidden="true"></span>'
                    '<span class="sr">Hadir {d} {t} Agustus</span>'
                    '</label></td>'.format(i=sid, d=d, t=tgl, j=escape(jam),
                                           n=escape(nama)))
            else:
                cells.append('<td class="hari-col mati"></td>')
        rows_html.append(
            '<tr data-id="{i}" data-hari="{h}" '
            'data-cari="{cari}">'
            '<td class="c">{no}</td><td>{mk}</td><td class="c">{sks}</td>'
            '<td class="c">{kelas}</td><td>{h}</td><td class="nowrap">{jam}</td>'
            '<td>{ruangan}</td>{cells}</tr>'.format(
                i=sid, h=escape(hari),
                cari=escape(' '.join([nama, kode, mk, kelas, hari, jam, ruangan]).lower()),
                no=escape(no), mk=escape(mk), sks=escape(sks), kelas=escape(kelas),
                jam=escape(jam), ruangan=escape(ruangan), cells=''.join(cells)))

    head_cells = ''.join(
        '<th class="hari-col"><span>%s</span><small>%s Agu</small></th>' % (d, t)
        for d, t in DAYS)

    blocks.append(
        '<section class="dosen" data-kode="{kode}">\n'
        '  <div class="dosen-head">\n'
        '    <h3>{no}. {nama}</h3>\n'
        '    <div class="dosen-meta"><span class="badge" data-count="{kode}">0 / {tot}</span>'
        '<span class="kode">Kode Dosen: {kode}</span></div>\n'
        '  </div>\n'
        '  <div class="scroll">\n'
        '  <table>\n'
        '    <thead><tr><th class="c">NO</th><th>MATA KULIAH</th><th class="c">SKS</th>'
        '<th class="c">KELAS</th><th>HARI</th><th>JAM</th><th>RUANGAN</th>{head}</tr></thead>\n'
        '    <tbody>\n{rows}\n    </tbody>\n'
        '  </table>\n  </div>\n'
        '</section>'.format(kode=kode, no=L['no'], nama=escape(nama),
                            tot=len(L['rows']), head=head_cells,
                            rows='\n'.join('      ' + x for x in rows_html)))

rekap_html = []
for r in rekap_rows:
    c = [clean(x) for x in r]
    is_total = c[0].upper() == 'TOTAL'
    kode = c[2]
    live = ('<td class="c live-total">0</td>' if is_total
            else '<td class="c" data-count="%s">0</td>' % kode)
    rekap_html.append(
        '<tr{cls}><td class="c">{a}</td><td>{b}</td><td class="c">{c}</td>'
        '<td class="c">{d}</td><td class="c">{e}</td>{live}</tr>'.format(
            cls=' class="total"' if is_total else '',
            a=escape(c[0]), b=escape(c[1]), c=escape(c[2]),
            d=escape(c[3]), e=escape(c[4]), live=live))

CSS = """
:root{
  --navy:#143679; --navy-2:#1d4ea8; --ink:#212529; --muted:#5b6470;
  --line:#b7c5de; --line-soft:#dbe3f0; --head:#e3eaf6; --alt:#f7f9fd;
  --off:#edeff1; --bg:#ffffff; --ok:#1a7f4b; --ok-bg:#e8f6ee;
}
*{box-sizing:border-box}
body{margin:0;background:#eef1f6;color:var(--ink);
  font:15px/1.5 "Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif}
.sheet{max-width:1400px;margin:0 auto;background:var(--bg);padding:28px 26px 40px;
  box-shadow:0 1px 3px rgba(16,24,40,.12)}
h1,h2,h3{margin:0}
.doc-head{text-align:center}
.doc-head .univ{color:var(--navy);font-weight:700;font-size:15px;letter-spacing:.2px}
.doc-head h1{color:var(--navy);font-size:28px;margin:6px 0 4px;letter-spacing:.3px}
.doc-head .periode{color:var(--navy);font-weight:600;font-size:15px}
.doc-head .semester{color:var(--navy);font-weight:600;font-size:13px;margin-top:2px}
.doc-head .meta{color:var(--muted);font-size:13px;margin-top:8px;line-height:1.45}
.rule{height:3px;background:var(--navy);margin:16px 0 18px}
.ket{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px 28px;
  font-size:13px;color:#33383f}
.ket h4{margin:0 0 4px;color:var(--navy);font-size:13px}
.ket ul{margin:0;padding-left:18px}
.ket li{margin:2px 0}
.toolbar{position:sticky;top:0;z-index:20;background:#fff;border:1px solid var(--line-soft);
  border-radius:10px;padding:12px 14px;margin:20px 0 8px;display:flex;flex-wrap:wrap;
  gap:10px 14px;align-items:center;box-shadow:0 2px 10px rgba(16,24,40,.06)}
.toolbar .grow{flex:1 1 220px;min-width:180px}
.field{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted)}
input[type=text],input[type=date],select{font:inherit;font-size:13px;padding:7px 9px;
  border:1px solid var(--line);border-radius:7px;background:#fff;color:var(--ink);width:100%}
input[type=text]:focus,input[type=date]:focus,select:focus{outline:2px solid #a9c4ee;
  outline-offset:1px;border-color:var(--navy-2)}
button{font:inherit;font-size:13px;font-weight:600;padding:8px 13px;border-radius:7px;
  border:1px solid var(--navy);background:var(--navy);color:#fff;cursor:pointer}
button:hover{background:var(--navy-2);border-color:var(--navy-2)}
button.ghost{background:#fff;color:var(--navy);border-color:var(--line)}
button.ghost:hover{background:var(--head)}
button.danger{background:#fff;color:#a11c1c;border-color:#e3bcbc}
button.danger:hover{background:#fdeeee}
.progress{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;
  color:var(--navy);white-space:nowrap}
.bar{width:150px;height:8px;border-radius:99px;background:var(--head);overflow:hidden}
.bar i{display:block;height:100%;width:0;background:var(--ok);transition:width .2s}
.status{font-size:12px;color:var(--muted);min-height:16px;margin:0 0 14px}
section.dosen{margin-top:22px;page-break-inside:avoid}
.dosen-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
  flex-wrap:wrap;margin-bottom:6px}
.dosen-head h3{color:var(--navy);font-size:15px;font-weight:600}
.dosen-meta{display:flex;align-items:center;gap:10px}
.badge{font-size:12px;font-weight:600;color:var(--ok);background:var(--ok-bg);
  border:1px solid #bfe3ce;border-radius:99px;padding:2px 9px}
.badge.zero{color:var(--muted);background:#f1f3f5;border-color:#dfe3e8}
.kode{font-size:13px;font-weight:600;color:var(--navy)}
.scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px;background:#fff}
th,td{border:1px solid var(--line);padding:6px 8px;vertical-align:middle}
thead th{background:var(--head);color:var(--navy);font-size:11.5px;text-align:left;
  border-bottom:2px solid var(--navy);white-space:nowrap}
thead th.c,thead th.hari-col{text-align:center}
tbody tr:nth-child(even) td{background:var(--alt)}
td.c,th.c{text-align:center}
td.nowrap{white-space:nowrap}
th.hari-col{width:64px}
th.hari-col span{display:block;font-size:11.5px}
th.hari-col small{display:block;font-weight:600;font-size:10.5px;opacity:.85}
td.hari-col{text-align:center;padding:4px}
td.mati{background:var(--off)!important}
tbody tr.hadir td{background:var(--ok-bg)!important}
.cb{display:inline-flex;cursor:pointer;line-height:0}
.cb input{position:absolute;opacity:0;width:0;height:0}
.cb span[aria-hidden]{width:19px;height:19px;border:1.5px solid #6b7a90;border-radius:4px;
  background:#fff;display:inline-block;position:relative;transition:.12s}
.cb:hover span[aria-hidden]{border-color:var(--navy-2);box-shadow:0 0 0 3px #e6eefb}
.cb input:focus-visible+span[aria-hidden]{outline:2px solid var(--navy-2);outline-offset:2px}
.cb input:checked+span[aria-hidden]{background:var(--ok);border-color:var(--ok)}
.cb input:checked+span[aria-hidden]::after{content:"";position:absolute;left:6px;top:2px;
  width:5px;height:10px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
h2.sec{color:var(--navy);font-size:17px;margin:34px 0 10px}
table.rekap td:first-child,table.rekap th:first-child{width:48px}
table.rekap tr.total td{background:var(--head)!important;font-weight:700;color:var(--navy)}
.catatan{font-size:13px;color:#33383f;margin-top:26px}
.catatan ol{padding-left:20px;margin:6px 0}
.catatan li{margin:3px 0}
footer{margin-top:26px;padding-top:14px;border-top:1px solid var(--line-soft);
  font-size:12px;color:var(--muted);text-align:center;line-height:1.6}
.hidden{display:none!important}
@media (max-width:720px){
  .sheet{padding:18px 12px 30px}
  .doc-head h1{font-size:21px}
  .toolbar{position:static}
}
@media print{
  @page{size:A4 landscape;margin:10mm}
  body{background:#fff;font-size:11px}
  .sheet{max-width:none;box-shadow:none;padding:0}
  .toolbar,.status,.noprint{display:none!important}
  table{font-size:10px}
  th,td{padding:3px 5px}
  section.dosen{margin-top:14px}
  .cb span[aria-hidden]{width:13px;height:13px}
  .cb input:checked+span[aria-hidden]::after{left:4px;top:1px;width:3.5px;height:7px;
    border-width:0 2px 2px 0}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
"""

JS = r"""
const KEY = 'rekapKehadiranDosen_2026-08-24_29';
const state = {checks:{}, meta:{admin:'', tanggal:''}};

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw){
      const p = JSON.parse(raw);
      if(p && p.checks) state.checks = p.checks;
      if(p && p.meta) state.meta = Object.assign(state.meta, p.meta);
    }
  }catch(e){ console.warn('Gagal membaca data tersimpan', e); }
}

function save(){
  try{
    localStorage.setItem(KEY, JSON.stringify(state));
    setStatus('Tersimpan otomatis di browser ini — ' + new Date().toLocaleString('id-ID'));
  }catch(e){
    setStatus('Gagal menyimpan ke penyimpanan browser: ' + e.message);
  }
}

function setStatus(t){ $('#status').textContent = t; }

function apply(){
  $('#admin').value = state.meta.admin || '';
  $('#tanggal').value = state.meta.tanggal || '';
  SESI.forEach(s=>{
    const cb = document.getElementById('cb-'+s.id);
    if(!cb) return;
    cb.checked = !!(state.checks[s.id] && state.checks[s.id].hadir);
    cb.closest('tr').classList.toggle('hadir', cb.checked);
  });
  refresh();
}

function refresh(){
  let total = 0;
  const per = {};
  SESI.forEach(s=>{
    const on = !!(state.checks[s.id] && state.checks[s.id].hadir);
    if(on){ total++; per[s.kode] = (per[s.kode]||0)+1; }
  });
  $$('[data-count]').forEach(el=>{
    const kode = el.getAttribute('data-count');
    const n = per[kode] || 0;
    if(el.classList.contains('badge')){
      const tot = el.textContent.split('/')[1].trim();
      el.textContent = n + ' / ' + tot;
      el.classList.toggle('zero', n === 0);
    } else {
      el.textContent = n;
    }
  });
  const lt = $('.live-total'); if(lt) lt.textContent = total;
  $('#count').textContent = total + ' / ' + SESI.length + ' sesi';
  $('#bar').style.width = (total / SESI.length * 100).toFixed(1) + '%';
}

function onToggle(e){
  const cb = e.target;
  if(!cb.matches('input[type=checkbox][data-id]')) return;
  const id = cb.dataset.id;
  if(cb.checked){
    state.checks[id] = {hadir:true, waktu:new Date().toISOString()};
  } else {
    delete state.checks[id];
  }
  cb.closest('tr').classList.toggle('hadir', cb.checked);
  refresh(); save();
}

/* ---------- filter ---------- */
function filter(){
  const q = $('#cari').value.trim().toLowerCase();
  const hari = $('#filterHari').value;
  const only = $('#filterStatus').value;
  $$('section.dosen').forEach(sec=>{
    let shown = 0;
    $$('tbody tr', sec).forEach(tr=>{
      const hadir = tr.classList.contains('hadir');
      const ok = (!q || tr.dataset.cari.includes(q) ||
                  sec.querySelector('h3').textContent.toLowerCase().includes(q))
              && (!hari || tr.dataset.hari === hari)
              && (!only || (only === 'hadir') === hadir);
      tr.classList.toggle('hidden', !ok);
      if(ok) shown++;
    });
    sec.classList.toggle('hidden', shown === 0);
  });
}

/* ---------- ekspor ---------- */
function unduh(nama, isi, mime){
  const blob = new Blob([isi], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nama;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
}

function stamp(){
  const d = new Date(), p = n => String(n).padStart(2,'0');
  return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes());
}

function csvCell(v){
  v = (v === null || v === undefined) ? '' : String(v);
  return /[";\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v;
}

function unduhCSV(){
  const meta = ['Rekap Kehadiran Dosen 24 s.d. 29 Agustus 2026'],
        head = ['NO','NAMA DOSEN','KODE DOSEN','NO SESI','MATA KULIAH','SKS','KELAS',
                'HARI','TANGGAL','JAM','RUANGAN','HADIR','WAKTU CEKLIS'];
  const baris = SESI.map((s,i)=>{
    const c = state.checks[s.id];
    return [i+1, s.dosen, s.kode, s.no, s.mk, s.sks, s.kelas, s.hari, s.tanggal,
            s.jam, s.ruangan, c && c.hadir ? 'Ya' : 'Tidak',
            c && c.waktu ? new Date(c.waktu).toLocaleString('id-ID') : ''];
  });
  const hadir = baris.filter(b => b[11] === 'Ya').length;
  const rows = [
    meta,
    ['Diinput oleh', state.meta.admin || '-'],
    ['Tanggal input', state.meta.tanggal || '-'],
    ['Total sesi', SESI.length, 'Hadir', hadir, 'Belum diceklis', SESI.length - hadir],
    [], head
  ].concat(baris);
  const csv = rows.map(r => r.map(csvCell).join(';')).join('\r\n');
  unduh('rekap-kehadiran-dosen-'+stamp()+'.csv', '﻿'+csv, 'text/csv;charset=utf-8');
}

function unduhJSON(){
  unduh('rekap-kehadiran-dosen-'+stamp()+'.json',
        JSON.stringify({versi:1, periode:'2026-08-24/2026-08-29',
                        meta:state.meta, checks:state.checks}, null, 2),
        'application/json');
}

function muatJSON(file){
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const p = JSON.parse(fr.result);
      if(!p || typeof p.checks !== 'object') throw new Error('Struktur berkas tidak dikenali');
      const gabung = Object.keys(state.checks).length > 0 && confirm(
        'Halaman ini sudah berisi ceklis.\n\n' +
        'OK\t= gabungkan dengan isi berkas\n' +
        'Batal\t= ganti seluruhnya dengan isi berkas');
      state.checks = gabung ? Object.assign({}, state.checks, p.checks) : p.checks;
      if(p.meta) state.meta = Object.assign(state.meta, p.meta);
      apply(); save();
      setStatus((gabung ? 'Data digabungkan' : 'Data dimuat') + ' dari berkas: ' +
                Object.keys(state.checks).length + ' sesi terceklis.');
    }catch(e){ setStatus('Gagal memuat berkas: ' + e.message); }
  };
  fr.readAsText(file);
}

function reset(){
  if(!confirm('Hapus semua ceklis pada halaman ini? Tindakan ini tidak dapat dibatalkan.')) return;
  state.checks = {};
  apply(); save();
  setStatus('Semua ceklis telah dikosongkan.');
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  load(); apply();
  document.addEventListener('change', onToggle);
  $('#admin').addEventListener('input', e=>{ state.meta.admin = e.target.value; save(); });
  $('#tanggal').addEventListener('change', e=>{ state.meta.tanggal = e.target.value; save(); });
  ['cari','filterHari','filterStatus'].forEach(id=>{
    $('#'+id).addEventListener('input', filter);
    $('#'+id).addEventListener('change', filter);
  });
  $('#btnCSV').addEventListener('click', unduhCSV);
  $('#btnJSON').addEventListener('click', unduhJSON);
  $('#btnPDF').addEventListener('click', ()=>window.print());
  $('#btnReset').addEventListener('click', reset);
  $('#btnMuat').addEventListener('click', ()=>$('#fileJSON').click());
  $('#fileJSON').addEventListener('change', e=>{
    if(e.target.files[0]) muatJSON(e.target.files[0]);
    e.target.value = '';
  });
  setStatus('Ceklis tersimpan otomatis di browser ini. Unduh CSV/JSON untuk arsip atau pindah perangkat.');
});
"""

HTML = """<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rekap Kehadiran Dosen 24–29 Agustus 2026</title>
<meta name="description" content="Formulir ceklis rekap kehadiran dosen PGSD UPI Kampus Serang, 24–29 Agustus 2026.">
<style>__CSS__</style>
</head>
<body>
<div class="sheet">

  <header class="doc-head">
    <div class="univ">UNIVERSITAS PENDIDIKAN INDONESIA – KAMPUS DAERAH SERANG</div>
    <h1>REKAP KEHADIRAN DOSEN</h1>
    <div class="periode">PERIODE 24 AGUSTUS – 29 AGUSTUS 2026</div>
    <div class="semester">SEMESTER GANJIL TAHUN AKADEMIK 2026/2027</div>
    <div class="meta">
      Program Studi Pendidikan Guru Sekolah Dasar (K0651) – 16 Dosen – 100 Sesi Perkuliahan<br>
      Sumber: Jadwal per Dosen Kurikulum 2018 &amp; Kurikulum 2024
    </div>
  </header>

  <div class="rule"></div>

  <div class="ket">
    <div>
      <h4>Keterangan kode gedung</h4>
      <ul>
        <li>24.4S... = Gedung Selat Sunda, Kampus Daerah UPI di Serang</li>
        <li>24.4R... = Gedung Perkuliahan UPI Serang</li>
        <li>24.4C... = Laboratorium Komputer 1 dan Laboratorium IPA Serang</li>
        <li>Angkatan 2023 = Kurikulum 2018 | Angkatan 2024, 2025, 2026 = Kurikulum 2024</li>
      </ul>
    </div>
    <div>
      <h4>Cara pengisian</h4>
      <ul>
        <li>Centang kotak pada kolom hari/tanggal saat dosen hadir mengajar sesi tersebut.</li>
        <li>Kotak hanya tersedia pada hari yang sesuai jadwal sesi; sel abu-abu berarti tidak ada jadwal.</li>
        <li>Ceklis tersimpan otomatis di browser (localStorage) — halaman boleh ditutup dan dibuka lagi.</li>
        <li>Gunakan <strong>Unduh CSV</strong> untuk rekap Excel, atau <strong>Unduh JSON</strong> untuk cadangan/pindah perangkat.</li>
      </ul>
    </div>
  </div>

  <div class="toolbar noprint">
    <div class="field grow">
      <label for="admin">Diinput oleh</label>
      <input type="text" id="admin" placeholder="Nama admin penginput">
    </div>
    <div class="field">
      <label for="tanggal">Tanggal input</label>
      <input type="date" id="tanggal">
    </div>
    <div class="field grow">
      <label for="cari">Cari dosen / mata kuliah / kelas</label>
      <input type="text" id="cari" placeholder="mis. Herli, DK300, 2026-A">
    </div>
    <div class="field">
      <label for="filterHari">Hari</label>
      <select id="filterHari">
        <option value="">Semua hari</option>
        __OPT_HARI__
      </select>
    </div>
    <div class="field">
      <label for="filterStatus">Status</label>
      <select id="filterStatus">
        <option value="">Semua status</option>
        <option value="hadir">Sudah diceklis</option>
        <option value="belum">Belum diceklis</option>
      </select>
    </div>
    <div class="progress">
      <span id="count">0 / 0 sesi</span>
      <span class="bar"><i id="bar"></i></span>
    </div>
    <button id="btnCSV" type="button">⬇ Unduh CSV (Excel)</button>
    <button id="btnPDF" type="button" class="ghost">\U0001f5a8 Cetak / Simpan PDF</button>
    <button id="btnJSON" type="button" class="ghost">Unduh JSON</button>
    <button id="btnMuat" type="button" class="ghost">Muat JSON</button>
    <input type="file" id="fileJSON" accept=".json,application/json" class="hidden">
    <button id="btnReset" type="button" class="danger">Reset ceklis</button>
  </div>
  <p class="status noprint" id="status"></p>

__BLOCKS__

  <h2 class="sec">Rekapitulasi Beban Mengajar</h2>
  <div class="scroll">
  <table class="rekap">
    <thead><tr><th class="c">NO</th><th>NAMA DOSEN</th><th class="c">KODE</th>
      <th class="c">JML MK</th><th class="c">JML KELAS / SESI</th>
      <th class="c">SUDAH DICEKLIS</th></tr></thead>
    <tbody>
__REKAP__
    </tbody>
  </table>
  </div>

  <div class="catatan">
    <h2 class="sec">Catatan</h2>
    <ol>
      <li>Seluruh mata kuliah diselenggarakan untuk Program Studi Pendidikan Guru Sekolah Dasar (kode K0651).</li>
      <li>Seluruh sesi tercatat sebagai “Dosen ke-1” pada dokumen sumber, sehingga tidak terdapat pembagian tim teaching.</li>
      <li>Mata kuliah Pembelajaran Micro (PT501) dibagi kepada 4 dosen: kelas 2024-A (Firman Robiansyah), 2024-B (Muhammad Hanif), 2024-C (Susilawati), dan 2024-D (Fatihaturosyidah).</li>
      <li>Mata kuliah Kurikulum dan Pembelajaran (DK303) diampu 3 dosen: angkatan 2025 kelas A–B (Ajo Sutarjo), angkatan 2025 kelas C–D (Tatang Suratno), dan angkatan 2026 kelas A–D (Iik Nurulpaik).</li>
      <li>Prof. Dr. Supriadi, M.Pd. merupakan satu-satunya dosen dengan 1 mata kuliah; seluruh dosen lainnya mengampu 2 mata kuliah.</li>
      <li>Urutan baris pada setiap tabel disusun menurut hari (Senin–Jumat) kemudian jam mulai perkuliahan.</li>
      <li>Kolom kehadiran memuat hari Senin 24 Agustus 2026 sampai dengan Sabtu 29 Agustus 2026.</li>
    </ol>
  </div>

  <footer>
    Disusun berdasarkan dokumen Jadwal per Dosen Semester Ganjil 2026-2027 (Kurikulum 2018) dan
    Jadwal per Dosen Semester Ganjil 2026-2027 (Kurikulum 2024), Kampus Daerah UPI di Serang,
    tertanggal Bandung, 15 Juli 2026.
  </footer>

</div>
<script>
const SESI = __DATA__;
__JS__
</script>
</body>
</html>
"""

opt_hari = '\n        '.join(
    '<option value="%s">%s, %s Agustus</option>' % (d, d, t) for d, t in DAYS)

out = (HTML
       .replace('__CSS__', CSS)
       .replace('__OPT_HARI__', opt_hari)
       .replace('__BLOCKS__', '\n\n'.join('  ' + b.replace('\n', '\n  ') for b in blocks))
       .replace('__REKAP__', '\n'.join('      ' + r for r in rekap_html))
       .replace('__DATA__', json.dumps(sesi, ensure_ascii=False, separators=(',', ':')))
       .replace('__JS__', JS))

open('index.html', 'w', encoding='utf-8').write(out)
print('OK -> index.html  (%d sesi, %d dosen)' % (len(sesi), len(lecturers)))
