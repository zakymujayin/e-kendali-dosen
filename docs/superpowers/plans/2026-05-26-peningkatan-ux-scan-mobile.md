# Peningkatan UX Scan & Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperpendek alur scan QR dengan dual-path (Mulai Cepat + Isi Detail), menambah bottom tab bar mobile, PWA support, dan Redis caching smart-match API.

**Architecture:** Aditif — semua fitur existing utuh. Tambahan: API quick-start, form 1-halaman, bottom tab bar, PWA manifest + sw, Redis cache layer di smart-match API.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma, Tailwind v4, ioredis, Lucide React

---

### Task 0a: Quick Fix — Tambah AUTH_SECRET ke .env

**Files:**
- Modify: `.env`

- [ ] **Step 1: Tambah AUTH_SECRET**

```
DATABASE_URL="postgresql://zhev:password@localhost:5432/buku_kendali_dosen"
AUTH_SECRET="RJ61uSh2qQXIwv9KEBnLhZIXhpUznJwcFMzdfK6oybg="
NEXTAUTH_SECRET="RJ61uSh2qQXIwv9KEBnLhZIXhpUznJwcFMzdfK6oybg="
NEXTAUTH_URL="http://localhost:3002"
REDIS_URL="redis://localhost:6379"
```

- [ ] **Step 2: Bersihkan cache & restart**

Run: `rm -rf .next && npm run dev`
Expected: Tidak ada JWT decryption error saat login

---

### Task 0b: Quick Fix — Tambah QR Scan di ADMIN Sidebar Menu

**Files:**
- Modify: `app/(dashboard)/layout-client.tsx:61`

- [ ] **Step 1: Tambah item QR Scan di roleMenus ADMIN**

Di array `roleMenus.ADMIN`, setelah item "Laporan" (baris 61), tambahkan:

```tsx
{ label: "QR Scan", href: "/dashboard/admin/qr", icon: QrCode },
```

Pastikan `QrCode` sudah di-import dari `lucide-react` (di baris 20-an).

- [ ] **Step 2: Verifikasi**

Buka app sebagai admin → sidebar menampilkan menu "QR Scan"
Klik menu → navigasi ke `/dashboard/admin/qr`

---

### Task 1: Redis Client Wrapper

**Files:**
- Create: `lib/redis.ts`

- [ ] **Step 1: Install ioredis**

Run: `npm install ioredis`

- [ ] **Step 2: Buat lib/redis.ts**

```typescript
import Redis from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

let redis: Redis | null = null

function getClient(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 })
    redis.on("error", (err) => {
      console.warn("Redis connection error (non-fatal):", err.message)
    })
  }
  return redis
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await getClient().get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getClient().set(key, JSON.stringify(value), "EX", ttlSeconds)
  } catch {
    // cache failure is non-fatal
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  try {
    const keys = await getClient().keys(pattern)
    if (keys.length > 0) {
      await getClient().del(...keys)
    }
  } catch {
    // cache failure is non-fatal
  }
}

export function ttlUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(23, 59, 59, 999)
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000)
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/redis.ts package.json package-lock.json
git commit -m "feat: add Redis client wrapper with cache helpers"
```

---

### Task 2: Quick Start API

**Files:**
- Create: `app/api/sessions/quick-start/route.ts`

