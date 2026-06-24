# QR Smart Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Buat halaman `/scan` dengan smart matching (dosen + hari + jam → MK auto) dan QR universal yang bisa ditempel di semua kelas.

**Architecture:** ScheduleSlot model di DB (data dari import Excel), `/scan` page client-side smart matching via API, QR universal via `qrcode` library.

**Tech Stack:** Next.js 15 App Router, Prisma, exceljs, `qrcode` (npm), shadcn UI

---

## File Structure

| # | File | Baru/Modif | Peran |
|---|------|-----------|-------|
| 1 | `prisma/schema.prisma` | **Modify** | Add ScheduleSlot model |
| 2 | `lib/import-jadwal.ts` | **Modify** | Add `saveScheduleSlots()` |
| 3 | `app/api/teaching-loads/import-jadwal/route.ts` | **Modify** | Call saveScheduleSlots on import |
| 4 | `app/api/schedules/smart-match/route.ts` | **Create** | API: match by userId + day + time |
| 5 | `app/(dashboard)/scan/page.tsx` | **Create** | Scan landing page |
| 6 | `app/(dashboard)/scan/scan-client.tsx` | **Create** | Smart matching UI, mobile-first |
| 7 | `app/(dashboard)/dashboard/admin/qr/page.tsx` | **Create** | Admin QR generator + print |
| 8 | `app/(dashboard)/layout-client.tsx` | **Modify** | Add `/scan` nav link for DOSEN |

---

### Task 1: Add ScheduleSlot model + migrate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ScheduleSlot model to schema**

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

  semester Semester @relation(fields: [semesterId], references: [id])
  user     User     @relation(fields: [userId], references: [id])
  course   Course   @relation(fields: [courseId], references: [id])
  prodi    Prodi    @relation(fields: [prodiId], references: [id])

  @@index([userId, day])
  @@index([day, startTime, roomName])
}
```

- [ ] **Step 2: Run migration**

```bash
rtk npx prisma migrate dev --name add_schedule_slots 2>&1
```

- [ ] **Step 3: Commit**

```bash
rtk git add prisma/schema.prisma prisma/migrations/ && rtk git commit -m "feat: add ScheduleSlot model"
```

---

### Task 2: Extend import-jadwal with schedule parsing + saving

**Files:**
- Modify: `lib/import-jadwal.ts`
- Modify: `app/api/teaching-loads/import-jadwal/route.ts`

- [ ] **Step 1: Add helper types and functions to lib/import-jadwal.ts**

```typescript
// At the bottom of lib/import-jadwal.ts, add:

export interface ScheduleEntry {
  semesterId: string
  userId: string
  courseId: string
  prodiId: string
  roomName: string
  className: string
  day: string
  startTime: string
  endTime: string
}

/** Extract schedule info from parsed rows */
export function extractScheduleEntries(
  rows: RawRow[],
  semesterId: string,
  dosenMap: Map<string, string>,
  courseMap: Map<string, string>,
  prodiMap: Map<string, string>
): ScheduleEntry[] {
  return rows.reduce<ScheduleEntry[]>((acc, row) => {
    const dosenId = row.NAMA_DOSEN ? dosenMap.get(normalizeName(row.NAMA_DOSEN)) : undefined
    const courseId = row.KODE_MK ? courseMap.get(row.KODE_MK) : undefined
    const prodiId = row.PRODI ? prodiMap.get(row.PRODI) : undefined
    const ruang = row.RUANG_KELAS ? String(row.RUANG_KELAS) : ""
    const kelas = row.KELAS ? String(row.KELAS) : ""
    const hari = row.HARI ? String(row.HARI) : ""
    const waktu = row.WAKTU ? String(row.WAKTU) : ""

    if (!dosenId || !courseId || !prodiId || !ruang || !hari || !waktu) return acc

    // Parse waktu "07.30-09.10" → startTime, endTime
    const [startTime, endTime] = waktu.split("-").map((t) => t.trim())

    acc.push({
      semesterId, userId: dosenId, courseId, prodiId,
      roomName: ruang, className: kelas,
      day: hari.toUpperCase(), startTime: startTime || "", endTime: endTime || "",
    })

    return acc
  }, [])
}

