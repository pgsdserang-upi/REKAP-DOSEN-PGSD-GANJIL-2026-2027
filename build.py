# -*- coding: utf-8 -*-
"""Membuat versi cetak (PDF) jadwal mengajar 16 kali pertemuan.

    python build.py

Menghasilkan 'Jadwal dan Ceklis 16 Pertemuan Ganjil 2026-2027.pdf':
jadwal per dosen lengkap dengan 16 kotak ceklis pertemuan, ditambah tabel
acuan tanggal pertemuan ke-1 s.d. ke-16 untuk setiap hari.

Membutuhkan paket reportlab.
"""
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, KeepTogether, Flowable)

import jadwal_data as JD

F = 'C:/Windows/Fonts/'
pdfmetrics.registerFont(TTFont('Segoe', F + 'segoeui.ttf'))
pdfmetrics.registerFont(TTFont('Segoe-Bold', F + 'segoeuib.ttf'))
pdfmetrics.registerFont(TTFont('Segoe-Semi', F + 'seguisb.ttf'))
pdfmetrics.registerFontFamily('Segoe', normal='Segoe', bold='Segoe-Bold')

NAVY = colors.Color(0.0784, 0.2118, 0.4784)
HEADBG = colors.Color(0.8902, 0.9176, 0.9647)
ALTBG = colors.Color(0.9686, 0.9765, 0.9922)
LINE = colors.Color(0.7176, 0.7725, 0.8706)
INK = colors.Color(0.13, 0.15, 0.18)

PW, PH = landscape(A4)
LM = RM = 11 * mm
TM = BM = 11 * mm
CW = PW - LM - RM

D = JD.muat()
META, PERTEMUAN, DOSEN, SESI = D['meta'], D['pertemuan'], D['dosen'], D['sesi']
JML = META['jumlahPertemuan']


def ps(name, **kw):
    kw.setdefault('fontName', 'Segoe')
    kw.setdefault('textColor', INK)
    kw.setdefault('leading', kw.get('fontSize', 8) * 1.25)
    return ParagraphStyle(name, **kw)


S_UNIV = ps('univ', fontSize=11, alignment=TA_CENTER, textColor=NAVY, fontName='Segoe-Bold')
S_TITLE = ps('title', fontSize=16, alignment=TA_CENTER, textColor=NAVY, fontName='Segoe-Bold', leading=20)
S_SUB = ps('sub', fontSize=10, alignment=TA_CENTER, textColor=NAVY, fontName='Segoe-Semi')
S_META = ps('meta', fontSize=8.5, alignment=TA_CENTER)
S_KET = ps('ket', fontSize=8, leading=11.5)
S_KETH = ps('keth', fontSize=8.5, fontName='Segoe-Bold', textColor=NAVY)
S_DOSEN = ps('dosen', fontSize=9.5, fontName='Segoe-Semi', textColor=NAVY)
S_KODE = ps('kode', fontSize=8.5, fontName='Segoe-Semi', textColor=NAVY, alignment=2)
S_TH = ps('th', fontSize=7.2, fontName='Segoe-Bold', textColor=NAVY, leading=9)
S_THC = ps('thc', fontSize=7.2, fontName='Segoe-Bold', textColor=NAVY, alignment=TA_CENTER, leading=9)
S_THP = ps('thp', fontSize=6.6, fontName='Segoe-Bold', textColor=NAVY, alignment=TA_CENTER, leading=8)
S_TD = ps('td', fontSize=7.2, leading=9)
S_TDC = ps('tdc', fontSize=7.2, leading=9, alignment=TA_CENTER)
S_TGL = ps('tgl', fontSize=6.6, leading=8.4, alignment=TA_CENTER)
S_SEC = ps('sec', fontSize=11, fontName='Segoe-Bold', textColor=NAVY)
S_NOTE = ps('note', fontSize=8, leading=11.5)
S_FOOT = ps('foot', fontSize=7.5, leading=10.5, alignment=TA_CENTER,
            textColor=colors.Color(0.35, 0.38, 0.42))


class Box(Flowable):
    """Kotak ceklis kosong."""

    def __init__(self, size=6.4):
        Flowable.__init__(self)
        self.width = self.height = size

    def draw(self):
        c = self.canv
        c.setStrokeColor(colors.Color(0.42, 0.48, 0.58))
        c.setLineWidth(0.6)
        c.rect(0, 0, self.width, self.height, stroke=1, fill=0)