- [ ] **Step 1: Buat route handler**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unauthorized, errorResponse } from "@/lib/api"
import { cacheDel } from "@/lib/redis"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  scheduleSlotId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return errorResponse("Invalid input")

    const { scheduleSlotId } = parsed.data

    const slot = await prisma.scheduleSlot.findUnique({
      where: { id: scheduleSlotId },
      include: { course: true },
    })
    if (!slot || slot.userId !== session.user.id) {
      return errorResponse("Schedule slot not found")
    }

    const teachingLoad = await prisma.teachingLoad.findFirst({
      where: {
        userId: session.user.id,
        courseId: slot.courseId,
        semesterId: slot.semesterId,
      },
    })
    if (!teachingLoad) {
      return errorResponse("Teaching load not found")
    }

    const latestSessions = await prisma.lectureSession.findMany({
      where: { teachingLoadId: teachingLoad.id },
      orderBy: { meetingNumber: "desc" },
      take: 1,
    })
    const nextMeeting = (latestSessions[0]?.meetingNumber ?? 0) + 1

    const newSession = await prisma.lectureSession.create({
      data: {
        teachingLoadId: teachingLoad.id,
        meetingNumber: nextMeeting,
        date: new Date(),
        startTime: slot.startTime,
        endTime: slot.endTime,
        topic: slot.course.name,
        method: "TATAP_MUKA",
        status: "DRAFT",
      },
    })

    try {
      await cacheDel(`schedule:${session.user.id}:*`)
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      success: true,
      data: { sessionId: newSession.id, courseId: slot.courseId },
    })
  } catch (error) {
    console.error("Quick start error:", error)
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/sessions/quick-start/route.ts
git commit -m "feat: add quick-start API for auto-creating DRAFT session"
```

---

### Task 3: Bottom Tab Bar Component

**Files:**
- Create: `components/ui/bottom-tab-bar.tsx`

- [ ] **Step 1: Buat komponen**

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { QrCode, LayoutDashboard, BookOpen } from "lucide-react"

const tabs = [
  { label: "Scan", href: "/scan", icon: QrCode },
  { label: "Beranda", href: "/dashboard/dosen", icon: LayoutDashboard },
  { label: "MK Saya", href: "/dashboard/dosen/courses", icon: BookOpen },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t bg-background lg:hidden">
      <div className="mx-auto flex h-full max-w-lg items-center">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && <span className="h-1 w-1 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/bottom-tab-bar.tsx
git commit -m "feat: add bottom tab bar component for mobile navigation"
```

---

### Task 4: Quick Start Form (1-Halaman)

**Files:**
- Create: `components/dosen/quick-start-form.tsx`

- [ ] **Step 1: Buat komponen form 1-halaman**

```typescript
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Globe, Crosshair, Save } from "lucide-react"
import { METHOD_LABELS } from "@/lib/constants"
import { isValidUrl } from "@/lib/validators"

const LURING = ["TATAP_MUKA", "PRAKTIKUM", "SEMINAR", "FIELD_STUDY"]
const DARING = ["ZOOM", "GOOGLE_MEET", "MS_TEAMS", "LMS", "PLATFORM_LAIN"]

interface QuickStartFormProps {
  teachingLoadId: string
  courseId: string
  courseName: string
  defaultDate: string
  defaultStartTime: string
  defaultEndTime: string
}

export function QuickStartForm({
  teachingLoadId,
  courseId,
  courseName,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
}: QuickStartFormProps) {
  const router = useRouter()

  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [endTime, setEndTime] = useState(defaultEndTime)
  const [topic, setTopic] = useState(courseName)
  const [method, setMethod] = useState<string>("TATAP_MUKA")
  const [notes, setNotes] = useState("")
  const [platformUrl, setPlatformUrl] = useState("")
  const [publish, setPublish] = useState(false)

  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [gpsAcc, setGpsAcc] = useState<number | null>(null)
  const [campusLabel, setCampusLabel] = useState<string | null>(null)
  const [gpsDistance, setGpsDistance] = useState<number | null>(null)
  const [gpsValid, setGpsValid] = useState<boolean | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  const isDaring = DARING.includes(method)

  useEffect(() => {
    if (method === "TATAP_MUKA" || method === "PRAKTIKUM" || method === "SEMINAR" || method === "FIELD_STUDY") {
      detectGps()
    }
  }, [method])

  function detectGps() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setLat(latitude)
        setLng(longitude)
        setGpsAcc(accuracy)
        try {
          const res = await fetch("/api/campus/validate-gps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
          })
          if (res.ok) {
            const j = await res.json()
            if (j.data) {
              setCampusLabel(j.data.label ?? null)
              setGpsDistance(j.data.distance ?? null)
              setGpsValid(j.data.distance !== null && j.data.distance <= (j.data.radiusMeters ?? 300))
            }
          }
        } catch {
          // validation failure non-fatal
        }
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  async function handleSubmit() {
    if (!date || !startTime || !endTime || !topic || !method) {
      toast.error("Lengkapi semua field wajib")
      return
    }
    if (isDaring && platformUrl && !isValidUrl(platformUrl)) {
      toast.error("URL platform tidak valid")
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        teachingLoadId,
        meetingNumber: 1,
        date: new Date(date),
        startTime,
        endTime,
        topic,
        method,
        notes: notes || null,
        isDaring,
      }

      if (isDaring && platformUrl) {
        body.platformUrl = platformUrl
      }

      if (lat != null && lng != null) {
        body.latitude = lat
        body.longitude = lng
        body.gpsAccuracy = gpsAcc
        body.distanceMeters = gpsDistance
        body.isGpsValid = gpsValid
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!json.success) {
        toast.error(json.message || "Gagal menyimpan")
        setSubmitting(false)
        return
      }

      const sessionId = json.data.id

      if (publish) {
        await fetch(`/api/sessions/${sessionId}/publish`, { method: "POST" })
      }

      toast.success("Sesi berhasil dibuat")
      router.push(`/dashboard/dosen/courses/${courseId}/sessions/${sessionId}`)
    } catch {
      toast.error("Gagal menyimpan sesi")
    } finally {
      setSubmitting(false)
    }
  }

  const luringGreen = method !== "" && !isDaring ? "ring-2 ring-green-500 bg-green-50" : ""
  const daringPurple = method !== "" && isDaring ? "ring-2 ring-purple-500 bg-purple-50" : ""

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Sesi Baru</h1>
        <p className="text-sm text-muted-foreground">{courseName}</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jam Mulai</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Jam Selesai</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Topik</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topik perkuliahan" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`grid grid-cols-2 gap-2 rounded-lg p-3 ${luringGreen}`}>
            {LURING.map((m) => (
              <Button
                key={m}
                type="button"
                variant={method === m ? "default" : "outline"}
                className={`h-10 ${method === m ? "bg-green-600 hover:bg-green-700" : ""}`}
                onClick={() => setMethod(m)}
              >
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-xs">{METHOD_LABELS[m as keyof typeof METHOD_LABELS] || m}</span>
              </Button>
            ))}
          </div>

          <div className={`grid grid-cols-2 gap-2 rounded-lg p-3 ${daringPurple}`}>
            {DARING.map((m) => (
              <Button
                key={m}
                type="button"
                variant={method === m ? "default" : "outline"}
                className={`h-10 ${method === m ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                onClick={() => setMethod(m)}
              >
                <Globe className="h-4 w-4 mr-1" />
                <span className="text-xs">{METHOD_LABELS[m as keyof typeof METHOD_LABELS] || m}</span>
              </Button>
            ))}
          </div>

          {isDaring && (
            <div className="space-y-2 pt-2">
              <Label>URL Platform</Label>
              <Input
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx"
              />
            </div>
          )}

          {!isDaring && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
              <Crosshair className="h-4 w-4" />
              {gpsLoading ? (
                "Mendeteksi lokasi..."
              ) : gpsValid ? (
                <span className="text-green-600">
                  Terdeteksi: {campusLabel ?? "Kampus"} ({gpsDistance}m)
                </span>
              ) : lat ? (
                <span className="text-amber-600">Di luar area kampus ({gpsDistance}m)</span>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={detectGps}>
                  Deteksi lokasi
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan perkuliahan (opsional)"
              rows={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="rounded border-input"
            />
            Publish setelah simpan
          </label>
        </CardContent>
      </Card>

      <Button className="w-full h-12 text-base" onClick={handleSubmit} disabled={submitting}>
        <Save className="h-5 w-5 mr-2" />
        {submitting ? "Menyimpan..." : "Simpan Sesi"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dosen/quick-start-form.tsx
git commit -m "feat: add 1-page quick-start form as alternative to 3-step wizard"
```

---

### Task 5: PWA — Manifest, Icons, Service Worker

**Files:**
- Create: `public/manifest.json`
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Create: `public/sw.js`

- [ ] **Step 1: Buat manifest.json**

```json
{
  "name": "e-Kendali Dosen",
  "short_name": "eKendali",
  "description": "Buku Kendali Dosen Elektronik",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Buat icon placeholder menggunakan script**

Run:
```bash
# Buat SVG icon sederhana (kotak biru dengan teks "eK")
cat > /tmp/icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#2563eb"/>
  <text x="256" y="320" text-anchor="middle" fill="white" font-size="280" font-family="Arial" font-weight="bold">eK</text>
</svg>
EOF

# Convert ke PNG jika ada imagemagick/rsvg, atau gunakan file SVG langsung
# Jika imagemagick tersedia:
which convert && convert -resize 192x192 /tmp/icon.svg public/icon-192.png && convert -resize 512x512 /tmp/icon.svg public/icon-512.png
```

Jika imagemagick tidak tersedia, gunakan script Node.js:

```bash
node -e "
const { createCanvas } = require('canvas');
// Jika canvas tidak tersedia, skip — gunakan SVG langsung di manifest
console.log('Canvas not available, using SVG fallback');
"
```

Fallback: gunakan PNG solid sederhana. Buat file `public/icon-192.png` dan `public/icon-512.png` secara manual atau dengan tool online.

- [ ] **Step 3: Buat service worker**

```javascript
const CACHE = "ekendali-v1"
const URLS = ["/", "/dashboard", "/scan", "/login"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(URLS))
  )
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  )
})
```

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json public/icon-192.png public/icon-512.png public/sw.js
git commit -m "feat: add PWA manifest, icons, and service worker"
```

---

### Task 6: Scan Client — Dual Path + Fix Query Params

**Files:**
- Modify: `app/(dashboard)/scan/scan-client.tsx`

- [ ] **Step 1: Restruktur scan-client.tsx**

Baca file saat ini, lalu ganti seluruh konten dengan versi di bawah. Perubahan utama:
- Ganti `startSession` dengan `quickStart` + `handleDetailStart`
- Card aktif punya dua tombol (Mulai Cepat + Isi Detail)
- 3 empty states (aktif, tidak sekarang, tidak ada sama sekali)
- Import tambahan: `Rocket`, `Pencil`

```typescript
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Clock, MapPin, BookOpen, Calendar, Play, Loader2, GraduationCap, Rocket, Pencil } from "lucide-react"
import { toast } from "sonner"

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
  prodiCode: string
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

function formatDate(): string {
  return new Date().toISOString().split("T")[0]
}

export function ScanClient({ userName, role }: Props) {
  const router = useRouter()
  const [data, setData] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState("")
  const [quickStarting, setQuickStarting] = useState(false)

  useEffect(() => {
    fetch("/api/schedules/smart-match")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function quickStart(slotId: string, courseId: string) {
    setQuickStarting(true)
    try {
      const res = await fetch("/api/sessions/quick-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleSlotId: slotId }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Sesi dimulai")
        router.push(`/dashboard/dosen/courses/${courseId}/sessions/${json.data.sessionId}`)
      } else {
        toast.error(json.message || "Gagal memulai sesi")
      }
    } catch {
      toast.error("Gagal memulai sesi")
    } finally {
      setQuickStarting(false)
    }
  }

  function detailStart(slot: SlotData) {
    const today = formatDate()
    router.push(
      `/dashboard/dosen/courses/${slot.courseId}/sessions/new?scheduleSlotId=${slot.id}&date=${today}&startTime=${slot.startTime}&endTime=${slot.endTime}`
    )
  }

  function startManual(courseId?: string) {
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

  const hasAnyScheduleToday = (data?.todaySchedules?.length ?? 0) > 0
  const nextSchedule = data?.todaySchedules?.find((s) => !s.isActive)

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
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

      {data?.active ? (
        <Card className="border-l-4 border-l-primary shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              {data.active.startTime} - {data.active.endTime}
            </div>
            <CardTitle className="text-lg">{data.active.courseName}</CardTitle>
            <CardDescription>
              {data.active.courseCode} · {data.active.sks} SKS · {data.active.prodiName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {data.active.roomName} · Kelas {data.active.className}
            </div>
            <Button
              className="w-full text-base h-12"
              onClick={() => quickStart(data.active!.id, data.active!.courseId)}
              disabled={quickStarting}
            >
              <Rocket className="h-5 w-5 mr-2" />
              {quickStarting ? "Memulai..." : "Mulai Cepat"}
            </Button>
            <Button
              variant="outline"
              className="w-full text-base h-11"
              onClick={() => detailStart(data.active!)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Isi Detail (absensi, dll)
            </Button>
          </CardContent>
        </Card>
      ) : hasAnyScheduleToday ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Tidak ada jadwal perkuliahan aktif saat ini</p>
            {nextSchedule && (
              <p className="text-sm text-muted-foreground mt-1">
                Berikutnya: {nextSchedule.startTime} - {nextSchedule.courseName}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <p>Tidak ada jadwal hari ini</p>
            <p className="text-xs mt-1">Hubungi admin untuk import jadwal semester Anda</p>
          </CardContent>
        </Card>
      )}

      {hasAnyScheduleToday && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Jadwal Hari Ini</h2>
          {data!.todaySchedules.map((slot) => (
            <Card
              key={slot.id}
              className={`cursor-pointer hover:bg-accent transition-colors ${slot.isActive ? "ring-2 ring-primary" : ""}`}
              onClick={() => detailStart(slot)}
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
              onClick={() => startManual()}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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

- [ ] **Step 2: Hapus file lama jika tidak digunakan**

File `scan-client.tsx` sudah di-overwrite dengan konten baru.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/scan/scan-client.tsx
git commit -m "feat: dual-path scan page with quick-start and detail buttons"
```

---

### Task 7: Layout Client — Bottom Tab + Sidebar Cleanup

**Files:**
- Modify: `app/(dashboard)/layout-client.tsx`

- [ ] **Step 1: Tambah import BottomTabBar**

Di bagian atas file, setelah import-import yang ada, tambahkan:

```typescript
import { BottomTabBar } from "@/components/ui/bottom-tab-bar"
```

- [ ] **Step 2: Ubah main wrapper tambah padding mobile**

Cari tag `<main` di dalam component. Tambahkan class `pb-20 lg:pb-0`:

```tsx
<main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
```

Letak persis tag `<main>` perlu dicek dari file actual. Cari dengan pattern `className="flex-1` atau `main`.

- [ ] **Step 3: Tambah BottomTabBar sebelum penutup div terluar**

Di akhir component, sebelum `</div>` penutup terakhir (sekitar baris 340), tambahkan:

```tsx
<BottomTabBar />
```

- [ ] **Step 4: Verifikasi tsc**

Run: `npx tsc --noEmit`
Expected: No errors related to layout-client

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/layout-client.tsx
git commit -m "feat: integrate bottom tab bar into dashboard layout"
```

---

### Task 8: Root Layout — PWA Meta Tags via Next.js Metadata

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Tambah PWA config ke metadata Next.js**

Ganti `metadata` dan `viewport` export di `app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { SkipLink } from "@/components/ui/skip-link"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "e-Kendali Dosen",
  description: "Sistem pencatatan realisasi perkuliahan berbasis web",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "eKendali",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>",
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
}

// RootLayout body tidak berubah
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add PWA meta tags to root layout"
```

---

### Task 9: Smart Match API — Redis Caching

**Files:**
- Modify: `app/api/schedules/smart-match/route.ts`

- [ ] **Step 1: Tambah Redis caching**

Modifikasi fungsi GET untuk menambah cache layer. Ganti bagian awal fungsi:

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unauthorized } from "@/lib/api"
import { cacheGet, cacheSet, ttlUntilMidnight } from "@/lib/redis"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const now = new Date()
    const days = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"]
    const today = days[now.getDay()]
    const currentTime = `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`

    const cacheKey = `schedule:${session.user.id}:${today}`

    const cached = await cacheGet<{
      active: unknown
      todaySchedules: unknown[]
      allCourses: unknown[]
      semester: unknown
      currentTime: string
      day: string
    }>(cacheKey)

    if (cached) {
      return NextResponse.json({ success: true, data: cached })
    }

    // ... existing code from activeSemester query to the final return ...
    // (semua kode existing di antara cache check dan return tetap sama)

    // Di akhir, sebelum return NextResponse.json, simpan ke cache:
    const responseData = { active, todaySchedules, allCourses, semester, currentTime, day }
    const ttl = ttlUntilMidnight()
    await cacheSet(cacheKey, responseData, ttl)

    // NOTE: struktur return harus diubah — gunakan responseData
    // Ganti return yang ada dengan:
    return NextResponse.json({ success: true, data: responseData })
  } catch (error) {
    console.error("Smart match error:", error)
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}
```

**Penting:** Struktur kode harus diadaptasi ke format existing. Approach-nya:
1. Setelah `prisma.scheduleSlot.findMany(...)` dan mapping `mapSlot` — simpan hasil ke `responseData`
2. Sebelum return, `cacheSet(cacheKey, responseData, ttl)`
3. Return `responseData`

- [ ] **Step 2: Commit**

```bash
git add app/api/schedules/smart-match/route.ts
git commit -m "feat: add Redis caching to smart-match API"
```

---

### Task 10: Sessions/New Page — Support Quick Start Form

**Files:**
- Modify: `app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/new/page.tsx`

- [ ] **Step 1: Tambah dukungan quick-start form**

Modifikasi page untuk mendeteksi `scheduleSlotId` query param dan render `QuickStartForm`:

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SessionForm } from "@/components/dosen/session-form"
import { QuickStartForm } from "@/components/dosen/quick-start-form"

export default async function NewSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ date?: string; startTime?: string; endTime?: string; scheduleSlotId?: string }>
}) {
  const { courseId } = await params
  const { date: defaultDate, startTime: defaultStartTime, endTime: defaultEndTime, scheduleSlotId } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const teachingLoad = await prisma.teachingLoad.findFirst({
    where: { courseId, userId: session.user.id },
    include: { course: true },
  })
  if (!teachingLoad) redirect("/dashboard/dosen/courses")

  if (scheduleSlotId && defaultDate && defaultStartTime && defaultEndTime) {
    return (
      <QuickStartForm
        teachingLoadId={teachingLoad.id}
        courseId={courseId}
        courseName={teachingLoad.course.name}
        defaultDate={defaultDate}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
      />
    )
  }

  return (
    <SessionForm
      teachingLoadId={teachingLoad.id}
      courseId={courseId}
      courseName={teachingLoad.course.name}
      courseTotalMeeting={teachingLoad.course.totalMeeting}
      defaultDate={defaultDate}
      defaultStartTime={defaultStartTime}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/new/page.tsx"
git commit -m "feat: support quick-start form in sessions/new page via scheduleSlotId param"
```

---

## Verification

- [ ] Menu QR Scan muncul di sidebar Admin
- [ ] Dosen scan QR → halaman scan tampil kartu aktif dengan 2 tombol
- [ ] Tap "Mulai Cepat" → session DRAFT terbuat, redirect ke detail session
- [ ] Tap "Isi Detail" → form 1-halaman pre-filled dengan date/time dari jadwal
- [ ] Bottom tab bar muncul di viewport <1024px
- [ ] Bottom tab bar TIDAK muncul di viewport ≥1024px
- [ ] Sidebar tetap berfungsi normal di desktop
- [ ] Smart-match API return dari cache (<10ms) setelah request pertama
- [ ] `manifest.json` bisa diakses via `/manifest.json`
- [ ] Aplikasi bisa di-install (Chrome Android: Add to Home Screen)
- [ ] Fitur existing tidak rusak: session CRUD, BAP, laporan BKD
- [ ] `npx tsc --noEmit` tidak ada error
