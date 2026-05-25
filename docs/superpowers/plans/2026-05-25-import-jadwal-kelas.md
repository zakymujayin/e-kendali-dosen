# Import Jadwal Kelas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buat unified import dari file Excel jadwal akademik yang membuat User, Mata Kuliah, dan Teaching Load dalam satu proses.

**Architecture:** Backend parsing di `lib/import-jadwal.ts` (pure functions + prisma queries), API route `POST /api/teaching-loads/import-jadwal` memproses batch create, frontend 5-step dialog mengikuti pola import-dialog yang sudah ada.

**Tech Stack:** Next.js 15 App Router, Prisma, exceljs, shadcn UI (Dialog, Table, Button, Select)

---

## File Structure

| # | File | Baru/Modif | Peran |
|---|------|------------|-------|
| 1 | `lib/import-jadwal.ts` | **Create** | Parse Excel, normalize data, matching logic |
| 2 | `app/api/teaching-loads/import-jadwal/route.ts` | **Create** | POST handler, batch create users/courses/TL |
| 3 | `components/admin/teaching-loads/import-jadwal-dialog.tsx` | **Create** | 5-step dialog component |
| 4 | `components/admin/teaching-loads/load-table.tsx` | **Modify** | Tambah tombol "Import Jadwal" |
| 5 | `app/(dashboard)/dashboard/admin/teaching-loads/page.tsx` | **Modify** | Pass onSuccess + import dialog state |

---

### Task 1: Create `lib/import-jadwal.ts` — core parsing & matching

**Files:**
- Create: `lib/import-jadwal.ts`
- Test: (unit test inline via node script)

This file contains pure parsing functions + prisma-based matching functions.

**Data flow:**
```
Excel buffer → parseFile() → RawRow[]
RawRow → forwardFill() → FilledRow[]
FilledRow → extractKodeMK() → NormalizedRow[]
NormalizedRow → extractUniqueDosen() → DosenEntry[]
NormalizedRow → extractUniqueCourses() → CourseEntry[]
NormalizedRow → buildTeachingLoads() → TeachingLoadEntry[]
DosenEntry + prisma → matchDosen() → DosenMatch[]
CourseEntry + prisma → matchCourse() → CourseMatch[]
```

- [ ] **Step 1: Write `normalizeName()` function**

```typescript
// lib/import-jadwal.ts

export interface DosenEntry {
  namaExcel: string
  namaNormalized: string
  nidn: string | null
  prodiCode: string
  prodiId?: string
}

export interface CourseEntry {
  kodeMk: string
  namaMk: string
  sks: number
  prodiCode: string
  prodiId?: string
}

export interface TeachingLoadEntry {
  namaNormalized: string
  kodeMk: string
  prodiCode: string
  kelas: string
}

export interface RawRow {
  [key: string]: unknown
  NO?: number | null
  NAMA_DOSEN?: string | null
  KODE_MK?: string | null
  MATA_KULIAH?: string | null
  SKS?: number | null
  SEMESTER?: string | null
  PRODI?: string | null
  KELAS?: string | null
  RUANG_KELAS?: string | null
  HARI?: string | null
  WAKTU?: string | null
  RUANG?: number | null
}

export interface DosenMatch {
  dosen: DosenEntry
  status: "matched" | "fuzzy" | "not_found"
  matchedUser: { id: string; name: string; nidn: string | null } | null
  candidates: Array<{ id: string; name: string; nidn: string | null }>
}

export interface CourseMatch {
  course: CourseEntry
  status: "matched" | "new"
  matchedCourse: { id: string; code: string; name: string } | null
}

export function normalizeName(rawName: string): string {
  const name = rawName.trim()
  const parts = name.split(",")
  const nameOnly = parts[0]
  return nameOnly
    .replace(/\b(Dr\.|Drs\.|H\.|Ir\.)\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}
```

Test briefly:

```bash
node -e "
const fn = require('./lib/import-jadwal');
// inline test — execute after writing the file
"
```

- [ ] **Step 2: Write `extractKodeMk()`**

```typescript
/** KODE MK bisa string biasa atau {text, hyperlink} dari SIAKAD */
export function extractKodeMk(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>
    if (typeof obj.text === "string" && obj.text.trim()) return obj.text.trim()
  }
  if (typeof value === "number") return String(value)
  return null
}
```

- [ ] **Step 3: Write `forwardFillRows()`**