def box_cell():
    t = Table([[Box()]], colWidths=[9], rowHeights=[9])
    t.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                           ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                           ('LEFTPADDING', (0, 0), (-1, -1), 0),
                           ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                           ('TOPPADDING', (0, 0), (-1, -1), 0),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    return t


def tgl_panjang(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    return '%d %s %d' % (d, JD.BULAN[m], y)


def tgl_pendek(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    return '%d %s' % (d, JD.BULAN_SGKT[m])


# ---------------------------------------------------------------- tata letak

PW_COL = 20.5                                    # lebar tiap kolom pertemuan
base = [17, 118, 20, 34, 36, 54]                 # NO, MK, SKS, KELAS, HARI, JAM
ruang = CW - sum(base) - PW_COL * JML            # sisanya untuk RUANGAN
COLW = base + [ruang] + [PW_COL] * JML

story = []

story.append(Paragraph('UNIVERSITAS PENDIDIKAN INDONESIA \u2013 KAMPUS DAERAH SERANG', S_UNIV))
story.append(Spacer(1, 5))
story.append(Paragraph('JADWAL DAN CEKLIS %d KALI PERTEMUAN' % JML, S_TITLE))
story.append(Spacer(1, 2))
story.append(Paragraph('PERIODE %s \u2013 %s' % (tgl_panjang(META['mulai']).upper(),
                                                tgl_panjang(META['selesai']).upper()), S_SUB))
story.append(Spacer(1, 2))
story.append(Paragraph('SEMESTER GANJIL TAHUN AKADEMIK 2026/2027', S_SUB))
story.append(Spacer(1, 6))
story.append(Paragraph('Program Studi Pendidikan Guru Sekolah Dasar (K0651) \u2013 '
                       '%d Dosen \u2013 %d Kelas \u2013 %d Pertemuan'
                       % (META['jumlahDosen'], META['jumlahSesi'],
                          META['jumlahSesi'] * JML), S_META))
story.append(Spacer(1, 8))

rule = Table([['']], colWidths=[CW], rowHeights=[2.2])
rule.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), NAVY)]))
story.append(rule)
story.append(Spacer(1, 10))

# --- tabel acuan tanggal pertemuan ------------------------------------------

story.append(Paragraph('Tanggal pertemuan ke-1 sampai ke-%d' % JML, S_KETH))
story.append(Spacer(1, 4))

acuan_head = [Paragraph('HARI', S_THC)] + \
             [Paragraph('%d' % p, S_THP) for p in range(1, JML + 1)]
acuan = [acuan_head]
for h in JD.HARI:
    acuan.append([Paragraph(h, S_TDC)] +
                 [Paragraph(tgl_pendek(t), S_TGL) for t in PERTEMUAN[h]])

aw = [46] + [(CW - 46) / JML] * JML
atbl = Table(acuan, colWidths=aw)
astyle = [('BACKGROUND', (0, 0), (-1, 0), HEADBG),
          ('GRID', (0, 0), (-1, -1), 0.5, LINE),
          ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
          ('LEFTPADDING', (0, 0), (-1, -1), 1.5),
          ('RIGHTPADDING', (0, 0), (-1, -1), 1.5),
          ('TOPPADDING', (0, 0), (-1, -1), 3),
          ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
          ('LINEBELOW', (0, 0), (-1, 0), 0.9, NAVY)]
for i in range(1, len(acuan)):
    if i % 2 == 0:
        astyle.append(('BACKGROUND', (0, i), (-1, i), ALTBG))
atbl.setStyle(TableStyle(astyle))
story.append(atbl)
story.append(Spacer(1, 10))

story.append(Paragraph('Cara pengisian', S_KETH))
for t in ['Perkuliahan berulang setiap minggu pada hari dan jam yang sama, Senin sampai dengan Jumat. '
          'Tidak ada perkuliahan pada hari Sabtu.',
          'Beri tanda centang (\u221a) pada kotak pertemuan ke-1 sampai ke-%d saat perkuliahan terlaksana. '
          'Tanggal tiap pertemuan mengikuti tabel acuan di atas sesuai hari sesi yang bersangkutan.' % JML,
          'Lembar ini merupakan cadangan cetak. Pengisian utama dilakukan secara daring oleh '
          'penanggung jawab mata kuliah melalui halaman ceklis, dan seluruh hasilnya terhimpun '
          'pada satu rekapan.']:
    story.append(Paragraph('&nbsp;&nbsp;&nbsp;&nbsp;\u2022&nbsp;&nbsp;' + t, S_KET))
