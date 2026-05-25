# QR Smart Matching — Scan & Isi Sesi Perkuliahan

## Overview

Satu QR universal untuk semua kelas. Dosen scan → sistem cocokkan dosen + hari + jam → tampilkan MK yang terjadwal → isi sesi dalam 2 tap. Tidak ada bentrok ruang karena matching berdasarkan dosen yang login, bukan ruangan.

## Problem

Dosen senior (non-IT) kesulitan:
- Navigasi ke halaman yang benar
- Pilih MK dari daftar
- Ingat mengisi sesi setelah mengajar

QR di kelas memberikan reminder fisik + shortcut langsung ke form sesi.

## Principle

**Yang menentukan MK = dosen + hari + jam, bukan ruangan.**

QR universal — satu desain untuk semua kelas. Setiap dosen yang scan akan melihat jadwal MEREKA masing-masing, bukan jadwal yang terikat ruang.

## Architecture

```mermaid
flowchart LR
    A[Scan QR] --> B[/scan page]
    B --> C[Auth check]
    C --> D[Smart Match]
    D --> E{Ada jadwal?}
    E -->|Ya, jam pas| F[Card: MK Terjadwal]
    E -->|Jadwal nanti| G[Card: Mendatang]
    E -->|Tidak ada| H[Daftar semua MK]
    F --> I[Tap Mulai Sesi]
    G --> I
    H --> I
    I --> J[Form sesi pre-filled]
    J --> K[Publish / Draft]
```

## Database

### New model: `ScheduleSlot`

```prisma
model ScheduleSlot {
  id          String   @id @default(cuid())
  semesterId  String
  userId      String
  courseId    String
  prodiId     String
  roomName    String
  className   String
  day         String
  startTime   String
  endTime     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  semester    Semester @relation(fields: [semesterId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
  course      Course   @relation(fields: [courseId], references: [id])
  prodi       Prodi    @relation(fields: [prodiId], references: [id])
}
```

Sumber data: file Excel Jadwal Kelas → kolom RUANG KELAS, HARI, WAKTU, KELAS, PRODI, KODE MK, NAMA DOSEN.

## Scan Page Flow

### `/scan` page (public route, auth-gated)

1. User scan QR (buka `/scan`)
2. Jika belum login → redirect ke `/login?callbackUrl=/scan`
3. Jika sudah login → render scan-client.tsx

### `scan-client.tsx` — Smart Matching Logic

```
Input: userId (from session), current time (client-side)

1. Fetch API: GET /api/schedules/smart-match
2. API logic:
   a. Dapatkan hari & jam sekarang dari server
   b. Query schedule_slots WHERE userId = currentUser AND day = hariSekarang
   c. ORDER BY startTime ASC
   d. Klasifikasi:
      - startTime <= jamSekarang <= endTime → "active"
      - startTime > jamSekarang → "upcoming"
      - Tidak ada → "none"
3. Return: matched slot + all today's schedules + dosen's courses
```

### Response shape:

```json
{
  "active": {
    "id": "...", "courseCode": "C02211202", "courseName": "Kewarganegaraan",
    "sks": 2, "roomName": "1-IAT/2A", "className": "2A",
    "startTime": "07.30", "endTime": "09.10", "prodi": "IAT"
  } | null,
  "todaySchedules": [...],
  "allCourses": [
    { "id": "...", "code": "C02211202", "name": "Kewarganegaraan" }
  ]
}
```

## UI Mockup — Mobile-First

```
┌────────────────────────────────────┐
│  🌤️ Selamat Pagi                   │
│  Ahmad Muchlison, M.A.             │
│  IAT · Semester Genap 2025/2026   │
│                                    │
│  ════════════════════════════════ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  ⏰ 07.30 - 09.10            │ │
│  │                              │ │
│  │  Kewarganegaraan             │ │
│  │  C02211202 · 2 SKS · IAT    │ │
│  │  📍 1-IAT/2A · Kelas 2A     │ │
│  │                              │ │
│  │  [Mulai Sesi Sekarang]       │ │
│  └──────────────────────────────┘ │
│                                    │
│  Jadwal Hari Ini:                  │
│  ┌──────────────────────────────┐ │
│  │  09.10  Kewarganegaraan 2B   │ │
│  │  📍 1-IAT/2B                 │ │
│  └──────────────────────────────┘ │
│                                    │
│  Atau pilih MK lain:              │
│  [Daftar Semua MK ▼]              │
│                                    │
│  [Lihat Semua Sesi] [Dashboard]   │
└────────────────────────────────────┘
```

