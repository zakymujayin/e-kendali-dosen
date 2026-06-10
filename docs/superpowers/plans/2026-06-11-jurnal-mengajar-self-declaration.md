# Penyederhanaan Jurnal Mengajar Dosen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat jurnal mengajar dosen mudah diisi (model deklarasi mandiri): hapus GPS, tambah foto evidence opsional, pengingat in-app, daring >4 ditandai bukan diblokir, dan login sekali setelah scan QR + default luring saat via QR.

**Architecture:** Perubahan terfokus pada lapisan UI dosen (komponen form & dashboard), beberapa API ringan (dokumen, dashboard data), satu helper baru `lib/jadwal.ts`, dan dua titik middleware/login. Tidak mengubah skema DB, generator inti, atau menambah background job. Prinsip: **rekam + tandai, jangan blokir**.

**Tech Stack:** Next.js App Router (TypeScript), Prisma/PostgreSQL, shadcn/ui, Tailwind, NextAuth v5, Vitest (tests/).

**Referensi spec:** `docs/superpowers/specs/2026-06-11-jurnal-mengajar-self-declaration-design.md`

---

## File Structure

- `components/dosen/session-form-fields.tsx` — hapus panel GPS; ubah info kuota daring jadi penanda "melebihi kuota" (non-blok); tambah input 1 foto opsional.
- `components/dosen/daftar-hadir-table.tsx` — hapus syarat GPS & blokir kuota di `simpan`; unggah foto setelah simpan.
- `components/dosen/session-form.tsx` — hapus syarat GPS & blokir kuota di `save`; terima `defaultMethod`; unggah foto setelah simpan.
- `components/dosen/quick-start-form.tsx` — hapus auto-deteksi GPS (default tetap Tatap Muka).
- `lib/jadwal.ts` (baru) — `generateJadwal` (dipindah dari course page) + `getOverdueMeetings`.
- `app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx` — pakai `generateJadwal` dari `lib/jadwal.ts`.
- `app/(dashboard)/dashboard/dosen/page.tsx` — hitung & tampilkan pengingat pertemuan belum diisi.
- `proxy.ts` — sertakan `callbackUrl` saat redirect ke login.
- `app/login/page.tsx` — baca & hormati `callbackUrl` (hanya path internal).
- `app/(dashboard)/dashboard/admin/qr/page.tsx` — scanUrl jadi `…/scan?via=qr`.
- `app/(dashboard)/scan/scan-client.tsx` — baca `via=qr` → teruskan `method=TATAP_MUKA` ke route form.
- `app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/new/page.tsx` — teruskan `method` searchParam ke `SessionForm` sebagai `defaultMethod`.
- `app/(dashboard)/dashboard/gkm/monitoring/monitoring-client.tsx` — penanda daring melebihi kuota.
- `lib/daftar-hadir-pdf.ts` — baris ringkasan jumlah daring + catatan melebihi kuota.
- `tests/lib/jadwal.test.ts` (baru) — test `getOverdueMeetings`.

Urutan task dipilih agar tiap task berdiri sendiri & bisa di-ship terpisah.

---

## Task 1: Hapus GPS dari UI + validasi

**Files:**
- Modify: `components/dosen/session-form-fields.tsx`
- Modify: `components/dosen/daftar-hadir-table.tsx`
- Modify: `components/dosen/session-form.tsx`
- Modify: `components/dosen/quick-start-form.tsx`

Catatan: GPS dihapus dari **UI + validasi saja**. Field GPS pada tipe `SessionFieldValues`/`Pertemuan` dan `buildBody`/`body` **dibiarkan** (akan terkirim null/empty — kolom DB nullable). Ini menjaga perubahan kecil & rendah risiko.

- [ ] **Step 1: `session-form-fields.tsx` — buang state & handler GPS**

Hapus baris import GPS-only dan state/effect/handler GPS. Ubah blok import ikon (baris 14) dan import constants (baris 15) menjadi:

```tsx
import { Globe, Wifi, AlertCircle } from "lucide-react"
import { MAX_DARING, isDaringMethod } from "@/lib/constants"
```

Hapus state `gpsStatus` (baris 63), `useEffect` GPS (baris 70–74), dan seluruh fungsi `handleDetectGps` (baris 90–124).

- [ ] **Step 2: `session-form-fields.tsx` — hapus panel "Validasi GPS"**

