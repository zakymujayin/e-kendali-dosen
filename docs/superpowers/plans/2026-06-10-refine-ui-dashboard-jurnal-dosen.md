# UI/UX Refine — Dashboard Dosen & Pengisian Jurnal Mengajar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine dashboard dosen dan alur pengisian jurnal menjadi satu pengalaman yang bersih, lapang, dan konsisten di HP maupun desktop, tetap memakai komponen dan token shadcn/ui.

**Architecture:** Tambah komponen `Sheet` (slide-over berbasis DialogPrimitive) dan `SessionFormFields` (shared form fields). `DaftarHadirTable` diganti menjadi overview grid + Sheet editor. `SessionForm` (wizard) diganti menjadi satu form bersih menggunakan `SessionFormFields` yang sama. Dashboard dosen diganti dari div/gradient hardcoded ke Card/token shadcn.

**Tech Stack:** Next.js App Router, TypeScript, shadcn/ui (Card, Badge, Progress, Alert, Sheet baru), Radix UI Dialog (sudah terpasang), Tailwind CSS 4, Prisma, Sonner toast.

---

## File Structure

| File | Aksi | Tanggung jawab |
|---|---|---|
| `components/ui/sheet.tsx` | **Buat** | Komponen Sheet generik (kanan/bawah) berbasis @radix-ui/react-dialog |
| `components/dosen/session-form-fields.tsx` | **Buat** | Shared form fields jurnal: date, time, topic, method, GPS/URL, hadir/absen |
| `app/(dashboard)/dashboard/dosen/page.tsx` | **Modifikasi** | Ganti gradient+div ke Card+token shadcn, tambah alert today+draft |
| `components/dosen/daftar-hadir-table.tsx` | **Modifikasi** | Ganti split-view ke overview grid + Sheet editor pakai SessionFormFields |
| `app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx` | **Modifikasi** | Update `initialPertemuan` map — pakai method code & startTime/endTime terpisah |
| `components/dosen/session-form.tsx` | **Modifikasi** | Ganti wizard 3-langkah ke form tunggal memakai SessionFormFields |

---

## Task 1: Buat komponen `Sheet`

**Files:**
- Create: `components/ui/sheet.tsx`

- [ ] **Step 1: Tulis file `components/ui/sheet.tsx`**

```tsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = "SheetOverlay"

const sheetVariants = cva(
  "fixed z-50 bg-background shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 overflow-y-auto",
  {
    variants: {
      side: {
        right: [
          "inset-y-0 right-0 h-full w-full sm:max-w-md border-l",
          "data-[state=closed]:animate-out data-[state=open]:animate-in",
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        ].join(" "),
        bottom: [
          "inset-x-0 bottom-0 max-h-[90vh] border-t rounded-t-xl",
          "data-[state=closed]:animate-out data-[state=open]:animate-in",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        ].join(" "),
      },
    },
    defaultVariants: { side: "right" },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Tutup</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)} {...props} />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky bottom-0 bg-background border-t p-4 flex flex-col gap-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
```

- [ ] **Step 2: Cek TypeScript**

```bash
cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit 2>&1 | head -30
```

Expected: tidak ada error baru terkait `sheet.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/sheet.tsx
git commit -m "feat: add Sheet component (slide-over, built on Radix Dialog)"
```

---

## Task 2: Buat komponen `SessionFormFields`

**Files:**
- Create: `components/dosen/session-form-fields.tsx`

`SessionFormFields` adalah controlled component. Parent mengelola semua nilai (`SessionFieldValues`). Komponen ini merender field, menangani GPS detection (memanggil onChange dengan hasil lat/lng/distance/valid), dan menampilkan kuota daring secara lokal.