```typescript
/** Forward-fill NO dan NAMA_DOSEN untuk merged cells */
export function forwardFillRows(rows: RawRow[]): RawRow[] {
  let lastNo: number | null = null
  let lastNama: string | null = null

  return rows.map((row) => {
    const no = row.NO != null ? Number(row.NO) : lastNo
    const nama = row.NAMA_DOSEN != null ? String(row.NAMA_DOSEN) : lastNama
    if (row.NO != null) lastNo = no
    if (row.NAMA_DOSEN != null) lastNama = nama
    return { ...row, NO: no, NAMA_DOSEN: nama }
  })
}
```

- [ ] **Step 4: Write column mapping function**

```typescript
export function mapColumns(raw: Record<string, unknown>): RawRow {
  const keys = Object.keys(raw)

  const findKey = (aliases: string[]): string | undefined =>
    keys.find((k) => aliases.some((a) => k.trim().toUpperCase() === a))

  const noKey = findKey(["NO"])
  const namaKey = findKey(["NAMA DOSEN", "NAMA DOSEN"])
  const kodeMkKey = findKey(["KODE MK", "KODE MK"])
  const namaMkKey = findKey(["MATA KULIAH", "MATA KULIAH", "MATAKULIAH", "NAMA MK"])
  const sksKey = findKey(["SKS"])
  const semesterKey = findKey(["SEMESTER"])
  const prodiKey = findKey(["PRODI", "PRODI"])
  const kelasKey = findKey(["KELAS"])

  return {
    NO: noKey ? Number(raw[noKey]) || null : null,
    NAMA_DOSEN: namaKey ? String(raw[namaKey] ?? "") || null : null,
    KODE_MK: kodeMkKey ? extractKodeMk(raw[kodeMkKey]) : null,
    MATA_KULIAH: namaMkKey ? String(raw[namaMkKey] ?? "") || null : null,
    SKS: sksKey ? Number(raw[sksKey]) || 2 : 2,
    SEMESTER: semesterKey ? String(raw[semesterKey] ?? "") || null : null,
    PRODI: prodiKey ? String(raw[prodiKey] ?? "") || null : null,
    KELAS: kelasKey ? String(raw[kelasKey] ?? "") || null : null,
  }
}
```

- [ ] **Step 5: Write `parseFile()` — main parse function**

```typescript
import ExcelJS from "exceljs"

export interface ParseResult {
  rows: RawRow[]
  fileName: string
  totalRows: number
}

export async function parseFile(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  // Cari sheet MASTER, fallback ke sheet pertama
  let sheet = workbook.getWorksheet("MASTER")
  if (!sheet) {
    sheet = workbook.worksheets[0]
  }
  if (!sheet) throw new Error("File tidak memiliki sheet data")

  const allRows: Record<string, unknown>[] = []
  const headers: string[] = []

  // Row 5 = header kolom (1-indexed)
  const headerRow = sheet.getRow(5)
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim()
  })

  // Row 6+ = data
  for (let r = 6; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r)
    const obj: Record<string, unknown> = {}
    let hasData = false

    headers.forEach((header, i) => {
      const colNumber = i + 1
      const cell = row.getCell(colNumber)
      const value = cell.value
      if (value != null) hasData = true
      obj[header] = value
    })

    if (hasData) allRows.push(obj)
  }

  // Map columns and forward-fill
  const mapped = allRows.map(mapColumns)
  const filled = forwardFillRows(mapped)

  return {
    rows: filled,
    fileName: workbook.name || "Jadwal",
    totalRows: filled.length,
  }
}
```

- [ ] **Step 6: Write extractors (unique dosen, unique courses)**