/** Bulk save schedule slots (delete existing for semester first) */
export async function saveScheduleSlots(entries: ScheduleEntry[]): Promise<number> {
  if (entries.length === 0) return 0
  const { prisma } = await import("./prisma")

  // Delete existing slots for this semester
  await prisma.scheduleSlot.deleteMany({
    where: { semesterId: entries[0].semesterId },
  })

  // Batch create
  const result = await prisma.scheduleSlot.createMany({
    data: entries,
    skipDuplicates: true,
  })

  return result.count
}
```

- [ ] **Step 2: Update import API route to save schedule slots after TL creation**

Add to `app/api/teaching-loads/import-jadwal/route.ts`:

```typescript
// After creating teaching loads, add schedule saving:
import { extractScheduleEntries, saveScheduleSlots } from "@/lib/import-jadwal"

// Build prodi map
const prodiList = await prisma.prodi.findMany({ select: { id: true, code: true } })
const prodiMap = new Map<string, string>()
for (const p of prodiList) prodiMap.set(p.code, p.id)

const scheduleEntries = extractScheduleEntries(rows, semesterId, finalDosenMap, courseMap, prodiMap)
const scheduleSaved = await saveScheduleSlots(scheduleEntries)
```

Add to response:
```typescript
teachingLoadsCreated,
scheduleSaved,
```

- [ ] **Step 3: Commit**

```bash
rtk git add lib/import-jadwal.ts app/api/teaching-loads/import-jadwal/route.ts
rtk git commit -m "feat: save schedule slots on jadwal import"
```

---

### Task 3: Create smart-match API

**Files:**
- Create: `app/api/schedules/smart-match/route.ts`

- [ ] **Step 1: Write the API endpoint**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unauthorized } from "@/lib/api"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const now = new Date()
    const days = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"]
    const today = days[now.getDay()]
    const currentTime = `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`

    // Get active semester
    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, year: true },
    })

    if (!activeSemester) {
      return NextResponse.json({ success: true, data: { active: null, todaySchedules: [], allCourses: [], semester: null } })
    }

    // Get today's schedule slots for this user
    const slots = await prisma.scheduleSlot.findMany({
      where: { userId: session.user.id, day: today, semesterId: activeSemester.id },
      include: {
        course: { select: { id: true, code: true, name: true, sks: true } },
        prodi: { select: { name: true, code: true } },
      },
      orderBy: { startTime: "asc" },
    })

    // Classify slots
    let activeSlot = null
    const todaySchedules: typeof slots = []
    for (const slot of slots) {
      if (slot.startTime <= currentTime && currentTime <= slot.endTime && !activeSlot) {
        activeSlot = slot
      } else {
        todaySchedules.push(slot)
      }
    }

    // If active slot found, move to front of todaySchedules
    if (activeSlot) {
      todaySchedules.unshift(activeSlot)
    }

    // Get all courses this user teaches in active semester
    const teachingLoads = await prisma.teachingLoad.findMany({
      where: { userId: session.user.id, semesterId: activeSemester.id },
      include: {
        course: { select: { id: true, code: true, name: true, sks: true } },
      },
    })
    const allCourses = teachingLoads.map((tl) => tl.course)
    const uniqueCourses = allCourses.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)

    return NextResponse.json({
      success: true,
      data: {
        active: activeSlot
          ? {
              id: activeSlot.id,
              courseId: activeSlot.course.id,
              courseCode: activeSlot.course.code,
              courseName: activeSlot.course.name,
              sks: activeSlot.course.sks,
              prodiName: activeSlot.prodi.name,
              prodiCode: activeSlot.prodi.code,
              roomName: activeSlot.roomName,
              className: activeSlot.className,
              startTime: activeSlot.startTime,
              endTime: activeSlot.endTime,
            }
          : null,
        todaySchedules: todaySchedules.map((s) => ({
          id: s.id,
          courseId: s.course.id,
          courseCode: s.course.code,
          courseName: s.course.name,
          sks: s.course.sks,
          prodiName: s.prodi.name,
          roomName: s.roomName,
          className: s.className,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: activeSlot?.id === s.id,
        })),
        allCourses: uniqueCourses.map((c) => ({ id: c.id, code: c.code, name: c.name, sks: c.sks })),
        semester: activeSemester,
        currentTime,
        day: today,
      },
    })
  } catch (error) {
    console.error("Smart match error:", error)
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add app/api/schedules/smart-match/route.ts
rtk git commit -m "feat: add smart-match schedule API"
```