story.append(Spacer(1, 12))

# --- tabel per dosen ---------------------------------------------------------

head = [Paragraph('NO', S_THC), Paragraph('MATA KULIAH', S_TH), Paragraph('SKS', S_THC),
        Paragraph('KELAS', S_THC), Paragraph('HARI', S_TH), Paragraph('JAM', S_TH),
        Paragraph('RUANGAN', S_TH)] + \
       [Paragraph('%d' % p, S_THP) for p in range(1, JML + 1)]

per_dosen = {}
for s in SESI:
    per_dosen.setdefault(s['dosenNo'], []).append(s)

for L in DOSEN:
    rows = per_dosen.get(L['no'], [])
    if not rows:
        continue

    hdr = Table([[Paragraph('%d. %s' % (L['no'], L['nama']), S_DOSEN),
                  Paragraph('Kode Dosen: %s &nbsp;|&nbsp; %d kelas &times; %d pertemuan = %d'
                            % (L['kode'], len(rows), JML, len(rows) * JML), S_KODE)]],
                colWidths=[CW * 0.55, CW * 0.45])
    hdr.setStyle(TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 0),
                             ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                             ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                             ('TOPPADDING', (0, 0), (-1, -1), 0)]))

    data = [head]
    style = [('BACKGROUND', (0, 0), (-1, 0), HEADBG),
             ('GRID', (0, 0), (-1, -1), 0.5, LINE),
             ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
             ('LEFTPADDING', (0, 0), (-1, -1), 3),
             ('RIGHTPADDING', (0, 0), (-1, -1), 3),
             ('TOPPADDING', (0, 0), (-1, -1), 3),
             ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
             ('LINEBELOW', (0, 0), (-1, 0), 0.9, NAVY),
             ('LEFTPADDING', (7, 0), (-1, -1), 1),
             ('RIGHTPADDING', (7, 0), (-1, -1), 1)]

    for i, s in enumerate(rows, start=1):
        mk = '%s (%s)' % (s['mk'], s['kodeMk'])
        data.append([Paragraph(str(i), S_TDC), Paragraph(mk, S_TD),
                     Paragraph(s['sks'], S_TDC), Paragraph(s['kelas'], S_TDC),
                     Paragraph(s['hari'], S_TD), Paragraph(s['jam'], S_TD),
                     Paragraph(s['ruangan'], S_TD)] +
                    [box_cell() for _ in range(JML)])
        if i % 2 == 0:
            style.insert(1, ('BACKGROUND', (0, i), (6, i), ALTBG))

    tbl = Table(data, colWidths=COLW, repeatRows=1)
    tbl.setStyle(TableStyle(style))
    story.append(KeepTogether([hdr, tbl]))
    story.append(Spacer(1, 12))

# --- rekapitulasi beban mengajar --------------------------------------------

story.append(Spacer(1, 4))
rdata = [[Paragraph('NO', S_THC), Paragraph('NAMA DOSEN', S_TH), Paragraph('KODE', S_THC),
          Paragraph('JML KELAS', S_THC), Paragraph('JML PERTEMUAN', S_THC)]]
total_kelas = 0
for L in DOSEN:
    n = L['jumlahSesi']
    total_kelas += n
    rdata.append([Paragraph(str(L['no']), S_TDC), Paragraph(L['nama'], S_TD),
                  Paragraph(L['kode'], S_TDC), Paragraph(str(n), S_TDC),
                  Paragraph(str(n * JML), S_TDC)])
S_TOTC = ps('totc', fontSize=7.2, leading=9, alignment=TA_CENTER, fontName='Segoe-Bold', textColor=NAVY)
S_TOTL = ps('totl', fontSize=7.2, leading=9, fontName='Segoe-Bold', textColor=NAVY)
rdata.append([Paragraph('TOTAL', S_TOTC), Paragraph('%d dosen' % len(DOSEN), S_TOTL),
              Paragraph('\u2013', S_TOTC), Paragraph(str(total_kelas), S_TOTC),
              Paragraph(str(total_kelas * JML), S_TOTC)])