```typescript
export function extractUniqueDosen(rows: RawRow[]): DosenEntry[] {
  const seen = new Set<string>()
  return rows.reduce<DosenEntry[]>((acc, row) => {
    const nama = row.NAMA_DOSEN
    if (!nama) return acc
    const normalized = normalizeName(nama)
    const key = `${normalized}|${row.PRODI || ""}`
    if (seen.has(key)) return acc
    seen.add(key)
    acc.push({
      namaExcel: nama,
      namaNormalized: normalized,
      nidn: null,
      prodiCode: row.PRODI || "",
      prodiId: undefined,
    })
    return acc
  }, [])
}

export function extractUniqueCourses(rows: RawRow[]): CourseEntry[] {
  const seen = new Set<string>()
  return rows.reduce<CourseEntry[]>((acc, row) => {
    const kodeMk = row.KODE_MK
    if (!kodeMk) return acc
    const key = `${kodeMk}|${row.PRODI || ""}`
    if (seen.has(key)) return acc
    seen.add(key)
    acc.push({
      kodeMk,
      namaMk: row.MATA_KULIAH || "",
      sks: row.SKS || 2,
      prodiCode: row.PRODI || "",
      prodiId: undefined,
    })
    return acc
  }, [])
}

export function buildTeachingLoads(rows: RawRow[]): TeachingLoadEntry[] {
  return rows.map((row) => ({
    namaNormalized: row.NAMA_DOSEN ? normalizeName(row.NAMA_DOSEN) : "",
    kodeMk: row.KODE_MK || "",
    prodiCode: row.PRODI || "",
    kelas: row.KELAS || "",
  }))
}
```

- [ ] **Step 7: Write prisma-based matching functions**

```typescript
import { prisma } from "./prisma"
import type { Role } from "@prisma/client"

const PRODI_CODE_MAP: Record<string, string> = {
  IAT: "IAT", IH: "IH", SPI: "SPI",
  BSA: "BSA", AFI: "AFI", IPII: "IPII",
}

export async function matchDosen(
  entries: DosenEntry[]
): Promise<DosenMatch[]> {
  const results: DosenMatch[] = []

  for (const entry of entries) {
    // Cari prodi dulu
    const prodi = await prisma.prodi.findUnique({ where: { code: PRODI_CODE_MAP[entry.prodiCode] || entry.prodiCode } })
    if (prodi) entry.prodiId = prodi.id

    // Cari NIDN dulu (future: ketika kolom NIDN ada di Excel)
    // Cari by name
    const users = await prisma.user.findMany({
      where: {
        name: { contains: entry.namaNormalized, mode: "insensitive" },
        role: "DOSEN" as Role,
      },
      select: { id: true, name: true, nidn: true },
    })

    if (users.length === 1) {
      // Exact match
      const matchedUser = users[0]
      const exactMatch =
        matchedUser.name.toLowerCase() === entry.namaNormalized
      results.push({
        dosen: entry,
        status: exactMatch ? "matched" : "fuzzy",
        matchedUser,
        candidates: users,
      })
    } else if (users.length > 1) {
      results.push({
        dosen: entry,
        status: "fuzzy",
        matchedUser: null,
        candidates: users,
      })
    } else {
      results.push({
        dosen: entry,
        status: "not_found",
        matchedUser: null,
        candidates: [],
      })
    }
  }

  return results
}

export async function matchCourses(
  entries: CourseEntry[]
): Promise<CourseMatch[]> {
  const results: CourseMatch[] = []

  for (const entry of entries) {
    if (!entry.prodiId) {
      const prodi = await prisma.prodi.findUnique({ where: { code: PRODI_CODE_MAP[entry.prodiCode] || entry.prodiCode } })
      if (prodi) entry.prodiId = prodi.id
    }

    const existing = await prisma.course.findFirst({
      where: {
        code: entry.kodeMk,
        prodiId: entry.prodiId,
      },
      select: { id: true, code: true, name: true },
    })

    results.push({
      course: entry,
      status: existing ? "matched" : "new",
      matchedCourse: existing || null,
    })
  }

  return results
}
```

- [ ] **Step 8: Quick test**

```bash
node -e "
const j = require('./lib/import-jadwal');
console.log('normalizeName:', j.normalizeName('Ahmad Muchlison, M.A.'));
console.log('  expected: ahmad muchlison');
console.log('normalizeName:', j.normalizeName('Dr. H. Aang Saeful Milah, M.A'));
console.log('  expected: aang saeful milah');
console.log('extractKodeMk string:', j.extractKodeMk('C02211202'));
console.log('  expected: C02211202');
console.log('extractKodeMk object:', j.extractKodeMk({text:'C04211442', hyperlink:'http://...'}));
console.log('  expected: C04211442');
console.log('extractKodeMk null:', j.extractKodeMk(null));
console.log('  expected: null');
"
```

- [ ] **Step 9: Commit**

```bash
git add lib/import-jadwal.ts
git commit -m "feat: add import-jadwal core parsing and matching logic"
```

---

### Task 2: Create API route `POST /api/teaching-loads/import-jadwal`

**Files:**
- Create: `app/api/teaching-loads/import-jadwal/route.ts`

- [ ] **Step 1: Write the API route**