Hapus seluruh blok `{!isDaring && values.method && ( …Validasi GPS… )}` (baris 206–247). Panel URL Platform daring (baris 249–268) tetap. Setelah ini, untuk luring tidak ada panel tambahan apa pun.

- [ ] **Step 3: `daftar-hadir-table.tsx` (`simpan`) — hapus syarat GPS luring**

Hapus blok berikut (baris 191–194):

```tsx
    if (!isDaringMethod(p.method) && (!p.latitude || !p.longitude)) {
      toast.error("Deteksi GPS wajib untuk sesi luring")
      return
    }
```

Biarkan pengecekan URL daring (baris 195–198) tetap.

- [ ] **Step 4: `session-form.tsx` (`save`) — hapus syarat GPS luring**

Hapus blok berikut (baris 99–102):

```tsx
    if (!isDaring && (!latitude || !longitude)) {
      toast.error("Deteksi GPS wajib untuk sesi luring")
      return
    }
```

`body.latitude/longitude/gpsAccuracy` (baris 142–146) dibiarkan — akan terkirim null.

- [ ] **Step 5: `quick-start-form.tsx` — hapus auto-deteksi GPS**

Hapus `useEffect` pemicu GPS (baris 58–62), fungsi `detectGps` (baris 64–95), state GPS (baris 46–52), dan blok status GPS pada render `!isDaring` (baris 240–257). Pada `handleSubmit`, hapus blok `if (lat != null && lng != null) { … }` (baris 125–131). Hapus import ikon `MapPin, Crosshair` yang tak terpakai (sisakan yang masih dipakai). Default `method` tetap `"TATAP_MUKA"`.

- [ ] **Step 6: Verifikasi tipe & lint**

Run: `cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit && npm run lint`
Expected: `No errors found` / `No issues found`. Jika ada variabel/impor tak terpakai (mis. `Button` di form-fields jika sudah tak dipakai), hapus.

- [ ] **Step 7: Commit**

```bash
git add components/dosen/session-form-fields.tsx components/dosen/daftar-hadir-table.tsx components/dosen/session-form.tsx components/dosen/quick-start-form.tsx
git commit -m "feat: hapus GPS dari UI & validasi jurnal (luring tak lagi butuh GPS)"
```

---

## Task 2: Kuota daring — hapus blokir + penanda di form

**Files:**
- Modify: `components/dosen/daftar-hadir-table.tsx`
- Modify: `components/dosen/session-form.tsx`
- Modify: `components/dosen/session-form-fields.tsx`

- [ ] **Step 1: `daftar-hadir-table.tsx` (`simpan`) — hapus blokir kuota**

Hapus blok (baris 200–209):

```tsx
    if (isDaringMethod(p.method) && !p.sessionId) {
      try {
        const qr = await fetch(`/api/teaching-loads/${teachingLoadId}/daring-quota`)
        const qj = await qr.json()
        if (qj.success && qj.data && !qj.data.isAvailable) {
          toast.error(`Kuota daring habis (maks. ${MAX_DARING}×). Tidak dapat menyimpan sesi daring baru.`)
          return
        }
      } catch { /* lanjut jika gagal fetch quota */ }
    }
```

Hapus impor `MAX_DARING` dari baris 18 jika tak lagi dipakai di file ini (cek: hanya dipakai di blok yang dihapus → hapus dari impor, sisakan `isDaringMethod, METHOD_LABELS`).

- [ ] **Step 2: `session-form.tsx` (`save`) — hapus blokir kuota**

Hapus blok (baris 113–122):

```tsx
      if (!isEdit) {
        try {
          const qr = await fetch(`/api/teaching-loads/${teachingLoadId}/daring-quota`)
          const qj = await qr.json()
          if (qj.success && qj.data && !qj.data.isAvailable) {
            toast.error(`Kuota daring habis (maks. ${MAX_DARING}×). Tidak dapat menyimpan sesi daring baru.`)
            return
          }
        } catch { /* lanjut jika gagal fetch quota */ }
      }
```

Pertahankan validasi `platformUrl` wajib & valid. Hapus impor `MAX_DARING` (baris 9) jika tak lagi dipakai di file ini → jadikan `import { isDaringMethod } from "@/lib/constants"`.

- [ ] **Step 3: `session-form-fields.tsx` — ubah info kuota jadi penanda non-blok**

Ganti blok alert kuota (baris 171–180) menjadi penanda yang tetap menampilkan sisa kuota DAN memberi tahu bila melebihi (tanpa memblokir):

