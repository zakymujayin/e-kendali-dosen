# FASE 3b — Sesi Perkuliahan: BAP, Documents, Monitoring

## Overview

Sub-FASE 3b completes the Lecture Session feature for DOSEN (BAP, document storage, session detail view) and adds read-only monitoring pages for GKM and DEKANAT roles.

## Scope

| # | Item | Role | Description |
|---|------|------|-------------|
| 1 | BAP PDF Generation | DOSEN | Generate Berita Acara Perkuliahan PDF for PUBLISHED sessions, download as PDF |
| 2 | Document File Upload | DOSEN | Real file upload to disk, serve via public path |
| 3 | Session Detail View | DOSEN | Read-only detail page for PUBLISHED sessions |
| 4 | GKM Monitoring | GKM | Read-only session list filtered by prodi, with dosen filter |
| 5 | Dekanat Monitoring | DEKANAT | Read-only session list across all prodi, with prodi+dosen filter |

## Deferred (FASE 4+)

- Reports (all roles)
- Publish reminder cron
- Tests (deferred to later phase)

## Architecture

### 1. BAP PDF Generation

**Approach:** Use `@jsreport/nodejs-client` or `pdfmake` to generate PDF server-side. 

Actually, simplest approach: Use a server-side HTML-to-PDF approach with `puppeteer` or use `pdfmake` (no browser dependency).

**Decision:** Use `pdfmake` — lightweight, no browser dependency, works in Node.js runtime.

**BAP Template structure:**
```
┌─────────────────────────────────────┐
│         KOP UNIVERSITAS              │
│   BERITA ACARA PERKULIAHAN           │
├─────────────────────────────────────┤
│ Mata Kuliah    : [nama]              │
│ Dosen          : [nama]              │
│ Program Studi  : [prodi]             │
│ Semester       : [nama]              │
│ Pertemuan ke-  : [n]                 │
│ Tanggal        : [date]              │
│ Waktu          : [start] - [end]     │
│ Metode         : [method]            │
│ Topik          : [topic]             │
├─────────────────────────────────────┤
│ Kehadiran Mahasiswa:                 │
│ Hadir    : [n] from [total]          │
│ Tidak    : [n]                       │
├─────────────────────────────────────┤
│ Catatan                             │
│ [notes]                              │
├─────────────────────────────────────┤
│                 Dosen Pengampu       │
│                                     │
│  [ttd]                               │
│  [nama]                              │
│  NIP. [nip]                          │
└─────────────────────────────────────┘
```

**API Endpoint:**
- `GET /api/sessions/[id]/bap` — returns PDF binary
- Only works for PUBLISHED sessions
- Only accessible by the session owner (DOSEN)

**File:**
- `lib/bap.ts` — BAP generation logic using pdfmake
- `app/api/sessions/[id]/bap/route.ts` — PDF download endpoint

### 2. Document File Upload

**Current state:** `POST /api/documents` creates a DB record but doesn't actually save the file.

**Change:** Use Next.js local disk storage at `public/uploads/documents/`.

**Upload flow:**
1. Client sends `multipart/form-data` with file + sessionId
2. Server validates file type (pdf,docx,jpg,jpeg,png) and size (max 10MB)
3. File saved to `public/uploads/documents/[sessionId]/[timestamp]-[filename]`
4. DB record created with actual path as `fileUrl`
5. File served via Next.js public folder at `/uploads/documents/...`

**Update:**
- `POST /api/documents/route.ts` — accept multipart form data, save file to disk
- File URL format: `/uploads/documents/[sessionId]/[timestamp]-[filename]`
- `GET /api/documents/[id]` — serve the actual file content

### 3. Session Detail View

**Page:** `app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/[sessionId]/page.tsx`

**Content:**
- Full session info (date, time, topic, method, type, status)
- GPS coordinates map (for luring sessions) — Leaflet static marker
- Platform URL link (for daring sessions)
- Attendance summary (present/absent/total)
- BAP download button (if PUBLISHED)
- Document list with download links

**Navigation:** From session table "View" action button (replacing disabled download button)

### 4. GKM Monitoring Page

**Page:** `app/(dashboard)/dashboard/gkm/monitoring/page.tsx`

**Data source:** `GET /api/sessions` already supports filtering by `prodiId`.

**Content:**
- Filter: dosen select (from GKM's prodi)
- Filter: date range
- Session table showing: dosen name, MK name, meeting, date, time, method, status
- Summary cards: total sessions, published, draft per dosen

**API support:** No new API needed — `/api/sessions` already supports prodiId filtering.

### 5. Dekanat Monitoring Page

**Page:** `app/(dashboard)/dashboard/dekanat/monitoring/page.tsx`

**Data source:** `GET /api/sessions` with optional `prodiId` filter.

**Content:**
- Filter: prodi select
- Filter: dosen select (filtered by selected prodi)
- Filter: date range
- Session table with prodi, dosen, MK, meeting, date, time, method, status
- Summary: total sessions per prodi

**API support:** No new API needed.

## Database

No schema changes required. Existing models sufficient:
- `LectureSession.bapGeneratedAt` — update on BAP generation
- `Document.fileUrl` — will hold actual path

## Dependencies

```json
{
  "pdfmake": "^0.2.17",
  "@types/pdfmake": "^0.2.17"
}
```

## File Changes Summary

### New files:
| # | File | Purpose |
|---|------|---------|
| 1 | `lib/bap.ts` | BAP PDF generation using pdfmake |
| 2 | `app/api/sessions/[id]/bap/route.ts` | BAP download endpoint |
| 3 | `app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/[sessionId]/page.tsx` | Session detail view |
| 4 | `app/(dashboard)/dashboard/gkm/monitoring/page.tsx` | GKM monitoring page |
| 5 | `app/(dashboard)/dashboard/dekanat/monitoring/page.tsx` | Dekanat monitoring page |

### Modified files:
| # | File | Change |
|---|------|--------|
| 1 | `app/api/documents/route.ts` | Accept multipart, save file to disk |
| 2 | `app/api/documents/[id]/route.ts` | Serve actual file content |
| 3 | `components/dosen/session-table.tsx` | Change disabled download button → "View" link |
| 4 | `package.json` | Add pdfmake dependency |

## Implementation Order

1. Install pdfmake dependency
2. Create `lib/bap.ts` — BAP generation
3. Create BAP API endpoint
4. Update Document API (file upload + serve)
5. Create Session Detail View
6. Update Session Table (view button)
7. Create GKM Monitoring page
8. Create Dekanat Monitoring page
9. Build & verify
10. Push to GitHub

## Error Handling

- BAP generation failure → 500 with error message
- File upload too large → 413
- File type invalid → 400
- Session not PUBLISHED for BAP → 400
- Not session owner for BAP → 403
