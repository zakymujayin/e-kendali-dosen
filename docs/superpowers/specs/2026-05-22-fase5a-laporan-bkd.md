# FASE 5a — Laporan BKD (Beban Kinerja Dosen)

## Overview

Laporan BKD menyajikan data kinerja dosen per semester: beban mengajar (SKS), progress pertemuan, breakdown daring/luring, dan rata-rata kehadiran mahasiswa. Output: halaman web + export Excel + export PDF.

## Scope

| # | Item | Description |
|---|------|-------------|
| 1 | BKD Report API | `GET /api/reports/bkd` — data BKD per dosen dengan filter semester, prodi, dosen |
| 2 | Export Excel | `GET /api/reports/bkd/export-excel` — download .xlsx |
| 3 | Export PDF | `GET /api/reports/bkd/export-pdf` — download .pdf (reuse pdfmake) |
| 4 | Reports pages | `/dashboard/{admin,dosen,gkm,dekanat}/reports` — UI per role |

## Data per Dosen

```
- Nama, NIDN, Prodi
- Total SKS diampu
- Total MK diampu
- Total pertemuan (published)
- Target pertemuan (totalMeeting across all MKs)
- Progress %
- Jumlah sesi daring
- Jumlah sesi luring
- Rata-rata kehadiran mahasiswa (%)
- Per-MK breakdown:
  - Kode MK, Nama MK, SKS
  - Published/Target
  - Daring/Luring count
  - Rata-rata hadir
```

## API

### `GET /api/reports/bkd`

Query params: `semesterId`, `prodiId` (admin/dekanat), `userId` (admin/gkm/dekanat).

Response:
```json
{
  "success": true,
  "data": {
    "semester": { "id": "...", "name": "...", "year": "..." },
    "reportDate": "2026-05-22",
    "dosen": [
      {
        "id": "...",
        "name": "...",
        "nidn": "...",
        "prodi": "Teknik Informatika",
        "totalSks": 12,
        "totalMK": 3,
        "totalPublished": 30,
        "totalTarget": 48,
        "progressPercent": 62.5,
        "daringCount": 4,
        "luringCount": 26,
        "avgAttendance": 85.3,
        "courses": [
          {
            "code": "IF123",
            "name": "Pemrograman Web",
            "sks": 3,
            "published": 10,
            "target": 16,
            "daring": 2,
            "luring": 8,
            "avgAttendance": 88.0
          }
        ]
      }
    ]
  }
}
```

### `GET /api/reports/bkd/export-excel`

Same filters. Returns Excel binary. Uses existing `generateExcel()` from `lib/excel.ts`.

### `GET /api/reports/bkd/export-pdf`

Same filters. Returns PDF binary. Uses pdfmake (same approach as `lib/bap.ts`).

## Pages

Halaman reports mirip dashboard — card summary + tabel + tombol export.

### Dosen (`/dashboard/dosen/reports`)
- Filter: semester (dropdown)
- Data diri + per-MK breakdown
- Tombol: Export Excel, Export PDF

### Admin (`/dashboard/admin/reports`)
- Filter: semester, prodi, dosen
- Tabel semua dosen + detail per dosen
- Tombol: Export Excel, Export PDF

### GKM (`/dashboard/gkm/reports`)
- Filter: semester, dosen (dari prodi ybs)
- Data per-prodi
- Tombol: Export Excel, Export PDF

### Dekanat (`/dashboard/dekanat/reports`)
- Filter: semester, prodi, dosen
- Data cross-prodi
- Tombol: Export Excel, Export PDF

## File Changes

### New files:
| # | File | Purpose |
|---|------|---------|
| 1 | `app/api/reports/bkd/route.ts` | BKD report data API |
| 2 | `app/api/reports/bkd/export-excel/route.ts` | Excel export |
| 3 | `app/api/reports/bkd/export-pdf/route.ts` | PDF export |
| 4 | `app/(dashboard)/dashboard/dosen/reports/page.tsx` | Dosen reports page |
| 5 | `app/(dashboard)/dashboard/admin/reports/page.tsx` | Admin reports page |
| 6 | `app/(dashboard)/dashboard/gkm/reports/page.tsx` | GKM reports page |
| 7 | `app/(dashboard)/dashboard/dekanat/reports/page.tsx` | Dekanat reports page |
| 8 | `lib/bkd-report.ts` | Shared BKD report query + Excel/PDF generation |

### Modified files:
- None

## Implementation Order

1. Create `lib/bkd-report.ts` — shared query + Excel + PDF generators
2. Create BKD report data API
3. Create Excel export API
4. Create PDF export API
5. Create Dosen reports page
6. Create Admin reports page
7. Create GKM reports page
8. Create Dekanat reports page
9. Build & push

## Dependencies

Semua sudah ada: exceljs, pdfmake, date-fns, lucide-react, shadcn/ui.