- [ ] **Step 1: Tulis file `components/dosen/session-form-fields.tsx`**

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { HelpTip } from "@/components/ui/help-tip"
import { MapPin, Crosshair, Globe, Wifi, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import {
  METHOD_LABELS,
  MAX_DARING,
  LURING_METHODS,
  DARING_METHODS,
  isDaringMethod,
} from "@/lib/constants"
import { isValidUrl } from "@/lib/validators"

export interface SessionFieldValues {
  date: string
  startTime: string
  endTime: string
  topic: string
  method: string
  studentPresent: number
  studentAbsent: number
  platformUrl: string
  notes: string
  latitude: string
  longitude: string
  gpsAccuracy: string
  gpsDistance: number | null
  gpsValid: boolean | null
}

export const defaultSessionFieldValues: SessionFieldValues = {
  date: new Date().toISOString().split("T")[0],
  startTime: "",
  endTime: "",
  topic: "",
  method: "",
  studentPresent: 0,
  studentAbsent: 0,
  platformUrl: "",
  notes: "",
  latitude: "",
  longitude: "",
  gpsAccuracy: "",
  gpsDistance: null,
  gpsValid: null,
}

interface SessionFormFieldsProps {
  values: SessionFieldValues
  onChange: (patch: Partial<SessionFieldValues>) => void
  teachingLoadId: string
}

export function SessionFormFields({
  values,
  onChange,
  teachingLoadId,
}: SessionFormFieldsProps) {
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "valid" | "invalid" | "error">("idle")
  const [daringQuota, setDaringQuota] = useState<{ used: number; remaining: number; isAvailable: boolean } | null>(null)
  const [urlError, setUrlError] = useState("")

  const isDaring = isDaringMethod(values.method)
  const totalStudents = values.studentPresent + values.studentAbsent

  useEffect(() => {
    if (values.gpsValid === true) setGpsStatus("valid")
    else if (values.gpsValid === false && values.latitude) setGpsStatus("invalid")
    else setGpsStatus("idle")
  }, [values.gpsValid, values.latitude])

  useEffect(() => {
    if (!isDaringMethod(values.method)) { setDaringQuota(null); return }
    fetch(`/api/teaching-loads/${teachingLoadId}/daring-quota`)
      .then(r => r.json())
      .then(json => { if (json.success) setDaringQuota(json.data) })
      .catch(() => {})
  }, [values.method, teachingLoadId])

  const handleUrlBlur = useCallback(() => {
    if (!values.platformUrl) { setUrlError(""); return }
    if (!isValidUrl(values.platformUrl)) setUrlError("URL tidak valid. Harus https://...")
    else setUrlError("")
  }, [values.platformUrl])

  function handleDetectGps() {
    if (!navigator.geolocation) { toast.error("GPS tidak didukung browser ini"); return }
    setGpsStatus("loading")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        const acc = pos.coords.accuracy?.toFixed(1) || ""
        try {
          const res = await fetch("/api/campus/validate-gps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: parseFloat(lat), longitude: parseFloat(lng) }),
          })
          const json = await res.json()
          if (json.success && json.data) {
            const { distanceMeters, isValid } = json.data
            onChange({ latitude: lat, longitude: lng, gpsAccuracy: acc, gpsDistance: Math.round(distanceMeters), gpsValid: isValid })
            setGpsStatus(isValid ? "valid" : "invalid")
          } else {
            onChange({ latitude: lat, longitude: lng, gpsAccuracy: acc, gpsDistance: null, gpsValid: false })
            setGpsStatus("error")
          }
        } catch {
          setGpsStatus("error")
          toast.error("Gagal validasi GPS")
        }
      },
      (err) => {
        setGpsStatus("error")
        toast.error(err.code === 1 ? "Akses GPS ditolak. Izinkan di browser." : "Gagal mendapatkan lokasi")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-5 p-6 pt-2">
      {/* Tanggal & Jam */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sf-date">Tanggal</Label>
          <Input
            id="sf-date"
            type="date"
            value={values.date}
            onChange={e => onChange({ date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-start">Jam Mulai</Label>
          <Input
            id="sf-start"
            type="time"
            value={values.startTime}
            onChange={e => onChange({ startTime: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-end">Jam Selesai</Label>
          <Input
            id="sf-end"
            type="time"
            value={values.endTime}
            onChange={e => onChange({ endTime: e.target.value })}
          />
        </div>
      </div>

      {/* Materi */}
      <div className="space-y-2">
        <Label htmlFor="sf-topic">Materi / Topik</Label>
        <Textarea
          id="sf-topic"
          rows={2}
          placeholder="Isi materi perkuliahan..."
          value={values.topic}
          onChange={e => onChange({ topic: e.target.value })}
        />
      </div>

      {/* Metode */}
      <fieldset className="space-y-3">
        <legend className="flex items-center gap-1 text-sm font-medium">
          Metode mengajar
          <HelpTip text="Luring = tatap muka di kelas. Daring = online (Zoom, Meet, dll.)" />
        </legend>

        {daringQuota && (
          <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
            daringQuota.remaining === 0 ? "bg-red-50 border-red-200 text-red-700" :
            daringQuota.remaining <= 1 ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
            "bg-blue-50 border-blue-200 text-blue-700"
          }`}>
            <Wifi className="h-4 w-4 shrink-0" />
            <span>Sisa kuota daring: {daringQuota.remaining}/{MAX_DARING}</span>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Luring</p>
          <div className="flex flex-wrap gap-2">
            {LURING_METHODS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => onChange({ method: m })}
                aria-pressed={values.method === m}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  values.method === m
                    ? "bg-green-100 border-green-500 text-green-800 font-medium"
                    : "bg-background border-input hover:bg-muted"
                }`}
              >
                {METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Daring</p>
          <div className="flex flex-wrap gap-2">
            {DARING_METHODS.map(m => {
              const disabled = m !== values.method && !!daringQuota && !daringQuota.isAvailable
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => !disabled && onChange({ method: m })}
                  disabled={disabled}
                  aria-pressed={values.method === m}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    values.method === m
                      ? "bg-purple-100 border-purple-500 text-purple-800 font-medium"
                      : disabled
                      ? "bg-muted border-input text-muted-foreground cursor-not-allowed"
                      : "bg-background border-input hover:bg-muted"
                  }`}
                >
                  {METHOD_LABELS[m]}
                </button>
              )
            })}
          </div>
        </div>
      </fieldset>

      {/* GPS — hanya luring */}
      {!isDaring && values.method && (
        <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-green-600" />
              Validasi GPS
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDetectGps}
              disabled={gpsStatus === "loading"}
            >
              {gpsStatus === "loading"
                ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Mendeteksi...</>
                : <><Crosshair className="h-3.5 w-3.5 mr-2" />Deteksi Lokasi</>
              }
            </Button>
          </div>
          {values.latitude && values.longitude && (
            <p className="text-xs text-muted-foreground">
              {values.latitude}, {values.longitude}{values.gpsAccuracy ? ` · akurasi ${values.gpsAccuracy}m` : ""}
            </p>
          )}
          {gpsStatus === "valid" && values.gpsDistance !== null && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Lokasi valid — {values.gpsDistance}m dari kampus ✓</AlertDescription>
            </Alert>
          )}
          {gpsStatus === "invalid" && values.gpsDistance !== null && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Di luar area kampus — {values.gpsDistance}m &gt; 300m ✗</AlertDescription>
            </Alert>
          )}
          {gpsStatus === "error" && (
            <p className="text-sm text-destructive">Gagal validasi GPS. Periksa izin lokasi dan coba lagi.</p>
          )}
        </div>
      )}

      {/* URL Platform — hanya daring */}
      {isDaring && values.method && (
        <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4 text-purple-600" />
            URL Platform
          </span>
          <Input
            type="url"
            value={values.platformUrl}
            onChange={e => onChange({ platformUrl: e.target.value })}
            onBlur={handleUrlBlur}
            placeholder="https://zoom.us/j/... atau https://meet.google.com/..."
            className={urlError ? "border-destructive" : ""}
          />
          {urlError && <p className="text-sm text-destructive">{urlError}</p>}
          {values.platformUrl && !urlError && isValidUrl(values.platformUrl) && (
            <p className="text-sm text-green-600">URL valid ✓</p>
          )}
        </div>
      )}

      {/* Kehadiran */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sf-present">Hadir</Label>
          <Input
            id="sf-present"
            type="number"
            min={0}
            value={values.studentPresent || ""}
            onChange={e => onChange({ studentPresent: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-absent">Tidak Hadir</Label>
          <Input
            id="sf-absent"
            type="number"
            min={0}
            value={values.studentAbsent || ""}
            onChange={e => onChange({ studentAbsent: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Total</Label>
          <div className="flex h-10 items-center px-3 rounded-md border bg-muted text-sm font-medium">
            {totalStudents}
          </div>
        </div>
      </div>

      {/* Catatan */}
      <div className="space-y-2">
        <Label htmlFor="sf-notes">Catatan (opsional)</Label>
        <Textarea
          id="sf-notes"
          rows={2}
          placeholder="Catatan tambahan..."
          value={values.notes}
          onChange={e => onChange({ notes: e.target.value })}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Cek TypeScript**

```bash
cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit 2>&1 | head -30
```

Expected: tidak ada error baru.

- [ ] **Step 3: Commit**

```bash
git add components/dosen/session-form-fields.tsx
git commit -m "feat: add SessionFormFields shared controlled form component"
```

---

## Task 3: Refine Dashboard Dosen

**Files:**
- Modify: `app/(dashboard)/dashboard/dosen/page.tsx`

Dashboard tetap server component. Tambah query `scheduleSlot` untuk today. Ganti div/gradient ke Card/token shadcn.

- [ ] **Step 1: Timpa `app/(dashboard)/dashboard/dosen/page.tsx`**

```tsx
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GraduationCap, Clock, CalendarDays, BookOpen } from "lucide-react"

const MK_COLORS = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-cyan-500", "bg-violet-500", "bg-teal-500", "bg-orange-500",
]

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

export default async function DosenDashboardPage() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  const teachingLoads = await prisma.teachingLoad.findMany({
    where: { userId },
    include: {
      course: true,
      semester: true,
      sessions: {
        where: { status: "PUBLISHED" },
        select: { id: true, meetingNumber: true, isDaring: true },
      },
    },
  })

  const draftCount = await prisma.lectureSession.count({
    where: { teachingLoad: { userId }, status: "DRAFT" },
  })

  const activeSemester = teachingLoads[0]?.semester
  const todayDayName = DAY_NAMES[new Date().getDay()]

  const todaySlots = activeSemester
    ? await prisma.scheduleSlot.findMany({
        where: { userId, semesterId: activeSemester.id, day: todayDayName },
        include: { course: true },
      })
    : []

  const totalPublished = teachingLoads.reduce((acc, tl) => acc + tl.sessions.length, 0)
  const totalTarget = teachingLoads.reduce((acc, tl) => acc + tl.course.totalMeeting, 0)
  const overallPct = totalTarget > 0 ? Math.round((totalPublished / totalTarget) * 100) : 0
  const semesterLabel = activeSemester ? `${activeSemester.name} ${activeSemester.year}` : ""

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Hero card */}
      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{session.user.name || "Dosen"}</h1>
              <p className="text-sm opacity-80">{semesterLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="text-center">
              <div className="text-2xl font-bold">{teachingLoads.length}</div>
              <div className="text-xs opacity-70 mt-0.5">MK Diampu</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalPublished}<span className="text-base opacity-70">/{totalTarget}</span></div>
              <div className="text-xs opacity-70 mt-0.5">Pertemuan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{draftCount}</div>
              <div className="text-xs opacity-70 mt-0.5">Draft</div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs opacity-70">
              <span>Progress semester</span>
              <span>{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2 bg-primary-foreground/20 [&>div]:bg-primary-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Alerts perlu perhatian */}
      {todaySlots.length > 0 && (
        <Alert className="border-yellow-300 bg-yellow-50 text-yellow-900">
          <CalendarDays className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Kelas hari ini:{" "}
              {todaySlots.map(s => s.course.name).join(", ")}
            </span>
            <Link
              href="/dashboard/dosen/courses"
              className="text-sm font-medium underline underline-offset-2 shrink-0"
            >
              Isi jurnal →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {draftCount > 0 && (
        <Alert className="border-orange-300 bg-orange-50 text-orange-900">
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{draftCount} sesi masih draft, belum dipublish.</span>
            <Link
              href="/dashboard/dosen/courses"
              className="text-sm font-medium underline underline-offset-2 shrink-0"
            >
              Lihat →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Grid MK */}
      {teachingLoads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <BookOpen className="h-8 w-8 opacity-40" />
            <p className="text-sm">Belum ada penugasan mata kuliah.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teachingLoads.map((tl, idx) => {
            const published = tl.sessions.length
            const total = tl.course.totalMeeting
            const pct = total > 0 ? Math.round((published / total) * 100) : 0
            const daringCount = tl.sessions.filter(s => s.isDaring).length
            const color = MK_COLORS[idx % MK_COLORS.length]

            return (
              <Link key={tl.id} href={`/dashboard/dosen/courses/${tl.course.id}`} className="group block">
                <Card className="overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className={`h-1.5 ${color}`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate">{tl.course.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tl.course.code} · {tl.course.sks} SKS</p>
                      </div>
                      <Badge variant={pct >= 100 ? "default" : "secondary"} className="shrink-0 text-xs">
                        {published}/{total}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{pct}%</span>
                        {daringCount > 0 && <span>Daring {daringCount}×</span>}
                      </div>
                      <Progress
                        value={pct}
                        className={`h-1.5 ${
                          pct >= 80 ? "[&>div]:bg-green-500" :
                          pct >= 50 ? "[&>div]:bg-yellow-500" :
                          "[&>div]:bg-red-500"
                        }`}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Cek TypeScript**

```bash
cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit 2>&1 | head -30
```

Expected: tidak ada error.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/dosen/page.tsx
git commit -m "feat: refine dosen dashboard — Card/token shadcn, today alert, draft alert"
```

---

## Task 4: Rewrite `DaftarHadirTable` + update `courses/[courseId]/page.tsx`

**Files:**
- Modify: `components/dosen/daftar-hadir-table.tsx`
- Modify: `app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx`

Perubahan utama:
1. Tipe `Pertemuan` diperbarui: `jam` string → `startTime`/`endTime` terpisah; `metode` display string → `method` code.
2. `courses/[courseId]/page.tsx`: update mapping `initialPertemuan` ke format baru.
3. `DaftarHadirTable`: ganti split-view ke overview grid + Sheet editor memakai `SessionFormFields`.

- [ ] **Step 1: Update mapping `initialPertemuan` di `courses/[courseId]/page.tsx`**

Buka `app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx`. Cari blok `const initialPertemuan = Array.from(...)` (baris 85–126) dan ganti seluruh blok itu dengan:

```tsx
  const initialPertemuan = Array.from({ length: load.course.totalMeeting }, (_, i) => {
    const n = i + 1
    const s = sessionMap.get(n)
    const j = jadwal[i]
    return s
      ? {
          no: n,
          tanggal: s.date.toISOString().split("T")[0],
          hari: "",
          startTime: s.startTime !== "00:00" ? s.startTime : "",
          endTime: s.endTime !== "00:00" ? s.endTime : "",
          ruang: "",
          materi: s.topic,
          method: s.method || "",
          hadir: s.studentPresent,
          tidakHadir: s.studentAbsent,
          status: s.status,
          sessionId: s.id,
          platformUrl: s.platformUrl || "",
          latitude: s.latitude,
          longitude: s.longitude,
          gpsDistance: s.distanceMeters,
          gpsValid: s.isGpsValid,
        }
      : {
          no: n,
          tanggal: j?.tanggal || "",
          hari: j?.hari || "",
          startTime: j?.jam?.split("-")[0] || "",
          endTime: j?.jam?.split("-")[1] || "",
          ruang: j?.ruang || "",
          materi: "",
          method: "",
          hadir: 0,
          tidakHadir: 0,
          status: "",
          sessionId: null,
          platformUrl: "",
          latitude: null,
          longitude: null,
          gpsDistance: null,
          gpsValid: null,
        }
  })
```

- [ ] **Step 2: Timpa `components/dosen/daftar-hadir-table.tsx`**

```tsx
"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from "@/components/ui/sheet"
import {
  SessionFormFields,
  SessionFieldValues,
  defaultSessionFieldValues,
} from "@/components/dosen/session-form-fields"
import { isDaringMethod, METHOD_LABELS } from "@/lib/constants"
import {
  Printer, Loader2, CheckCircle2, Globe, Send, Save,
  ChevronLeft, ChevronRight, Calendar, AlertCircle,
} from "lucide-react"

interface Pertemuan {
  no: number
  tanggal: string
  hari: string
  startTime: string
  endTime: string
  ruang: string
  materi: string
  method: string
  hadir: number
  tidakHadir: number
  status: string
  sessionId: string | null
  platformUrl: string
  latitude: number | null
  longitude: number | null
  gpsDistance: number | null
  gpsValid: boolean | null
}

interface Props {
  courseId: string
  totalMeeting: number
  dosen: { name: string; nidn: string | null }
  prodi: string
  courseName: string
  courseCode: string
  sks: number
  kelas: string | null
  semester: string
  jadwalInfo: string
  initialPertemuan: Pertemuan[]
  isOwner: boolean
}

type MeetingStatus = "published" | "draft" | "overdue" | "today" | "future" | "empty"

function getMeetingStatus(p: Pertemuan): MeetingStatus {
  if (p.status === "PUBLISHED") return "published"
  if (p.status === "DRAFT") return "draft"
  if (!p.tanggal) return "empty"
  const today = new Date().toISOString().split("T")[0]
  if (p.tanggal < today) return "overdue"
  if (p.tanggal === today) return "today"
  return "future"
}

const STATUS_CONFIG: Record<MeetingStatus, { label: string; badgeClass: string; borderClass: string }> = {
  published: { label: "Terisi", badgeClass: "bg-green-100 text-green-800 border-green-200", borderClass: "border-l-green-500" },
  draft:     { label: "Draft",  badgeClass: "bg-amber-100 text-amber-800 border-amber-200",  borderClass: "border-l-amber-500" },
  overdue:   { label: "Telat",  badgeClass: "bg-red-100 text-red-800 border-red-200",        borderClass: "border-l-red-500" },
  today:     { label: "Hari ini", badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200", borderClass: "border-l-yellow-500" },
  future:    { label: "",       badgeClass: "",                                               borderClass: "border-l-border" },
  empty:     { label: "Kosong", badgeClass: "bg-muted text-muted-foreground",                 borderClass: "border-l-border" },
}

function toFormValues(p: Pertemuan): SessionFieldValues {
  return {
    date: p.tanggal || new Date().toISOString().split("T")[0],
    startTime: p.startTime,
    endTime: p.endTime,
    topic: p.materi,
    method: p.method,
    studentPresent: p.hadir,
    studentAbsent: p.tidakHadir,
    platformUrl: p.platformUrl,
    notes: "",
    latitude: p.latitude?.toString() || "",
    longitude: p.longitude?.toString() || "",
    gpsAccuracy: "",
    gpsDistance: p.gpsDistance,
    gpsValid: p.gpsValid,
  }
}

function isComplete(p: Pertemuan) {
  return !!(p.tanggal && p.materi && p.method)
}

export function DaftarHadirTable({
  courseId, totalMeeting, courseName, courseCode, sks, kelas,
  semester, jadwalInfo, initialPertemuan, isOwner,
}: Props) {
  const router = useRouter()
  const [, rr] = useState(0)
  const rerender = () => rr(n => n + 1)

  const dataRef = useRef<Pertemuan[]>(
    Array.from({ length: totalMeeting }, (_, i) =>
      initialPertemuan.find(p => p.no === i + 1) || {
        no: i + 1, tanggal: "", hari: "", startTime: "", endTime: "", ruang: "",
        materi: "", method: "", hadir: 0, tidakHadir: 0, status: "", sessionId: null,
        platformUrl: "", latitude: null, longitude: null, gpsDistance: null, gpsValid: null,
      }
    )
  )

  const [selected, setSelected] = useState<number | null>(null)
  const [formValues, setFormValues] = useState<SessionFieldValues>(defaultSessionFieldValues)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const data = dataRef.current
  const terisi = data.filter(p => p.tanggal && p.materi).length
  const overdue = data.filter(p => getMeetingStatus(p) === "overdue").length

  function upd(no: number, patch: Partial<Pertemuan>) {
    dataRef.current = dataRef.current.map(p => p.no === no ? { ...p, ...patch } : p)
    rerender()
  }

  function openSheet(no: number) {
    const p = data.find(x => x.no === no)!
    setSelected(no)
    setFormValues(toFormValues(p))
    setSheetOpen(true)
  }

  function navigate(dir: number) {
    if (!selected) return
    const next = selected + dir
    if (next >= 1 && next <= totalMeeting) openSheet(next)
  }

  function buildBody(p: Pertemuan) {
    return {
      meetingNumber: p.no,
      date: p.tanggal,
      topic: p.materi,
      method: p.method || "TATAP_MUKA",
      studentPresent: p.hadir,
      studentAbsent: p.tidakHadir,
      startTime: p.startTime || "08:00",
      endTime: p.endTime || "10:00",
      platformUrl: p.platformUrl || undefined,
      latitude: p.latitude,
      longitude: p.longitude,
      distanceMeters: p.gpsDistance,
      isGpsValid: p.gpsValid,
    }
  }

  function applyFormToRef(no: number, fv: SessionFieldValues) {
    upd(no, {
      tanggal: fv.date,
      startTime: fv.startTime,
      endTime: fv.endTime,
      materi: fv.topic,
      method: fv.method,
      hadir: fv.studentPresent,
      tidakHadir: fv.studentAbsent,
      platformUrl: fv.platformUrl,
      latitude: fv.latitude ? parseFloat(fv.latitude) : null,
      longitude: fv.longitude ? parseFloat(fv.longitude) : null,
      gpsDistance: fv.gpsDistance,
      gpsValid: fv.gpsValid,
    })
  }

  async function simpan(doPublish: boolean) {
    if (!selected) return
    applyFormToRef(selected, formValues)
    const p = dataRef.current.find(x => x.no === selected)!
    if (!isComplete(p)) { toast.error("Lengkapi tanggal, materi, dan metode"); return }

    if (!isDaringMethod(p.method) && (!p.latitude || !p.longitude)) {
      toast.error("Deteksi GPS wajib untuk sesi luring")
      return
    }
    if (isDaringMethod(p.method) && !p.platformUrl) {
      toast.error("URL platform wajib untuk sesi daring")
      return
    }

    setSaving(true)
    try {
      const r = await fetch(`/api/courses/${courseId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(p)),
      })
      const j = await r.json()
      if (!j.success) { toast.error(j.message || "Gagal menyimpan"); return }
      const sid = j.data.id
      upd(selected, { sessionId: sid, status: j.data.status })

      if (!doPublish) { toast.success("Tersimpan"); setSheetOpen(false); return }

      setSaving(false); setPublishing(true)
      const pr = await fetch(`/api/sessions/${sid}/publish`, { method: "PUT" })
      const pj = await pr.json()
      if (pj.success) { upd(selected, { status: "PUBLISHED" }); toast.success("Tersimpan & dipublish") }
      else toast.error(pj.message || "Gagal publish")
      setSheetOpen(false)
    } catch { toast.error("Gagal") }
    finally { setSaving(false); setPublishing(false) }
  }

  async function handlePublishExisting() {
    if (!selected) return
    const p = data.find(x => x.no === selected)!
    if (!p.sessionId) return
    setPublishing(true)
    try {
      const r = await fetch(`/api/sessions/${p.sessionId}/publish`, { method: "PUT" })
      const j = await r.json()
      if (j.success) { upd(selected, { status: "PUBLISHED" }); toast.success("Dipublish"); setSheetOpen(false) }
      else toast.error(j.message || "Gagal")
    } catch { toast.error("Gagal") }
    finally { setPublishing(false) }
  }

  async function handleDelete() {
    if (!selected || !confirm("Hapus pertemuan ini?")) return
    const p = data.find(x => x.no === selected)!
    if (p.sessionId) {
      await fetch(`/api/courses/${courseId}/sessions?meetingNumber=${selected}`, { method: "DELETE" })
    }
    upd(selected, {
      tanggal: p.tanggal, hari: p.hari, startTime: p.startTime, endTime: p.endTime, ruang: p.ruang,
      materi: "", method: "", hadir: 0, tidakHadir: 0, status: "", sessionId: null,
      platformUrl: "", latitude: null, longitude: null, gpsDistance: null, gpsValid: null,
    })
    setSheetOpen(false)
    toast.success("Pertemuan dihapus")
  }

  async function handleCetak() {
    setDownloading(true)
    try {
      const r = await fetch(`/api/courses/${courseId}/daftar-hadir?format=pdf`)
      if (!r.ok) {
        const ct = r.headers.get("content-type") || ""
        if (ct.includes("json")) { const j = await r.json(); toast.error((j as { message?: string }).message || "Gagal") }
        else toast.error(`Gagal (${r.status})`)
        return
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `Jurnal_${courseCode}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error("Gagal download") }
    finally { setDownloading(false) }
  }

  const activePertemuan = selected ? data.find(p => p.no === selected) : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold leading-tight">{courseName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {courseCode} · {sks} SKS · {semester}{kelas ? ` · Kelas ${kelas}` : ""}
          </p>
          {jadwalInfo && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" /> {jadwalInfo}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-sm text-muted-foreground">{terisi}/{totalMeeting} terisi</div>
          <Progress value={Math.round((terisi / totalMeeting) * 100)} className="w-24 h-2" />
          <Button onClick={handleCetak} disabled={downloading} variant="outline" size="sm">
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Cetak
          </Button>
        </div>
      </div>

      {/* Alert overdue */}
      {overdue > 0 && isOwner && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{overdue} pertemuan sudah lewat batas waktu, segera isi.</AlertDescription>
        </Alert>
      )}

      {/* Selesai semua */}
      {terisi === totalMeeting && isOwner && (
        <Alert className="border-green-300 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Semua pertemuan terisi. Cetak PDF untuk ditandatangani Kaprodi.</AlertDescription>
        </Alert>
      )}

      {/* Grid overview pertemuan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {data.map(p => {
          const st = getMeetingStatus(p)
          const cfg = STATUS_CONFIG[st]
          return (
            <button
              key={p.no}
              onClick={() => openSheet(p.no)}
              className={`text-left rounded-lg border-l-4 border border-border bg-card p-3 hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-ring ${cfg.borderClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-muted-foreground">#{p.no}</span>
                {cfg.label && (
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${cfg.badgeClass}`}>
                    {cfg.label}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-tight truncate">
                {p.materi || <span className="text-muted-foreground italic">Belum diisi</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {p.tanggal || "—"}{p.method ? ` · ${METHOD_LABELS[p.method] || p.method}` : ""}
              </p>
            </button>
          )
        })}
      </div>

      {/* Sheet editor */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right">
          {activePertemuan && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between pr-8">
                  <div>
                    <SheetTitle>Pertemuan #{selected} / {totalMeeting}</SheetTitle>
                    <SheetDescription>
                      {activePertemuan.tanggal || "Belum ada tanggal"}
                      {activePertemuan.startTime && ` · ${activePertemuan.startTime}–${activePertemuan.endTime}`}
                    </SheetDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(-1)}
                      disabled={!selected || selected <= 1}
                      className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      aria-label="Pertemuan sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(1)}
                      disabled={!selected || selected >= totalMeeting}
                      className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      aria-label="Pertemuan selanjutnya"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {activePertemuan.status && (
                  <Badge
                    className={`w-fit text-xs ${STATUS_CONFIG[getMeetingStatus(activePertemuan)].badgeClass}`}
                    variant="outline"
                  >
                    {STATUS_CONFIG[getMeetingStatus(activePertemuan)].label}
                  </Badge>
                )}
              </SheetHeader>

              {/* Published — read only */}
              {activePertemuan.status === "PUBLISHED" ? (
                <div className="p-6 pt-4 space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <p className="font-medium">{activePertemuan.materi || "—"}</p>
                    <p className="text-sm text-muted-foreground">
                      {METHOD_LABELS[activePertemuan.method] || activePertemuan.method} ·
                      Hadir: {activePertemuan.hadir} · Tidak: {activePertemuan.tidakHadir}
                    </p>
                    {activePertemuan.platformUrl && (
                      <p className="text-xs text-blue-600 truncate flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {activePertemuan.platformUrl}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/dosen/courses/${courseId}/sessions/${activePertemuan.sessionId}`)}
                    className="text-sm text-primary hover:underline"
                  >
                    Lihat BAP & Detail →
                  </button>
                </div>
              ) : activePertemuan.status === "DRAFT" && !isOwner ? (
                <div className="p-6 pt-4 space-y-3">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="font-medium">{activePertemuan.materi}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {METHOD_LABELS[activePertemuan.method] || activePertemuan.method}
                    </p>
                  </div>
                </div>
              ) : isOwner ? (
                <>
                  <SessionFormFields
                    values={formValues}
                    onChange={patch => setFormValues(prev => ({ ...prev, ...patch }))}
                    teachingLoadId={
                      /* teachingLoadId tidak tersedia di sini — diambil dari courseId saat menyimpan */
                      courseId
                    }
                  />
                  <SheetFooter>
                    <button
                      onClick={handleDelete}
                      className="mr-auto text-sm text-destructive hover:underline"
                    >
                      Hapus
                    </button>
                    {activePertemuan.status === "DRAFT" ? (
                      <Button
                        onClick={handlePublishExisting}
                        disabled={publishing}
                        className="bg-green-600 hover:bg-green-700 sm:w-auto w-full"
                      >
                        {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Publish
                      </Button>
                    ) : (
                      <>
                        <SheetClose asChild>
                          <Button variant="outline" className="sm:w-auto w-full">Batal</Button>
                        </SheetClose>
                        <Button
                          onClick={() => simpan(false)}
                          disabled={saving || publishing}
                          variant="outline"
                          className="sm:w-auto w-full"
                        >
                          {saving && !publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          Simpan Draft
                        </Button>
                        <Button
                          onClick={() => simpan(true)}
                          disabled={saving || publishing}
                          className="bg-green-600 hover:bg-green-700 sm:w-auto w-full"
                        >
                          {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                          Simpan & Publish
                        </Button>
                      </>
                    )}
                  </SheetFooter>
                </>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
```

> **Catatan:** Pada `SessionFormFields` di dalam Sheet, prop `teachingLoadId` diisi `courseId` sementara. API `/api/teaching-loads/${teachingLoadId}/daring-quota` membutuhkan teaching load ID yang sebenarnya. Untuk itu, perlu menambahkan `teachingLoadId` ke prop `DaftarHadirTable` dan mengoper dari `courses/[courseId]/page.tsx`. Langkah selanjutnya menangani ini.

- [ ] **Step 3: Tambah `teachingLoadId` ke props `DaftarHadirTable`**

Di `components/dosen/daftar-hadir-table.tsx`, update interface `Props`:

```tsx
interface Props {
  courseId: string
  teachingLoadId: string   // ← tambah ini
  totalMeeting: number
  // ... sisa tidak berubah
```

Lalu update destrukturasi di function signature:

```tsx
export function DaftarHadirTable({
  courseId, teachingLoadId, totalMeeting, courseName, courseCode, sks, kelas,
  semester, jadwalInfo, initialPertemuan, isOwner,
}: Props) {
```

Dan ganti prop `teachingLoadId` di `SessionFormFields` dalam Sheet dari `courseId` ke `teachingLoadId`:

```tsx
                  <SessionFormFields
                    values={formValues}
                    onChange={patch => setFormValues(prev => ({ ...prev, ...patch }))}
                    teachingLoadId={teachingLoadId}
                  />
```

- [ ] **Step 4: Tambah `teachingLoadId` di `courses/[courseId]/page.tsx`**

Di `app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx`, tambahkan prop `teachingLoadId` pada `<DaftarHadirTable ...>`:

```tsx
      <DaftarHadirTable
        courseId={courseId}
        teachingLoadId={load.id}
        prodi={load.course.prodi.name}
        totalMeeting={load.course.totalMeeting}
        // ... sisa props tidak berubah
      />
```

- [ ] **Step 5: Cek TypeScript**

```bash
cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit 2>&1 | head -40
```

Expected: tidak ada error. Perbaiki jika ada type mismatch pada `initialPertemuan`.

- [ ] **Step 6: Commit**

```bash
git add components/dosen/daftar-hadir-table.tsx app/\(dashboard\)/dashboard/dosen/courses/\[courseId\]/page.tsx
git commit -m "feat: rewrite DaftarHadirTable — overview grid + Sheet editor, unified SessionFormFields"
```

---

## Task 5: Rewrite `SessionForm` (wizard → satu form)

**Files:**
- Modify: `components/dosen/session-form.tsx`

Ganti wizard 3-langkah menjadi satu form bersih menggunakan `SessionFormFields`. Semua props yang ada dipertahankan agar `sessions/new/page.tsx` tidak perlu diubah.

- [ ] **Step 1: Timpa `components/dosen/session-form.tsx`**

```tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Save, Send } from "lucide-react"
import {
  SessionFormFields,
  SessionFieldValues,
  defaultSessionFieldValues,
} from "@/components/dosen/session-form-fields"
import { isDaringMethod } from "@/lib/constants"
import { isValidUrl } from "@/lib/validators"

interface SessionFormProps {
  teachingLoadId: string
  courseId: string
  courseName: string
  courseTotalMeeting: number
  defaultDate?: string
  defaultStartTime?: string
  existingSession?: {
    id: string
    meetingNumber: number
    date: string
    startTime: string
    endTime: string
    topic: string
    method: string
    sessionType: string
    studentPresent: number
    studentAbsent: number
    latitude?: number | null
    longitude?: number | null
    gpsAccuracy?: number | null
    platformUrl?: string | null
    isDaring: boolean
    notes?: string | null
  } | null
}

export function SessionForm({
  teachingLoadId,
  courseId,
  courseName,
  courseTotalMeeting,
  defaultDate,
  defaultStartTime,
  existingSession,
}: SessionFormProps) {
  const router = useRouter()
  const isEdit = !!existingSession

  const [meetingNumber, setMeetingNumber] = useState(existingSession?.meetingNumber || 1)
  const [sessionType] = useState(existingSession?.sessionType || "NORMAL")
  const [loading, setLoading] = useState(false)
  const [publishAfterSave, setPublishAfterSave] = useState(false)

  const [values, setValues] = useState<SessionFieldValues>(() =>
    existingSession
      ? {
          date: existingSession.date?.split("T")[0] || defaultDate || new Date().toISOString().split("T")[0],
          startTime: existingSession.startTime || defaultStartTime || "",
          endTime: existingSession.endTime || "",
          topic: existingSession.topic || "",
          method: existingSession.method || "",
          studentPresent: existingSession.studentPresent || 0,
          studentAbsent: existingSession.studentAbsent || 0,
          platformUrl: existingSession.platformUrl || "",
          notes: existingSession.notes || "",
          latitude: existingSession.latitude?.toString() || "",
          longitude: existingSession.longitude?.toString() || "",
          gpsAccuracy: existingSession.gpsAccuracy?.toString() || "",
          gpsDistance: null,
          gpsValid: null,
        }
      : {
          ...defaultSessionFieldValues,
          date: defaultDate || new Date().toISOString().split("T")[0],
          startTime: defaultStartTime || "",
        }
  )

  useEffect(() => {
    if (!isEdit) {
      fetch(`/api/sessions?teachingLoadId=${teachingLoadId}`)
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data?.length > 0) {
            const maxMeeting = Math.max(...json.data.map((s: { meetingNumber: number }) => s.meetingNumber))
            setMeetingNumber(maxMeeting + 1)
          }
        })
        .catch(() => {})
    }
  }, [isEdit, teachingLoadId])

  async function handleSubmit(publishAfter: boolean) {
    if (!values.date || !values.startTime || !values.endTime || !values.topic || !values.method) {
      toast.error("Lengkapi semua field wajib")
      return
    }

    const isDaring = isDaringMethod(values.method)

    if (!isDaring && (!values.latitude || !values.longitude)) {
      toast.error("Deteksi GPS wajib untuk sesi luring")
      return
    }

    if (isDaring) {
      if (!values.platformUrl) { toast.error("URL platform wajib untuk sesi daring"); return }
      if (!isValidUrl(values.platformUrl)) { toast.error("URL platform tidak valid"); return }
    }

    setLoading(true)

    const body: Record<string, unknown> = {
      teachingLoadId,
      meetingNumber,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      topic: values.topic,
      method: values.method,
      sessionType,
      studentPresent: values.studentPresent,
      studentAbsent: values.studentAbsent,
      notes: values.notes || null,
    }

    if (!isDaring) {
      body.latitude = parseFloat(values.latitude) || null
      body.longitude = parseFloat(values.longitude) || null
      body.gpsAccuracy = parseFloat(values.gpsAccuracy) || null
    }

    if (isDaring) {
      body.platformUrl = values.platformUrl
    }

    const url = isEdit ? `/api/sessions/${existingSession!.id}` : "/api/sessions"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json()

    if (!data.success) {
      toast.error(data.message || "Gagal menyimpan sesi")
      setLoading(false)
      return
    }

    if (publishAfter && data.data?.id) {
      const pubRes = await fetch(`/api/sessions/${data.data.id}/publish`, { method: "PUT" })
      const pubData = await pubRes.json()
      if (pubData.success) toast.success("Sesi berhasil dipublish")
      else toast.error(pubData.message || "Gagal publish")
    } else {
      toast.success(data.message || "Sesi berhasil disimpan")
    }

    setLoading(false)
    router.push(`/dashboard/dosen/courses/${courseId}`)
    router.refresh()
  }

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in-up">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit ? "Edit Sesi" : "Tambah Sesi"} — {courseName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pertemuan ke-{meetingNumber} dari {courseTotalMeeting}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <SessionFormFields
            values={values}
            onChange={patch => setValues(prev => ({ ...prev, ...patch }))}
            teachingLoadId={teachingLoadId}
          />

          <div className="border-t px-6 py-4 space-y-4">
            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={publishAfterSave}
                onChange={e => setPublishAfterSave(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Langsung publish setelah simpan
            </label>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit(publishAfterSave)}
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                {loading
                  ? "Menyimpan..."
                  : publishAfterSave
                  ? <><Send className="h-4 w-4 mr-2" />Simpan & Publish</>
                  : <><Save className="h-4 w-4 mr-2" />Simpan</>
                }
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Cek TypeScript**

```bash
cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit 2>&1 | head -40
```

Expected: nol error.

- [ ] **Step 3: Commit**

```bash
git add components/dosen/session-form.tsx
git commit -m "feat: replace SessionForm wizard with single-form using SessionFormFields"
```

---

## Task 6: Verifikasi final

**Files:** tidak ada perubahan kode.

- [ ] **Step 1: TypeScript**

```bash
cd /home/zhev/myproject/e-kendali-dosen && tsc --noEmit 2>&1
```

Expected: `No errors found.` (atau 0 baris output).

- [ ] **Step 2: Lint**

```bash
cd /home/zhev/myproject/e-kendali-dosen && npm run lint 2>&1
```

Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 3: Build**

```bash
cd /home/zhev/myproject/e-kendali-dosen && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` tanpa warning.

- [ ] **Step 4: Cek manual — dashboard dosen**
  - Buka `/dashboard/dosen`
  - Verifikasi: hero Card (bukan gradient biru hardcoded), statistik, Progress semester
  - Verifikasi: Alert "Kelas hari ini" muncul jika ada jadwal hari ini; Alert "Draft" muncul jika ada draft
  - Verifikasi: grid MK tampil dengan Card shadcn + Progress per-MK

- [ ] **Step 5: Cek manual — pengisian jurnal**
  - Buka `/dashboard/dosen/courses/[courseId]`
  - Verifikasi: header MK terbaca jelas, Progress, tombol Cetak
  - Verifikasi: grid pertemuan (1 kolom HP, 2–3 kolom desktop)
  - Verifikasi: klik kartu → Sheet terbuka dari kanan
  - Verifikasi: form berisi semua field (tanggal, jam, materi, metode, GPS/URL, hadir)
  - Verifikasi: navigasi ‹ › antar pertemuan dalam Sheet
  - Verifikasi: Simpan Draft → status DRAFT; Simpan & Publish → status PUBLISHED
  - Verifikasi: kartu Published → Sheet read-only + tautan BAP

- [ ] **Step 6: Cek manual — sessions/new & alur Scan QR**
  - Buka `/dashboard/dosen/courses/[courseId]/sessions/new`
  - Verifikasi: form satu halaman (bukan wizard), semua field ada
  - Verifikasi: alur Scan QR (`/scan` → quick-start) masih membuka `QuickStartForm` dengan benar

- [ ] **Step 7: Commit penutup jika ada perbaikan minor**

```bash
git add -p
git commit -m "fix: minor UI tweaks after manual verification"
```

---

## Ringkasan perubahan file

| File | Status |
|---|---|
| `components/ui/sheet.tsx` | Baru |
| `components/dosen/session-form-fields.tsx` | Baru |
| `app/(dashboard)/dashboard/dosen/page.tsx` | Dimodifikasi |
| `components/dosen/daftar-hadir-table.tsx` | Dimodifikasi (besar) |
| `app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx` | Dimodifikasi (kecil) |
| `components/dosen/session-form.tsx` | Dimodifikasi |
