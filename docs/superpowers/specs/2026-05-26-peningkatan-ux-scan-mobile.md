# Spec: Peningkatan UX Scan & Mobile e-Kendali Dosen

**Tanggal:** 2026-05-26
**Tujuan:** Memperpendek alur scan QR, menambah navigasi mobile, PWA support, dan Redis caching.

---

## 1. Masalah yang Diselesaikan

| Masalah | Root Cause | Solusi |
|---------|-----------|--------|
| Menu QR tidak muncul di sidebar Admin | Lupa didaftarkan di roleMenus | Tambah item QR Scan di ADMIN menu |
| Alur scan terlalu panjang (4 langkah) | Tidak ada opsi quick-start | Dual-path: Mulai Cepat + Isi Detail |
| Data jadwal hilang saat navigasi ke form | Query param tidak dikirim | Perbaiki router.push + prefill form |
| Navigasi di mobile harus buka hamburger | Tidak ada bottom tab bar | Tambah 3-tab bottom bar (lg:hidden) |
| Tidak bisa di-install di HP | Tidak ada PWA manifest | Tambah manifest.json + icon + meta tags |
| Smart-match API dipanggil tiap scan | Tidak ada cache | Redis caching (TTL until midnight) |
| Error JWT session | AUTH_SECRET tidak di-set | Tambah AUTH_SECRET ke .env |

---

## 2. Implementasi

### Phase 0: Quick Fix (sebelum mulai)

| # | File | Aksi |
|---|------|------|
| 0a | `.env` | Tambah `AUTH_SECRET` (copy dari NEXTAUTH_SECRET) |
| 0b | `layout-client.tsx:61` | Tambah `{ label: "QR Scan", href: "/dashboard/admin/qr", icon: QrCode }` di ADMIN menu |

### Phase 1: File Baru

| # | File | Deskripsi |
|---|------|-----------|
| 1 | `app/api/sessions/quick-start/route.ts` | POST endpoint - auto-create DRAFT session dari scheduleSlotId |
| 2 | `components/dosen/quick-start-form.tsx` | Form 1-halaman (bukan 3-step wizard) untuk jalur Isi Detail |
| 3 | `components/ui/bottom-tab-bar.tsx` | Bottom tab bar 3-tab untuk mobile (lg:hidden) |
| 4 | `lib/redis.ts` | Redis client wrapper + cacheGet/cacheSet + ttlUntilMidnight |
| 5 | `public/manifest.json` | PWA manifest (name, icons, theme, display standalone) |
| 6 | `public/sw.js` | Service worker minimal untuk caching offline |

### Phase 2: File Dimodifikasi

| # | File | Deskripsi |
|---|------|-----------|
| 7 | `scan-client.tsx` | Dual-path: tombol Mulai Cepat + Isi Detail, perbaiki query param, 3 empty states |
| 8 | `layout-client.tsx` | Import BottomTabBar, main padding pb-20 lg:pb-0, render <BottomTabBar />, sidebar mobile: hapus item yg sudah di tab |
| 9 | `app/layout.tsx` | Tambah meta tag PWA (manifest, theme-color, apple-mobile-web-app) |
| 10 | `smart-match/route.ts` | Tambah Redis caching layer sebelum query Prisma |

---

## 3. Detail API Quick Start

```
POST /api/sessions/quick-start
Body: { scheduleSlotId: string }

Action:
  1. auth() → userId
  2. Cari ScheduleSlot by id → validasi userId match
  3. Cari TeachingLoad by userId + courseId + semesterId
  4. Create LectureSession:
     - teachingLoadId, date: today, startTime, endTime
     - topic: course.name, method: "TATAP_MUKA", status: DRAFT
     - meetsNumber: (max existing + 1)
  5. Return { sessionId, courseId }
```

## 4. Detail Bottom Tab Bar

- 3 tab: Scan (/scan), Beranda (/dashboard/dosen), MK Saya (/dashboard/dosen/courses)
- Visible: lg:hidden
- Fixed bottom-0, h-16, border-t, bg-background, z-40
- Active tab: text-primary, bold, dot indicator
- Inactive: text-muted-foreground

## 5. Detail Redis Caching

- Key: `schedule:{userId}:{day}`
- TTL: sampai tengah malam (ttlUntilMidnight)
- Invalidasi: saat admin import jadwal baru

## 6. PWA

- manifest.json: name, short_name, icons, display standalone, orientation portrait
- Meta tags: theme-color, apple-mobile-web-app-capable, apple-touch-icon
- Service worker: cache-first untuk static assets

## 7. Verification

- [ ] Menu QR Scan muncul di sidebar Admin
- [ ] Dosen scan QR → 2 tombol (Mulai Cepat + Isi Detail)
- [ ] Tap Mulai Cepat → session DRAFT terbuat, redirect ke detail
- [ ] Tap Isi Detail → form 1-halaman pre-filled, submit berhasil
- [ ] Bottom tab bar muncul di mobile (<1024px), tidak di desktop
- [ ] Smart-match API cached (<10ms setelah request pertama)
- [ ] manifest.json bisa diakses
- [ ] Aplikasi bisa di-install (Add to Home Screen)
- [ ] Semua fitur existing tidak rusak