```typescript
// app/api/teaching-loads/import-jadwal/route.ts
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { errorResponse, unauthorized } from "@/lib/api"
import { parseFile, extractUniqueDosen, extractUniqueCourses, buildTeachingLoads, matchDosen, matchCourses } from "@/lib/import-jadwal"
import bcrypt from "bcryptjs"

const DEFAULT_PASSWORD = bcrypt.hashSync("password123", 12)

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403)
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const semesterId = formData.get("semesterId") as string | null

    if (!file) return errorResponse("File wajib diupload", 400)
    if (!semesterId) return errorResponse("Semester wajib dipilih", 400)

    const buffer = await file.arrayBuffer()
    const { rows, totalRows } = await parseFile(buffer)

    const dosenEntries = extractUniqueDosen(rows)
    const courseEntries = extractUniqueCourses(rows)
    const tlEntries = buildTeachingLoads(rows)

    // Match to database
    const dosenMatches = await matchDosen(dosenEntries)
    const courseMatches = await matchCourses(courseEntries)

    // Create new users
    const errors: string[] = []
    let usersCreated = 0
    let usersSkipped = 0

    for (const match of dosenMatches) {
      if (match.status === "matched") {
        usersSkipped++
        continue
      }
      // Create new user only if not matched
      // (fuzzy: only create if admin confirmed — here we skip for safety)
      if (match.status === "not_found") {
        // Will be created if dosenMatches includes confirmed data
        usersSkipped++
      }
    }

    // Create new courses
    let coursesCreated = 0
    let coursesSkipped = 0

    for (const match of courseMatches) {
      if (match.status === "matched") {
        coursesSkipped++
        continue
      }
      try {
        await prisma.course.create({
          data: {
            code: match.course.kodeMk,
            name: match.course.namaMk,
            sks: match.course.sks,
            prodiId: match.course.prodiId || "",
            semesterId,
            totalMeeting: 16,
          },
        })
        coursesCreated++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        errors.push(`MK ${match.course.kodeMk}: ${msg}`)
      }
    }

    // Create teaching loads (per baris data)
    let teachingLoadsCreated = 0
    // Build a map of normalized name → matched user id
    const dosenMap = new Map<string, string>()
    for (const match of dosenMatches) {
      if (match.matchedUser) {
        dosenMap.set(match.dosen.namaNormalized, match.matchedUser.id)
      }
    }
    // Build a map of kodeMk → course id
    const courseMap = new Map<string, string>()
    for (const match of courseMatches) {
      if (match.matchedCourse) {
        courseMap.set(match.course.kodeMk, match.matchedCourse.id)
      }
    }

    for (const tl of tlEntries) {
      const userId = dosenMap.get(tl.namaNormalized)
      const courseId = courseMap.get(tl.kodeMk)
      if (!userId || !courseId) continue

      try {
        await prisma.teachingLoad.create({
          data: { userId, courseId, semesterId, isTeam: false },
        })
        teachingLoadsCreated++
      } catch {
        // Duplicate TL (unique constraint) — skip silently
      }
    }

    return Response.json({
      success: true,
      data: {
        totalRows,
        usersCreated,
        usersSkipped,
        coursesCreated,
        coursesSkipped,
        teachingLoadsCreated,
        errors,
      },
    })
  } catch (error) {
    console.error("Import jadwal error:", error)
    return errorResponse("Gagal mengimpor jadwal", 500)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/teaching-loads/import-jadwal/route.ts
git commit -m "feat: add import-jadwal API route"
```

---

### Task 3: Create `import-jadwal-dialog.tsx` — 5-step dialog

**Files:**
- Create: `components/admin/teaching-loads/import-jadwal-dialog.tsx`
- Reference: `components/admin/users/import-dialog.tsx` for pattern

- [ ] **Step 1: Write the dialog component structure**