## Scenarios

| # | Situasi | Behavior |
|---|---------|----------|
| 1 | Dosen A di ruang A, jam pas | ✅ Card "MK Terjadwal" muncul sebagai opsi utama. Tap → form pre-filled |
| 2 | Dosen A daring dari rumah | Scan QR dari HP. Sistem tetap tahu jadwalnya → MK auto-terpilih. Method di form = tatap muka (dosen ganti ke daring) |
| 3 | Dosen B pinjam ruang A | Dosen B scan → sistem cari jadwal Dosen B (bukan Dosen A). Tampilkan MK Dosen B |
| 4 | Belum waktunya mengajar | ⏰ Tampilkan card "Jadwal Selanjutnya" dengan jam mulai |
| 5 | Tidak ada jadwal hari ini | 📋 Tampilkan daftar semua MK yang diampu semester ini |
| 6 | Admin login | Bisa akses `/scan` tapi lihat pesan "Halaman ini untuk dosen" + link ke dashboard admin |
| 7 | Multi-jadwal di jam sama | Tampilkan beberapa card, dosen pilih yang relevan |

## QR Code

**QR universal** — satu QR code untuk semua. Link ke: `https://app.e-kendali.com/scan`

Admin panel QR generator: `/dashboard/admin/qr`

Poster untuk dicetak + ditempel di tiap kelas:
```
┌────────────────────────────────┐
│         🎓 e-Kendali Dosen     │
│                                │
│  Scan untuk mencatat           │
│  perkuliahan hari ini          │
│                                │
│        [ QR CODE ]             │
│                                │
│   app.e-kendali.com/scan       │
└────────────────────────────────┘
```

## Files Changed

### New files:
| # | File | Purpose |
|---|------|---------|
| 1 | `app/(dashboard)/scan/page.tsx` | Scan landing, auth check |
| 2 | `app/(dashboard)/scan/scan-client.tsx` | Smart matching UI |
| 3 | `app/(dashboard)/dashboard/admin/qr/page.tsx` | QR generator admin |
| 4 | `app/api/schedules/smart-match/route.ts` | API: match jadwal by user + time |

### Modified files:
| # | File | Change |
|---|------|--------|
| 1 | `prisma/schema.prisma` | Add ScheduleSlot model |
| 2 | `lib/import-jadwal.ts` | Extend parseFile untuk schedule data |
| 3 | `app/api/teaching-loads/import-jadwal/route.ts` | Save schedule slots on import |
| 4 | `app/(dashboard)/layout-client.tsx` | Add `/scan` link to dosen sidebar |
| 5 | `app/layout.tsx` | Add `/scan` to mobile nav (if any) |
| 6 | `components/admin/teaching-loads/import-jadwal-dialog.tsx` | Minor update: show schedule count in result |

## Implementation Order

1. Add ScheduleSlot model to Prisma schema → migrate
2. Extend `lib/import-jadwal.ts` → parse schedule columns + `saveScheduleSlots()`
3. Extend import API → save schedule slots during import
4. Create `/api/schedules/smart-match` API
5. Create `/scan` page + scan-client.tsx
6. Add `/scan` to dosen sidebar nav
7. Create admin QR generator page
8. TypeScript check → commit

## Dependencies

No new dependencies. QR codes can be generated via npm package `qrcode` or a simple URL-based QR API (Google Charts). For simplicity: embed QR via `qrcode` npm package (lightweight, server-side or client-side SVG generation).

Add to package.json: `"qrcode": "^1.5.4"`