---

### Task 4: Create scan page (mobile-first)

**Files:**
- Create: `app/(dashboard)/scan/page.tsx`
- Create: `app/(dashboard)/scan/scan-client.tsx`

- [ ] **Step 1: Create scan landing page**

```typescript
// app/(dashboard)/scan/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ScanClient } from "./scan-client"

export default async function ScanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/scan")

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      <ScanClient userName={session.user.name || ""} role={session.user.role || ""} />
    </div>
  )
}
```

- [ ] **Step 2: Create scan client component**

```typescript
// app/(dashboard)/scan/scan-client.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Clock, MapPin, BookOpen, Calendar, Play, Loader2, GraduationCap } from "lucide-react"

interface Props {
  userName: string
  role: string
}

interface SlotData {
  id: string
  courseId: string
  courseCode: string
  courseName: string
  sks: number
  prodiName: string
  roomName: string
  className: string
  startTime: string
  endTime: string
  isActive?: boolean
}

interface MatchData {
  active: SlotData | null
  todaySchedules: SlotData[]
  allCourses: Array<{ id: string; code: string; name: string; sks: number }>
  semester: { id: string; name: string; year: string } | null
  currentTime: string
  day: string
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 10) return "Selamat Pagi"
  if (h < 15) return "Selamat Siang"
  if (h < 18) return "Selamat Sore"
  return "Selamat Malam"
}

export function ScanClient({ userName, role }: Props) {
  const router = useRouter()
  const [data, setData] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState("")

  useEffect(() => {
    fetch("/api/schedules/smart-match")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function startSession(courseId?: string) {
    const id = courseId || selectedCourse
    if (id) {
      router.push(`/dashboard/dosen/courses/${id}/sessions/new`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (role !== "DOSEN") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Halaman Dosen</h1>
        <p className="text-muted-foreground mb-6">Halaman ini khusus untuk dosen. Silakan login dengan akun dosen.</p>
        <Button onClick={() => router.push("/dashboard")}>Dashboard</Button>
      </div>
    )
  }

  const active = data?.active

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {getGreeting()}
        </h1>
        <p className="text-muted-foreground">{userName}</p>
        {data?.semester && (
          <p className="text-xs text-muted-foreground mt-1">
            {data.semester.name} {data.semester.year} · {data.day}
          </p>
        )}
      </div>

      {/* Active session card */}
      {active ? (
        <Card className="border-l-4 border-l-primary shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              {active.startTime} - {active.endTime}
            </div>
            <CardTitle className="text-lg">{active.courseName}</CardTitle>
            <CardDescription>
              {active.courseCode} · {active.sks} SKS · {active.prodiName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {active.roomName} · Kelas {active.className}
            </div>
            <Button
              className="w-full text-base h-12"
              onClick={() => startSession(active.courseId)}
            >
              <Play className="h-5 w-5 mr-2" />
              Mulai Sesi Sekarang
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <p>Tidak ada jadwal perkuliahan aktif saat ini</p>
          </CardContent>
        </Card>
      )}

      {/* Today's schedule */}
      {data?.todaySchedules && data.todaySchedules.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Jadwal Hari Ini</h2>
          {data.todaySchedules.map((slot) => (
            <Card
              key={slot.id}
              className={`cursor-pointer hover:bg-accent transition-colors ${
                slot.isActive ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => startSession(slot.courseId)}
            >
              <CardContent className="py-3 flex items-center gap-3">
                <div className="text-sm font-medium text-muted-foreground w-16 shrink-0">
                  {slot.startTime}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{slot.courseName}</p>
                  <p className="text-xs text-muted-foreground">
                    {slot.roomName} · {slot.className}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Play className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Other courses dropdown */}
      {data?.allCourses && data.allCourses.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h2 className="text-sm font-medium text-muted-foreground">Atau pilih MK lain</h2>
          <div className="flex gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih mata kuliah..." />
              </SelectTrigger>
              <SelectContent>
                {data.allCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={!selectedCourse}
              onClick={() => startSession()}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard/dosen")}>
          Dashboard
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard/dosen/courses")}>
          Semua Sesi
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add app/\(dashboard\)/scan/
rtk git commit -m "feat: add scan page with smart matching"
```

---

### Task 5: Add scan link to dosen sidebar

**Files:**
- Modify: `app/(dashboard)/layout-client.tsx`

- [ ] **Step 1: Add scan nav item**

Find the DOSEN navigation items section and add:

```typescript
{ role === "DOSEN" && (
  <>
    {/* ... existing items ... */}
    <NavItem href="/scan" icon={QrCode} label="Scan" />
  </>
)}
```

Add `QrCode` to the lucide-react import.

- [ ] **Step 2: Commit**

```bash
rtk git add app/\(dashboard\)/layout-client.tsx
rtk git commit -m "feat: add scan link to dosen sidebar"
```

---

### Task 6: Create admin QR generator page

**Files:**
- Create: `app/(dashboard)/dashboard/admin/qr/page.tsx`

- [ ] **Step 1: Install qrcode package**

```bash
rtk npm install qrcode --legacy-peer-deps 2>&1
```

- [ ] **Step 2: Create QR generator page**

```typescript
// app/(dashboard)/dashboard/admin/qr/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { QrGeneratorClient } from "./qr-client"

export default async function QrPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">QR Code Scan Perkuliahan</h1>
        <p className="text-muted-foreground">Generate dan cetak QR Code untuk ditempel di kelas</p>
      </div>
      <QrGeneratorClient scanUrl={`${baseUrl}/scan`} />
    </div>
  )
}
```

```typescript
// app/(dashboard)/dashboard/admin/qr/qr-client.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, Download } from "lucide-react"