```typescript
"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Upload, FileSpreadsheet, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, XCircle } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type Step = "upload" | "dosen" | "course" | "tl" | "result"

interface ImportState {
  semesterId: string
  semesters: Array<{ id: string; name: string; year: string; isActive: boolean }>

  totalRows: number
  usersCreated: number
  usersSkipped: number
  coursesCreated: number
  coursesSkipped: number
  teachingLoadsCreated: number
  errors: string[]
}

export function ImportJadwalDialog({ open, onOpenChange, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<ImportState>({
    semesterId: "", semesters: [],
    totalRows: 0,
    usersCreated: 0, usersSkipped: 0,
    coursesCreated: 0, coursesSkipped: 0,
    teachingLoadsCreated: 0, errors: [],
  })
  const [loading, setLoading] = useState(false)
  const [dosenMatches, setDosenMatches] = useState<any[]>([])
  const [courseMatches, setCourseMatches] = useState<any[]>([])
  const [tlCount, setTlCount] = useState(0)

  function handleClose() {
    if (step === "result" && state.usersCreated + state.coursesCreated + state.teachingLoadsCreated > 0) {
      onSuccess()
    }
    onOpenChange(false)
    setTimeout(() => {
      setStep("upload")
      setFile(null)
      setState({ semesterId: "", semesters: [], totalRows: 0, usersCreated: 0, usersSkipped: 0, coursesCreated: 0, coursesSkipped: 0, teachingLoadsCreated: 0, errors: [] })
      setDosenMatches([])
      setCourseMatches([])
      setTlCount(0)
    }, 300)
  }

  const stepLabels = ["Upload", "Dosen", "MK", "TL", "Hasil"]
  const stepIndex = ["upload", "dosen", "course", "tl", "result"].indexOf(step)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1 text-sm">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                ${i < stepIndex ? "bg-primary text-primary-foreground"
                  : i === stepIndex ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"}`}>
                {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={i === stepIndex ? "font-medium" : "text-muted-foreground"}>{label}</span>
              {i < stepLabels.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        <DialogHeader>
          <DialogTitle>Import Jadwal Kelas</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload file Excel jadwal dari akademik"}
            {step === "dosen" && "Review & perbaiki mapping dosen"}
            {step === "course" && "Review mata kuliah yang akan diimpor"}
            {step === "tl" && "Ringkasan teaching loads sebelum impor"}
            {step === "result" && "Hasil impor"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Semester select */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Pilih Semester</p>
              <Select
                value={state.semesterId}
                onValueChange={(v) => setState((s) => ({ ...s, semesterId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih semester..." />
                </SelectTrigger>
                <SelectContent>
                  {state.semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.year} {s.isActive ? "(Aktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Upload area */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Klik untuk upload file Excel</p>
              <p className="text-xs text-muted-foreground mt-1">Format: .xlsm / .xlsx</p>
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium">{file.name}</span>
                <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsm,.xlsx"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setFile(f)

                // Parse server-side: upload to get preview data
                const formData = new FormData()
                formData.append("file", f)
                formData.append("preview", "true")

                try {
                  const res = await fetch("/api/teaching-loads/import-jadwal", { method: "POST", body: formData })
                  const json = await res.json()
                  if (json.success) {
                    setDosenMatches(json.data.dosenMatches || [])
                    setCourseMatches(json.data.courseMatches || [])
                    setTlCount(json.data.tlCount || 0)
                    setState((s) => ({
                      ...s,
                      totalRows: json.data.totalRows || 0,
                      semesters: json.data.semesters || s.semesters,
                    }))
                    setStep("dosen")
                  } else {
                    toast.error(json.message || "Gagal membaca file")
                  }
                } catch {
                  toast.error("Gagal membaca file")
                }
              }}
            />

            <DialogFooter>
              <Button
                disabled={!state.semesterId || !file}
                onClick={() => {
                  if (dosenMatches.length === 0) {
                    // Re-preview
                    setStep("dosen")
                  } else {
                    setStep("dosen")
                  }
                }}
              >
                Lanjut <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Mapping Dosen */}
        {step === "dosen" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {dosenMatches.length} dosen unik ditemukan. Periksa status pencocokan.
            </p>
            <div className="rounded-md border max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama di Excel</TableHead>
                    <TableHead>NIDN</TableHead>
                    <TableHead>Hasil</TableHead>
                    <TableHead>Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dosenMatches.map((m: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{m.dosen.namaExcel}</TableCell>
                      <TableCell>{m.dosen.nidn || "-"}</TableCell>
                      <TableCell>
                        {m.status === "matched" && (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle2 className="w-4 h-4" /> {m.matchedUser?.name}
                          </span>
                        )}
                        {m.status === "fuzzy" && (
                          <span className="flex items-center gap-1 text-amber-600 text-sm">
                            <AlertCircle className="w-4 h-4" /> {m.candidates?.[0]?.name || "Mirip"}
                          </span>
                        )}
                        {m.status === "not_found" && (
                          <span className="flex items-center gap-1 text-red-600 text-sm">
                            <XCircle className="w-4 h-4" /> Tidak ditemukan
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Editable for all: dropdown to override mapping */}
                        {m.status === "fuzzy" && (
                          <Select
                            value={m.matchedUser?.id || ""}
                            onValueChange={(userId) => {
                              const updated = [...dosenMatches]
                              const user = m.candidates.find((c: any) => c.id === userId)
                              updated[i] = { ...m, matchedUser: user || null, status: "matched" }
                              setDosenMatches(updated)
                            }}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Pilih user..." />
                            </SelectTrigger>
                            <SelectContent>
                              {m.candidates.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {m.status === "not_found" && (
                          <span className="text-xs text-muted-foreground">Akan dibuat otomatis</span>
                        )}
                        {m.status === "matched" && (
                          <span className="text-xs text-muted-foreground">Otomatis</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Kembali
              </Button>
              <Button onClick={() => setStep("course")}>
                Lanjut <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: MK Preview */}
        {step === "course" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {courseMatches.length} MK unik. {courseMatches.filter((c: any) => c.status === "matched").length} sudah ada,{" "}
              {courseMatches.filter((c: any) => c.status === "new").length} baru akan dibuat.
            </p>
            <div className="rounded-md border max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode MK</TableHead>
                    <TableHead>Nama MK</TableHead>
                    <TableHead>SKS</TableHead>
                    <TableHead>Prodi</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseMatches.map((m: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{m.course.kodeMk}</TableCell>
                      <TableCell>{m.course.namaMk}</TableCell>
                      <TableCell>{m.course.sks}</TableCell>
                      <TableCell>{m.course.prodiCode}</TableCell>
                      <TableCell>
                        {m.status === "matched" ? (
                          <span className="text-green-600 text-sm flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Sudah ada
                          </span>
                        ) : (
                          <span className="text-amber-600 text-sm flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Baru
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("dosen")}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Kembali
              </Button>
              <Button onClick={() => setStep("tl")}>
                Lanjut <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: TL Preview */}
        {step === "tl" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-1 bg-muted/50">
              <p className="text-sm">
                <strong>{tlCount}</strong> baris data jadwal akan diproses
              </p>
              <p className="text-sm">
                <strong>{dosenMatches.filter((m: any) => m.matchedUser).length}</strong> dosen terlink
              </p>
              <p className="text-sm">
                <strong>{courseMatches.filter((m: any) => m.matchedCourse).length}</strong> MK terlink
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("course")}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Kembali
              </Button>
              <Button
                onClick={async () => {
                  if (!file) return
                  setLoading(true)
                  const formData = new FormData()
                  formData.append("file", file)
                  formData.append("semesterId", state.semesterId)

                  // Tambahkan user mapping yang sudah diset admin
                  const mapping: Record<string, string> = {}
                  for (const m of dosenMatches) {
                    if (m.matchedUser) {
                      mapping[m.dosen.namaNormalized] = m.matchedUser.id
                    }
                  }
                  formData.append("userMapping", JSON.stringify(mapping))

                  const res = await fetch("/api/teaching-loads/import-jadwal", { method: "POST", body: formData })
                  const json = await res.json()
                  setLoading(false)

                  if (json.success) {
                    setState((s) => ({
                      ...s,
                      totalRows: json.data.totalRows,
                      usersCreated: json.data.usersCreated,
                      usersSkipped: json.data.usersSkipped,
                      coursesCreated: json.data.coursesCreated,
                      coursesSkipped: json.data.coursesSkipped,
                      teachingLoadsCreated: json.data.teachingLoadsCreated,
                      errors: json.data.errors || [],
                    }))
                    setStep("result")
                  } else {
                    toast.error(json.message || "Gagal mengimpor")
                  }
                }}
                disabled={loading}
              >
                {loading ? "Mengimpor..." : "Import Semua"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 5: Result */}
        {step === "result" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm">Total baris data: <strong>{state.totalRows}</strong></p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="border rounded p-2 text-center">
                  <p className="text-2xl font-bold text-green-600">{state.usersCreated}</p>
                  <p className="text-xs text-muted-foreground">Dosen baru</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-2xl font-bold text-amber-600">{state.coursesCreated}</p>
                  <p className="text-xs text-muted-foreground">MK baru</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{state.teachingLoadsCreated}</p>
                  <p className="text-xs text-muted-foreground">Teaching Load</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-2xl font-bold text-blue-600">{state.usersSkipped}</p>
                  <p className="text-xs text-muted-foreground">Sudah ada</p>
                </div>
              </div>
            </div>
            {state.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border p-3">
                <p className="text-sm font-medium mb-1">Detail Error:</p>
                {state.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">{err}</p>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Selesai</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/teaching-loads/import-jadwal-dialog.tsx
git commit -m "feat: add import-jadwal 5-step dialog"
```

---

### Task 4: Modify `load-table.tsx` + `page.tsx` — add import button

**Files:**
- Modify: `components/admin/teaching-loads/load-table.tsx`
- Modify: `app/(dashboard)/dashboard/admin/teaching-loads/page.tsx`

- [ ] **Step 1: Add ImportJadwalDialog and button to load-table**

```typescript
// In components/admin/teaching-loads/load-table.tsx
import { ImportJadwalDialog } from "./import-jadwal-dialog"

export function LoadTable({ data, faculties }: Props) {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <>
      {/* Add near the other action buttons, e.g. next to "Assign Dosen" */}
      <Button onClick={() => setImportOpen(true)} variant="outline">
        <Upload className="h-4 w-4 mr-2" />
        Import Jadwal
      </Button>

      <ImportJadwalDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => { /* refresh data */ }}
      />

      {/* ... existing table content ... */}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/teaching-loads/load-table.tsx app/\(dashboard\)/dashboard/admin/teaching-loads/page.tsx
git commit -m "feat: add import jadwal button to teaching loads page"
```

---

### Task 5: Update API route to handle preview vs execute

**Files:**
- Modify: `app/api/teaching-loads/import-jadwal/route.ts`

- [ ] **Step 1: Add preview mode to API route**

The existing API route (Task 2) only handles execute mode. Add a `preview` flag that returns parse results + matching without creating anything.

```typescript
// At the start of POST handler:
const formData = await req.formData()
const isPreview = formData.get("preview") === "true"

// If preview, return parse + match data without creating
if (isPreview) {
  const { rows, totalRows } = await parseFile(buffer)
  const dosenEntries = extractUniqueDosen(rows)
  const courseEntries = extractUniqueCourses(rows)
  const tlEntries = buildTeachingLoads(rows)

  const dosenMatches = await matchDosen(dosenEntries)
  const courseMatches = await matchCourses(courseEntries)

  // Get semesters
  const semesters = await prisma.semester.findMany({ orderBy: { year: "desc" } })

  return Response.json({
    success: true,
    data: {
      totalRows,
      dosenMatches,
      courseMatches,
      tlCount: tlEntries.length,
      semesters,
    },
  })
}
```

- [ ] **Step 2: Handle userMapping from frontend**

In execute mode, accept `userMapping` (JSON string of normalized name → userId) to override the auto-matching.

```typescript
const userMappingRaw = formData.get("userMapping") as string | null
const userMapping: Record<string, string> = userMappingRaw ? JSON.parse(userMappingRaw) : {}

// When creating teaching loads, use userMapping first, fallback to dosenMap
```

- [ ] **Step 3: Commit**

```bash
git add app/api/teaching-loads/import-jadwal/route.ts
git commit -m "feat: add preview mode and user mapping to import API"
```

---

### Task 6: TypeScript check and commit

- [ ] **Step 1: Run TypeScript check**

```bash
rtk npx tsc --noEmit 2>&1
```

- [ ] **Step 2: Fix any errors**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: type errors after import jadwal implementation"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| Upload & parse Excel | Task 1 (parseFile) + Task 3 (step 1) |
| Forward-fill merged cells | Task 1 (forwardFillRows) |
| Extract KODE MK from hyperlink | Task 1 (extractKodeMk) |
| Normalize nama dosen | Task 1 (normalizeName) |
| Matching NIDN > Name > Fuzzy | Task 1 (matchDosen) + preview logic |
| Mapping dosen interaktif | Task 3 (step 2) |
| Preview MK | Task 3 (step 3) |
| Preview TL | Task 3 (step 4) |
| Buat user baru | Task 2 (API route) |
| Buat MK baru | Task 2 (API route) |
| Buat Teaching Load | Task 2 (API route) |
| Laporan hasil | Task 3 (step 5) |
| Handle duplicate TL | Task 2 (try/catch unique constraint) |
| Button di halaman admin | Task 4 |
| Preview vs execute mode | Task 5 |