rw = [40, CW * 0.40, 58, 74, 100]
rw = rw + [CW - sum(rw)]
rtbl = Table([row + [''] for row in rdata], colWidths=rw, repeatRows=1)
rstyle = [('BACKGROUND', (0, 0), (-2, 0), HEADBG),
          ('GRID', (0, 0), (-2, -1), 0.5, LINE),
          ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
          ('LEFTPADDING', (0, 0), (-1, -1), 4),
          ('RIGHTPADDING', (0, 0), (-1, -1), 4),
          ('TOPPADDING', (0, 0), (-1, -1), 3),
          ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
          ('LINEBELOW', (0, 0), (-2, 0), 0.9, NAVY),
          ('BACKGROUND', (0, len(rdata) - 1), (-2, len(rdata) - 1), HEADBG)]
for i in range(1, len(rdata) - 1):
    if i % 2 == 0:
        rstyle.append(('BACKGROUND', (0, i), (-2, i), ALTBG))
rtbl.setStyle(TableStyle(rstyle))
story.append(KeepTogether([Paragraph('Rekapitulasi Beban Mengajar', S_SEC), Spacer(1, 6), rtbl]))
story.append(Spacer(1, 14))

story.append(Paragraph('Catatan', S_SEC))
story.append(Spacer(1, 4))
for t in ['1. Seluruh mata kuliah diselenggarakan untuk Program Studi Pendidikan Guru Sekolah Dasar (kode K0651).',
          '2. Jadwal disusun untuk %d kali pertemuan yang berulang setiap minggu pada hari dan jam yang sama, '
          'terhitung sejak %s sampai dengan %s.'
          % (JML, tgl_panjang(META['mulai']), tgl_panjang(META['selesai'])),
          '3. Tidak terdapat sesi perkuliahan pada hari Sabtu.',
          '4. Mata kuliah Pembelajaran Micro (PT501) dibagi kepada 4 dosen: kelas 2024-A (Firman Robiansyah), 2024-B (Muhammad Hanif), '
          '2024-C (Susilawati), dan 2024-D (Fatihaturosyidah).',
          '5. Mata kuliah Kurikulum dan Pembelajaran (DK303) diampu 3 dosen: angkatan 2025 kelas A\u2013B (Ajo Sutarjo), angkatan 2025 '
          'kelas C\u2013D (Tatang Suratno), dan angkatan 2026 kelas A\u2013D (Iik Nurulpaik).',
          '6. Urutan baris pada setiap tabel disusun menurut hari (Senin\u2013Jumat) kemudian jam mulai perkuliahan.',
          '7. Hari libur nasional dan jadwal UTS/UAS belum diperhitungkan. Bila ada tanggal yang harus dilewati, '
          'isikan pada daftar LIBUR di berkas jadwal_data.py lalu bangun ulang dokumen ini.']:
    story.append(Paragraph(t, S_NOTE))
story.append(Spacer(1, 14))
story.append(Paragraph('Disusun berdasarkan dokumen Jadwal per Dosen Semester Ganjil 2026-2027 (Kurikulum 2018) dan Jadwal per Dosen '
                       'Semester Ganjil 2026-2027 (Kurikulum 2024), Kampus Daerah UPI di Serang, tertanggal Bandung, 15 Juli 2026.', S_FOOT))


def on_page(canv, doc):
    canv.saveState()
    canv.setFont('Segoe', 7.5)
    canv.setFillColor(colors.Color(0.45, 0.48, 0.52))
    canv.drawRightString(PW - RM, 7 * mm, 'Halaman %d' % doc.page)
    canv.drawString(LM, 7 * mm, 'Jadwal dan Ceklis %d Pertemuan \u2013 Ganjil 2026/2027' % JML)
    canv.restoreState()


out = 'Jadwal dan Ceklis 16 Pertemuan Ganjil 2026-2027.pdf'
doc = BaseDocTemplate(out, pagesize=landscape(A4), leftMargin=LM, rightMargin=RM,
                      topMargin=TM, bottomMargin=BM,
                      title='Jadwal dan Ceklis %d Pertemuan \u2013 Ganjil 2026/2027' % JML,
                      author='UPI Kampus Daerah Serang')
frame = Frame(LM, BM, CW, PH - TM - BM, id='n', leftPadding=0, rightPadding=0,
              topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='all', frames=[frame], onPage=on_page)])
doc.build(story)
print('OK ->', out)