interface Props {
  scanUrl: string
}

export function QrGeneratorClient({ scanUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState("")

  useEffect(() => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(scanUrl, {
        width: 400,
        margin: 2,
        color: { dark: "#1e293b", light: "#ffffff" },
      }).then(setQrDataUrl)
    })
  }, [scanUrl])

  function handlePrint() {
    const win = window.open("")
    if (!win) return
    win.document.write(`
      <html>
      <head><title>QR Code e-Kendali Dosen</title></head>
      <body style="text-align:center;padding:40px;font-family:sans-serif;">
        <h2>🎓 e-Kendali Dosen</h2>
        <p style="color:#666;margin-bottom:24px;">Scan untuk mencatat perkuliahan hari ini</p>
        <img src="${qrDataUrl}" style="width:300px;height:300px;" />
        <p style="color:#999;font-size:12px;margin-top:24px;">${scanUrl}</p>
        <script>window.print();<\/script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="max-w-md space-y-6">
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          {qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="QR Code Scan" className="w-48 h-48 mx-auto" />
              <p className="text-sm text-muted-foreground break-all">{scanUrl}</p>
            </>
          ) : (
            <div className="w-48 h-48 mx-auto bg-muted animate-pulse rounded" />
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Cetak Poster
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <a href={qrDataUrl} download="qr-e-kendali.png">
            <Download className="h-4 w-4 mr-2" /> Download PNG
          </a>
        </Button>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="py-4 text-sm text-muted-foreground space-y-1">
          <p>📌 Tempel QR ini di setiap ruang kelas.</p>
          <p>📱 Dosen scan → langsung ke form sesi hari ini.</p>
          <p>🔄 Satu QR untuk semua dosen dan semua kelas.</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add app/\(dashboard\)/dashboard/admin/qr/
rtk git commit -m "feat: add admin QR code generator page"
```

---

### Task 7: TypeScript check + final commit

- [ ] **Step 1: Run TypeScript check**

```bash
rtk npx tsc --noEmit 2>&1
```

- [ ] **Step 2: Fix any errors**

- [ ] **Step 3: Final commit**

```bash
rtk git add -A
rtk git commit -m "chore: final fixes after QR scan implementation"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| ScheduleSlot model + migration | Task 1 |
| Schedule parsing + saving on import | Task 2 |
| Smart match API (dosen + hari + jam) | Task 3 |
| Scan page (mobile-first) | Task 4 |
| Scan link in sidebar | Task 5 |
| Admin QR generator page | Task 6 |
| TypeScript check | Task 7 |