```tsx
        {daringQuota && (
          <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
            daringQuota.used >= MAX_DARING
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : daringQuota.remaining <= 1
              ? "bg-yellow-50 border-yellow-200 text-yellow-700"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}>
            {daringQuota.used >= MAX_DARING
              ? <AlertCircle className="h-4 w-4 shrink-0" />
              : <Wifi className="h-4 w-4 shrink-0" />}
            <span>
              {daringQuota.used >= MAX_DARING
                ? `Daring sudah ${daringQuota.used}× — melebihi kuota ${MAX_DARING}. Tetap bisa disimpan.`
                : `Sisa kuota daring: ${daringQuota.remaining}/${MAX_DARING}`}
            </span>
          </div>
        )}
```

- [ ] **Step 4: `session-form-fields.tsx` — hapus `disabled` pada SelectItem daring**

Pada lima `<SelectItem>` daring (baris 196–200), hapus atribut `disabled={…}` sehingga semua metode daring selalu dapat dipilih. Contoh hasil:

```tsx
              <SelectItem value="ZOOM">Zoom Meeting</SelectItem>
              <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
              <SelectItem value="MS_TEAMS">Microsoft Teams</SelectItem>
              <SelectItem value="LMS">LMS / Moodle</SelectItem>
              <SelectItem value="PLATFORM_LAIN">Platform Lain</SelectItem>
```

Pastikan `AlertCircle` & `Wifi` ada di impor ikon (dari Task 1 Step 1: `import { Globe, Wifi, AlertCircle } from "lucide-react"`).

- [ ] **Step 5: Verifikasi**

Run: `cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit && npm run lint`
Expected: nol error. Pastikan `MAX_DARING` masih terimpor di `session-form-fields.tsx` (dipakai di Step 3).

- [ ] **Step 6: Commit**

```bash
git add components/dosen/daftar-hadir-table.tsx components/dosen/session-form.tsx components/dosen/session-form-fields.tsx
git commit -m "feat: daring >4 tidak diblokir, ditandai melebihi kuota di form"
```

---

## Task 3: Penanda daring melebihi kuota di Monitoring GKM & PDF

**Files:**
- Modify: `app/(dashboard)/dashboard/gkm/monitoring/monitoring-client.tsx`
- Modify: `lib/daftar-hadir-pdf.ts`

Catatan: bagian ini aditif. Implementer **wajib membaca file saat ini lebih dulu** untuk menemukan tempat render jumlah/daftar sesi per MK, lalu menambahkan penanda. `MAX_DARING` diimpor dari `@/lib/constants`.

- [ ] **Step 1: Monitoring GKM — hitung jumlah daring per MK & tampilkan penanda**

Buka `app/(dashboard)/dashboard/gkm/monitoring/monitoring-client.tsx`. Temukan tempat tiap baris/kartu MK dirender. Untuk tiap MK, hitung jumlah sesi daring (`sessions.filter(s => s.isDaring).length` atau gunakan field daring yang tersedia pada data monitoring). Tambahkan badge bila melebihi `MAX_DARING`:

```tsx
{daringCount > MAX_DARING && (
  <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
    Daring {daringCount}× · melebihi {MAX_DARING}
  </span>
)}
```

Tambahkan `import { MAX_DARING } from "@/lib/constants"` bila belum ada. Jika data monitoring belum memuat jumlah daring per MK, ambil dari field yang ada (mis. `isDaring` per sesi) atau dari endpoint yang sudah dipakai halaman ini — jangan menambah query baru bila bisa dihitung dari data yang sudah dimuat.

- [ ] **Step 2: PDF jurnal — baris ringkasan jumlah daring**

Buka `lib/daftar-hadir-pdf.ts`. Temukan bagian setelah tabel pertemuan (sebelum blok tanda tangan). Hitung `daringCount = sessions.filter(s => s.isDaring).length` (sesuaikan dengan struktur data yang tersedia di fungsi). Tambahkan satu baris teks:

```ts
const daringCount = sessions.filter((s) => s.isDaring).length
const daringNote =
  daringCount > MAX_DARING
    ? `Jumlah sesi daring: ${daringCount} (melebihi kuota ${MAX_DARING})`
    : `Jumlah sesi daring: ${daringCount}`
// render daringNote sebagai satu baris teks kecil di bawah tabel,
// memakai API rendering teks yang sudah dipakai file ini (mis. doc.text(...) / autoTable footer).
```

Tambahkan `import { MAX_DARING } from "@/lib/constants"` di atas. Gunakan mekanisme penulisan teks yang **sudah ada** di file ini (ikuti pola pemanggilan yang sama dengan teks lain di sekitarnya).

- [ ] **Step 3: Verifikasi**

Run: `cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit && npm run lint && npm run build`
Expected: nol error, nol warning.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/dashboard/gkm/monitoring/monitoring-client.tsx" lib/daftar-hadir-pdf.ts
git commit -m "feat: penanda daring melebihi kuota di monitoring GKM & PDF jurnal"
```

---

## Task 4: Foto evidence (1 foto opsional)

**Files:**
- Modify: `components/dosen/session-form-fields.tsx`
- Modify: `components/dosen/daftar-hadir-table.tsx`
- Modify: `components/dosen/session-form.tsx`

API `/api/documents` (POST) sudah ada: terima `FormData` dengan `file` + `sessionId`, izinkan `jpg/jpeg/png`, maks 10MB, hanya pemilik sesi. Karena butuh `sessionId`, foto diunggah **setelah** sesi tersimpan. GKM melihat foto via detail sesi (`/api/sessions/[id]` GET sudah meng-include documents).

- [ ] **Step 1: `session-form-fields.tsx` — tambah props foto + input kamera**

Tambah dua prop opsional pada interface (baris 52–56):

```tsx
interface SessionFormFieldsProps {
  values: SessionFieldValues
  onChange: (patch: Partial<SessionFieldValues>) => void
  teachingLoadId: string
  photoFile?: File | null
  onPhotoChange?: (file: File | null) => void
}
```

Tambah ke destructuring (baris 58–62): `photoFile`, `onPhotoChange`. Sebelum blok "Catatan" (sebelum baris 299), tambahkan input foto opsional:

```tsx
      {onPhotoChange && (
        <div className="space-y-2">
          <Label htmlFor="sf-photo">Foto (opsional)</Label>
          <Input
            id="sf-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => onPhotoChange(e.target.files?.[0] ?? null)}
          />
          {photoFile && (
            <p className="text-xs text-muted-foreground">Terlampir: {photoFile.name}</p>
          )}
        </div>
      )}
```

- [ ] **Step 2: `daftar-hadir-table.tsx` — state foto + unggah setelah simpan**

Tambah state foto bersama state lain (dekat `const [saving, setSaving] = useState(false)`):

```tsx
  const [photoFile, setPhotoFile] = useState<File | null>(null)
```

Pada pemanggilan `<SessionFormFields … />` di dalam Sheet, tambahkan props:

```tsx
                    photoFile={photoFile}
                    onPhotoChange={setPhotoFile}
```

Di `openSheet`, reset foto: tambahkan `setPhotoFile(null)` setelah `setSheetOpen(true)`.

Di `simpan`, setelah `const sid = j.data.id` dan `upd(selected, { sessionId: sid, status: j.data.status })`, unggah foto bila ada (sebelum cabang publish):

```tsx
      if (photoFile) {
        const fd = new FormData()
        fd.append("file", photoFile)
        fd.append("sessionId", sid)
        try { await fetch("/api/documents", { method: "POST", body: fd }) }
        catch { toast.error("Foto gagal diunggah, sesi tetap tersimpan") }
        setPhotoFile(null)
      }
```

- [ ] **Step 3: `session-form.tsx` — state foto + unggah setelah simpan**

Tambah state: `const [photoFile, setPhotoFile] = useState<File | null>(null)`. Tambahkan props pada `<SessionFormFields … />`: `photoFile={photoFile}` dan `onPhotoChange={setPhotoFile}`. Di `save`, setelah respons sukses (`data.data?.id`), sebelum/diiringi cabang publish, unggah foto:

```tsx
      const newId = data.data.id
      if (photoFile && newId) {
        const fd = new FormData()
        fd.append("file", photoFile)
        fd.append("sessionId", newId)
        try { await fetch("/api/documents", { method: "POST", body: fd }) }
        catch { toast.error("Foto gagal diunggah, sesi tetap tersimpan") }
        setPhotoFile(null)
      }
```

(Gunakan `data.data.id` yang sama dipakai untuk publish pada baris 169.)

- [ ] **Step 4: Verifikasi**

Run: `cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit && npm run lint`
Expected: nol error. Pastikan `Input` & `Label` sudah terimpor di `session-form-fields.tsx` (ya).

- [ ] **Step 5: Commit**

```bash
git add components/dosen/session-form-fields.tsx components/dosen/daftar-hadir-table.tsx components/dosen/session-form.tsx
git commit -m "feat: foto evidence opsional per pertemuan (kamera HP), diunggah setelah simpan"
```

---

## Task 5: Pengingat in-app (pertemuan belum diisi)

**Files:**
- Create: `lib/jadwal.ts`
- Create: `tests/lib/jadwal.test.ts`
- Modify: `app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx`
- Modify: `app/(dashboard)/dashboard/dosen/page.tsx`

- [ ] **Step 1: Tulis test gagal untuk `getOverdueMeetings`**

Create `tests/lib/jadwal.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { getOverdueMeetings } from "@/lib/jadwal"

describe("getOverdueMeetings", () => {
  const slots = [{ day: "Senin", startTime: "08:00", endTime: "10:00", roomName: "A", className: "01" }]
  // Semester mulai Senin 2026-01-05; pertemuan 1=12 Jan, 2=19 Jan, dst (nextDayOfWeek mulai dari hari berikutnya)
  const start = new Date("2026-01-05T00:00:00.000Z")

  it("mengembalikan pertemuan yang tanggalnya lewat & belum ada sesi", () => {
    const filled = new Set<number>([1])
    const today = new Date("2026-01-21T00:00:00.000Z")
    const result = getOverdueMeetings(slots, start, 4, filled, today)
    // pertemuan 1 sudah diisi; pertemuan 2 (19 Jan) lewat & belum diisi → overdue
    expect(result).toEqual([2])
  })

  it("tidak menandai pertemuan yang tanggalnya belum lewat", () => {
    const filled = new Set<number>()
    const today = new Date("2026-01-13T00:00:00.000Z")
    const result = getOverdueMeetings(slots, start, 4, filled, today)
    // hanya pertemuan 1 (12 Jan) yang sudah lewat
    expect(result).toEqual([1])
  })

  it("mengembalikan kosong bila tak ada slot", () => {
    expect(getOverdueMeetings([], start, 4, new Set(), new Date())).toEqual([])
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `cd /home/zhev/myproject/e-kendali-dosen && npx vitest run tests/lib/jadwal.test.ts`
Expected: FAIL — modul `@/lib/jadwal` belum ada.

- [ ] **Step 3: Buat `lib/jadwal.ts` (pindahkan `generateJadwal` + tambah `getOverdueMeetings`)**

Create `lib/jadwal.ts` (logika `generateJadwal` dipindah persis dari `courses/[courseId]/page.tsx` baris 9–43):

```ts
const DAY_MAP: Record<string, number> = {
  Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 0,
}

function nextDayOfWeek(from: Date, targetDay: number): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  while (d.getDay() !== targetDay) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

export interface SlotInfo {
  day: string
  startTime: string
  endTime: string
  roomName: string
  className: string
}

export interface JadwalEntry {
  tanggal: string
  hari: string
  jam: string
  ruang: string
}

export function generateJadwal(slots: SlotInfo[], startDate: Date, total: number): JadwalEntry[] {
  if (slots.length === 0) return []
  const sorted = [...slots].sort((a, b) => (DAY_MAP[a.day] ?? 7) - (DAY_MAP[b.day] ?? 7))
  const dates: JadwalEntry[] = []
  let cursor = new Date(startDate)
  for (let i = 0; i < total; i++) {
    const slot = sorted[i % sorted.length]
    const dayNum = DAY_MAP[slot.day] ?? 1
    cursor = nextDayOfWeek(cursor, dayNum)
    dates.push({
      tanggal: cursor.toISOString().split("T")[0],
      hari: slot.day.substring(0, 3),
      jam: `${slot.startTime}-${slot.endTime}`,
      ruang: slot.roomName,
    })
  }
  return dates
}

// Mengembalikan nomor pertemuan yang tanggal perkiraannya sudah lewat (< hari ini) tapi belum ada sesi.
export function getOverdueMeetings(
  slots: SlotInfo[],
  startDate: Date,
  total: number,
  filledMeetingNumbers: Set<number>,
  today: Date = new Date(),
): number[] {
  const jadwal = generateJadwal(slots, startDate, total)
  const todayStr = today.toISOString().split("T")[0]
  const overdue: number[] = []
  jadwal.forEach((entry, i) => {
    const meetingNo = i + 1
    if (entry.tanggal < todayStr && !filledMeetingNumbers.has(meetingNo)) {
      overdue.push(meetingNo)
    }
  })
  return overdue
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `cd /home/zhev/myproject/e-kendali-dosen && npx vitest run tests/lib/jadwal.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Pakai `generateJadwal` dari `lib/jadwal.ts` di course page**

Di `app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx`: hapus `DAY_MAP` (baris 9–11), `nextDayOfWeek` (baris 13–20), `interface SlotInfo` (baris 22), dan `generateJadwal` (baris 24–43). Tambahkan impor di atas:

```tsx
import { generateJadwal } from "@/lib/jadwal"
```

Sisa file tetap (pemanggilan `generateJadwal(scheduleSlots, …)` baris 78–80 tidak berubah).

- [ ] **Step 6: Dashboard dosen — hitung pertemuan belum diisi & tampilkan pengingat**

Di `app/(dashboard)/dashboard/dosen/page.tsx`, sesudah query `teachingLoads` & `activeSemester` (yang sudah ada), tambahkan perhitungan overdue lintas MK. Tambah impor:

```tsx
import { getOverdueMeetings, type SlotInfo } from "@/lib/jadwal"
import { AlertCircle } from "lucide-react"
```

Tambahkan query slot + perhitungan (letakkan setelah `todaySlots` didefinisikan):

```tsx
  const allSlots = activeSemester
    ? await prisma.scheduleSlot.findMany({
        where: { userId, semesterId: activeSemester.id },
        select: { courseId: true, day: true, startTime: true, endTime: true, roomName: true, className: true },
      })
    : []

  let overdueTotal = 0
  if (activeSemester) {
    for (const tl of teachingLoads) {
      const slots: SlotInfo[] = allSlots
        .filter(s => s.courseId === tl.course.id)
        .map(s => ({ day: s.day, startTime: s.startTime, endTime: s.endTime, roomName: s.roomName, className: s.className }))
      if (slots.length === 0) continue
      const filled = new Set(tl.sessions.map(s => s.meetingNumber))
      overdueTotal += getOverdueMeetings(slots, activeSemester.startDate, tl.course.totalMeeting, filled).length
    }
  }
```

Catatan: pastikan query `teachingLoads.sessions` meng-`select` `meetingNumber` (saat ini memilih `{ id, meetingNumber, isDaring }` — sudah memuat `meetingNumber`). Pastikan `activeSemester` memuat `startDate` (tambah ke `include`/`select` semester bila perlu — model `semester` punya `startDate`).

Lalu, di JSX di dalam blok "Perlu Perhatian" (sebelum alert `todaySlots`), tambahkan alert pengingat bila `overdueTotal > 0`:

```tsx
      {overdueTotal > 0 && (
        <Alert className="border-orange-300 bg-orange-50 text-orange-900">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{overdueTotal} pertemuan sudah lewat tapi belum diisi jurnalnya.</span>
            <Link href="/dashboard/dosen/courses" className="text-sm font-medium underline underline-offset-2 shrink-0">
              Isi sekarang →
            </Link>
          </AlertDescription>
        </Alert>
      )}
```

Sesuaikan kondisi pembungkus heading "Perlu Perhatian" menjadi: `(todaySlots.length > 0 || draftCount > 0 || overdueTotal > 0)`.

- [ ] **Step 7: Verifikasi penuh**

Run: `cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit && npm run lint && npx vitest run tests/lib/jadwal.test.ts`
Expected: nol error, test lulus.

- [ ] **Step 8: Commit**

```bash
git add lib/jadwal.ts tests/lib/jadwal.test.ts "app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx" "app/(dashboard)/dashboard/dosen/page.tsx"
git commit -m "feat: pengingat in-app pertemuan belum diisi + ekstrak lib/jadwal.ts"
```

---

## Task 6: Login sekali (callbackUrl) + entry via QR default luring

**Files:**
- Modify: `proxy.ts`
- Modify: `app/login/page.tsx`
- Modify: `app/(dashboard)/dashboard/admin/qr/page.tsx`
- Modify: `app/(dashboard)/scan/scan-client.tsx`
- Modify: `app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/new/page.tsx`
- Modify: `components/dosen/session-form.tsx`

- [ ] **Step 1: `proxy.ts` — sertakan callbackUrl saat redirect ke login**

Ganti blok redirect tanpa-user (baris 34–36):

```tsx
  if (!user && !isPublic && !isApi) {
    const url = new URL("/login", req.url)
    url.searchParams.set("callbackUrl", pathname + req.nextUrl.search)
    return NextResponse.redirect(url)
  }
```

- [ ] **Step 2: `app/login/page.tsx` — hormati callbackUrl (hanya path internal)**

Tambah impor `useSearchParams`:

```tsx
import { useRouter, useSearchParams } from "next/navigation"
```

Di komponen, baca & validasi callbackUrl:

```tsx
  const searchParams = useSearchParams()
  const rawCallback = searchParams.get("callbackUrl") || ""
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard"
```

Ganti `router.push("/dashboard")` (baris 38) menjadi `router.push(callbackUrl)`.

Catatan: `useSearchParams` butuh Suspense boundary di App Router. Bila `npm run build` mengeluh "useSearchParams should be wrapped in a suspense boundary", bungkus isi komponen `LoginPage` ke komponen anak `LoginForm` lalu render `<Suspense fallback={null}><LoginForm /></Suspense>` (impor `Suspense` dari `react`).

- [ ] **Step 3: QR — tambahkan penanda `?via=qr`**

Buka `app/(dashboard)/dashboard/admin/qr/page.tsx`. Temukan tempat `scanUrl` dibentuk (mis. `${base}/scan`) dan ubah menjadi `${base}/scan?via=qr`. (Hanya menambah query; `qr-client.tsx` tidak perlu diubah.)

- [ ] **Step 4: `scan-client.tsx` — baca `via=qr`, teruskan `method=TATAP_MUKA`**

Tambah impor `useSearchParams`:

```tsx
import { useRouter, useSearchParams } from "next/navigation"
```

Di komponen:

```tsx
  const searchParams = useSearchParams()
  const viaQr = searchParams.get("via") === "qr"
  const methodParam = viaQr ? "&method=TATAP_MUKA" : ""
```

Pada `detailStart` (baris 93–98), sisipkan `methodParam` di akhir URL:

```tsx
  function detailStart(slot: SlotData) {
    const today = formatDate()
    router.push(
      `/dashboard/dosen/courses/${slot.courseId}/sessions/new?scheduleSlotId=${slot.id}&date=${today}&startTime=${slot.startTime}&endTime=${slot.endTime}${methodParam}`
    )
  }
```

Pada `startManual` (baris 100–105), sisipkan method juga:

```tsx
  function startManual(courseId?: string) {
    const id = courseId || selectedCourse
    if (id) {
      router.push(`/dashboard/dosen/courses/${id}/sessions/new${viaQr ? "?method=TATAP_MUKA" : ""}`)
    }
  }
```

Catatan: `useSearchParams` — bila build mengeluh suspense, bungkus `ScanClient` di pemanggilnya (`app/(dashboard)/scan/page.tsx`) dengan `<Suspense>` atau pindah pembacaan param ke komponen anak ber-Suspense (pola sama seperti Step 2).

- [ ] **Step 5: `sessions/new/page.tsx` — teruskan `method` searchParam ke `SessionForm`**

Buka `app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/new/page.tsx`. Pada pembacaan `searchParams` (page server component), baca `method` dan teruskan ke `<SessionForm defaultMethod={...} />`. Contoh penambahan (sesuaikan dengan cara file ini membaca searchParams):

```tsx
  const defaultMethod = typeof sp.method === "string" ? sp.method : undefined
  // ...
  <SessionForm /* props lain */ defaultMethod={defaultMethod} />
```

(Jika file ini me-render `QuickStartForm` untuk jalur `scheduleSlotId`, biarkan — `QuickStartForm` sudah default `TATAP_MUKA`.)

- [ ] **Step 6: `session-form.tsx` — terima `defaultMethod`**

Tambah ke `SessionFormProps` (interface): `defaultMethod?: string`. Tambah ke destructuring props. Pada inisialisasi `values` (baris 63), ganti seed `method`:

```tsx
    method: existingSession?.method || defaultMethod || "",
```

- [ ] **Step 7: Verifikasi penuh**

Run: `cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit && npm run lint && npm run build`
Expected: nol error, nol warning. Bila build menuntut Suspense untuk `useSearchParams`, terapkan pembungkusan Suspense seperti catatan Step 2/Step 4.

- [ ] **Step 8: Commit**

```bash
git add proxy.ts app/login/page.tsx "app/(dashboard)/dashboard/admin/qr/page.tsx" "app/(dashboard)/scan/scan-client.tsx" "app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/new/page.tsx" components/dosen/session-form.tsx
git commit -m "feat: login sekali via callbackUrl + entry via QR default Tatap Muka"
```

---

## Task 7: Penanda jenis sesi (Normal / Pengganti / Tambahan) di SessionForm

**Files:**
- Modify: `components/dosen/session-form.tsx`

Konteks: alur sesi pengganti masuk lewat scan → `sessions/new` → `SessionForm`. Saat ini `session-form.tsx` punya `const [sessionType] = useState(...)` **tanpa setter** dan mengirimnya di `body`, tapi tidak ada UI untuk memilihnya. Tambahkan pemilih kecil agar dosen bisa menandai PENGGANTI/TAMBAHAN. (Sheet editor `DaftarHadirTable` tetap default NORMAL — di luar lingkup task ini.)

- [ ] **Step 1: Tambah setter pada state sessionType**

Ubah baris 53:

```tsx
  const [sessionType, setSessionType] = useState(existingSession?.sessionType || "NORMAL")
```

- [ ] **Step 2: Tambah pemilih jenis sesi di UI**

Impor komponen Select di `session-form.tsx`:

```tsx
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
```

Di dalam `<CardContent className="p-0">`, tepat sebelum `<SessionFormFields … />`, tambahkan pemilih (dengan padding agar selaras dengan padding form fields):

```tsx
          <div className="px-6 pt-4 space-y-2">
            <Label htmlFor="sf-sessiontype">Jenis Sesi</Label>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger id="sf-sessiontype">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="PENGGANTI">Pengganti</SelectItem>
                <SelectItem value="TAMBAHAN">Tambahan</SelectItem>
              </SelectContent>
            </Select>
          </div>
```

`sessionType` sudah dikirim di `body` (baris 136) — tidak perlu perubahan lain pada penyimpanan.

- [ ] **Step 3: Verifikasi**

Run: `cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit && npm run lint`
Expected: nol error.

- [ ] **Step 4: Commit**

```bash
git add components/dosen/session-form.tsx
git commit -m "feat: pemilih jenis sesi (Normal/Pengganti/Tambahan) untuk sesi pengganti"
```

---

## Task 8: Verifikasi akhir end-to-end

**Files:** tidak ada (verifikasi).

- [ ] **Step 1: Cek lengkap**

Run: `cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit && npm run lint && npm run build && npx vitest run`
Expected: nol error, nol warning, semua test lulus.

- [ ] **Step 2: Uji manual (dev server `npm run dev`, port 3002)**

Verifikasi tiap alur sesuai spec:
- Isi sesi **luring tanpa langkah GPS** → bisa simpan & publish.
- Isi sesi **daring**: pilih daring → URL platform → lampirkan 1 foto (kamera HP) → simpan; foto terunggah.
- Rekam **sesi daring ke-5** → tetap bisa disimpan; penanda "melebihi kuota" muncul di form, monitoring GKM, dan PDF jurnal.
- **Scan QR saat belum login** → diarahkan ke `/login?callbackUrl=/scan?via=qr` → setelah login langsung ke `/scan` (tanpa scan ulang); metode form terpra-pilih Tatap Muka.
- **GKM** membuka detail sesi → dapat melihat foto evidence.
- **Pengingat** muncul di dashboard dosen untuk pertemuan yang tanggalnya lewat tapi belum diisi.
- **Sesi pengganti**: di `sessions/new`, pilih Jenis Sesi = Pengganti, set tanggal/jam berbeda → tersimpan dengan `sessionType=PENGGANTI`.

- [ ] **Step 3: Commit (bila ada perbaikan kecil saat verifikasi)**

```bash
git add -A
git commit -m "fix: perbaikan kecil hasil verifikasi end-to-end"
```

---

## Catatan eksekusi

- Tiap task berdiri sendiri & bisa di-ship terpisah; urutan disarankan 1→8 tapi tidak wajib (kecuali Task 5 Step 5 bergantung pada `lib/jadwal.ts` dari Step 3).
- Untuk `useSearchParams` di App Router, siapkan pembungkus `<Suspense>` bila `npm run build` memintanya — ini satu-satunya kejutan build yang mungkin.
- GPS DB columns, halaman admin kampus, API `validate-gps` **sengaja tidak disentuh** (di luar lingkup).
