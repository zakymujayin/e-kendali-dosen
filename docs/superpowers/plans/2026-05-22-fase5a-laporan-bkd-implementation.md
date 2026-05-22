# FASE 5a — Laporan BKD Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build BKD (Beban Kinerja Dosen) report with web UI + Excel + PDF export for all roles.

**Architecture:** Shared `lib/bkd-report.ts` contains the data query and Excel/PDF generators. API routes use it. Pages are server components that fetch data and render tables.

**Tech Stack:** exceljs (Excel), pdfmake (PDF), Prisma, shadcn/ui, date-fns

---

### Task 1: Create shared BKD report library

**Files:**
- Create: `lib/bkd-report.ts`

This is the core library containing:
1. `getBkdReport(filters)` — queries Prisma for BKD data
2. `generateBkdExcel(data)` — generates Excel Buffer
3. `generateBkdPdf(data, semesterName)` — generates PDF Buffer

- [ ] **Create lib/bkd-report.ts**

```typescript
import { prisma } from "./prisma"
import { generateExcel } from "./excel"
import PdfPrinter from "pdfmake"
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import { format } from "date-fns"
import { id } from "date-fns/locale"

const fonts = {
  Times: {
    normal: "Times-Roman", bold: "Times-Bold",
    italics: "Times-Italic", bolditalics: "Times-BoldItalic",
  },
  Helvetica: {
    normal: "Helvetica", bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique", bolditalics: "Helvetica-BoldOblique",
  },
}

export interface BkdFilter {
  semesterId?: string
  prodiId?: string
  userId?: string
}

export interface BkdDosenCourse {
  code: string
  name: string
  sks: number
  published: number
  target: number
  daring: number
  luring: number
  totalStudents: number
  totalPresent: number
  avgAttendance: number
}

export interface BkdDosen {
  id: string
  name: string
  nidn: string | null
  prodi: string
  totalSks: number
  totalMk: number
  totalPublished: number
  totalTarget: number
  progressPercent: number
  daringCount: number
  luringCount: number
  avgAttendance: number
  courses: BkdDosenCourse[]
}

export interface BkdReportData {
  semester: { id: string; name: string; year: string } | null
  reportDate: string
  dosen: BkdDosen[]
}

export async function getBkdReport(filters: BkdFilter): Promise<BkdReportData> {
  const semester = filters.semesterId
    ? await prisma.semester.findUnique({ where: { id: filters.semesterId }, select: { id: true, name: true, year: true } })
    : await prisma.semester.findFirst({ where: { isActive: true }, select: { id: true, name: true, year: true } })

  const whereTeachingLoad: Record<string, unknown> = {}
  if (semester) whereTeachingLoad.semesterId = semester.id
  if (filters.userId) whereTeachingLoad.userId = filters.userId
  if (filters.prodiId) {
    whereTeachingLoad.course = { prodiId: filters.prodiId }
  }

  const userWhere: Record<string, unknown> = { role: "DOSEN", isActive: true }
  if (filters.prodiId) userWhere.prodiId = filters.prodiId
  if (filters.userId) userWhere.id = filters.userId

  const users = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true, name: true, nidn: true,
      prodi: { select: { name: true } },
      teachingLoads: {
        where: semester ? { semesterId: semester.id } : {},
        select: {
          id: true,
          course: { select: { id: true, code: true, name: true, sks: true, totalMeeting: true } },
          sessions: {
            where: { status: "PUBLISHED" },
            select: { id: true, isDaring: true, studentPresent: true, studentTotal: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const dosen: BkdDosen[] = users.map((user) => {
    const courses: BkdDosenCourse[] = user.teachingLoads.map((tl) => {
      const published = tl.sessions.length
      const target = tl.course.totalMeeting
      const daring = tl.sessions.filter((s) => s.isDaring).length
      const luring = tl.sessions.filter((s) => !s.isDaring).length
      const totalStudents = tl.sessions.reduce((sum, s) => sum + s.studentTotal, 0)
      const totalPresent = tl.sessions.reduce((sum, s) => sum + s.studentPresent, 0)
      const avgAttendance = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0

      return { code: tl.course.code, name: tl.course.name, sks: tl.course.sks, published, target, daring, luring, totalStudents, totalPresent, avgAttendance }
    })

    const totalPublished = courses.reduce((s, c) => s + c.published, 0)
    const totalTarget = courses.reduce((s, c) => s + c.target, 0)
    const totalSks = courses.reduce((s, c) => s + c.sks, 0)
    const totalDaring = courses.reduce((s, c) => s + c.daring, 0)
    const totalLuring = courses.reduce((s, c) => s + c.luring, 0)
    const totalStudents = courses.reduce((s, c) => s + c.totalStudents, 0)
    const totalPresent = courses.reduce((s, c) => s + c.totalPresent, 0)
    const avgAttendance = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0
    const progressPercent = totalTarget > 0 ? Math.round((totalPublished / totalTarget) * 100) : 0

    return {
      id: user.id, name: user.name, nidn: user.nidn,
      prodi: user.prodi?.name || "-",
      totalSks, totalMk: courses.length,
      totalPublished, totalTarget, progressPercent,
      daringCount: totalDaring, luringCount: totalLuring,
      avgAttendance, courses,
    }
  })

  return { semester, reportDate: format(new Date(), "dd MMMM yyyy", { locale: id }), dosen }
}

export async function generateBkdExcel(data: BkdReportData): Promise<Buffer> {
  const rows: Record<string, unknown>[] = data.dosen.flatMap((d) =>
    d.courses.map((c) => ({
      Dosen: d.name,
      NIDN: d.nidn || "-",
      Prodi: d.prodi,
      "Kode MK": c.code,
      "Nama MK": c.name,
      SKS: c.sks,
      "Pertemuan Published": c.published,
      "Target Pertemuan": c.target,
      "Progress %": c.progressPercent,
      Daring: c.daring,
      Luring: c.luring,
      "Rata-rata Hadir %": c.avgAttendance,
    }))
  )

  return generateExcel(rows, "Laporan BKD")
}

export async function generateBkdPdf(data: BkdReportData): Promise<Buffer> {
  const printer = new PdfPrinter(fonts)

  const tableBody: unknown[][] = [
    [
      { text: "No", style: "tableHeader" },
      { text: "Dosen", style: "tableHeader" },
      { text: "MK", style: "tableHeader" },
      { text: "SKS", style: "tableHeader" },
      { text: "Pub", style: "tableHeader" },
      { text: "Target", style: "tableHeader" },
      { text: "Daring", style: "tableHeader" },
      { text: "Hadir%", style: "tableHeader" },
    ],
  ]

  let no = 1
  for (const d of data.dosen) {
    for (const c of d.courses) {
      tableBody.push([
        { text: String(no), alignment: "center" },
        d.name,
        `${c.code}\n${c.name}`,
        { text: String(c.sks), alignment: "center" },
        { text: String(c.published), alignment: "center" },
        { text: String(c.target), alignment: "center" },
        { text: String(c.daring), alignment: "center" },
        { text: `${c.avgAttendance}%`, alignment: "center" },
      ])
      no++
    }
  }

  const summary = data.dosen.reduce(
    (acc, d) => ({
      totalMk: acc.totalMk + d.totalMk,
      totalPublished: acc.totalPublished + d.totalPublished,
      totalTarget: acc.totalTarget + d.totalTarget,
    }),
    { totalMk: 0, totalPublished: 0, totalTarget: 0 }
  )

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: "Times", fontSize: 9 },
    content: [
      { text: "LAPORAN BEBAN KINERJA DOSEN (BKD)", style: "title", margin: [0, 0, 0, 4] },
      { text: `Semester: ${data.semester?.name || "-"} ${data.semester?.year || ""}`, style: "subtitle", margin: [0, 0, 0, 2] },
      { text: `Tanggal: ${data.reportDate}`, style: "subtitle", margin: [0, 0, 0, 12] },

      {
        table: { headerRows: 1, widths: ["auto", "*", "*", "auto", "auto", "auto", "auto", "auto"], body: tableBody },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 12],
      },

      { text: `Ringkasan: ${data.dosen.length} dosen, ${summary.totalMk} MK, ${summary.totalPublished}/${summary.totalTarget} pertemuan`, italics: true, fontSize: 8 },
    ],
    styles: {
      title: { font: "Helvetica", fontSize: 14, bold: true, alignment: "center" },
      subtitle: { font: "Helvetica", fontSize: 10, alignment: "center" },
      tableHeader: { font: "Helvetica", fontSize: 8, bold: true, fillColor: "#f0f0f0" },
    },
  }

  const pdfDoc = printer.createPdfKitDocument(docDefinition)
  const chunks: Buffer[] = []
  pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk))
  pdfDoc.on("end", () => {})
  return new Promise<Buffer>((resolve) => {
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)))
    pdfDoc.on("error", () => resolve(Buffer.concat(chunks)))
    pdfDoc.end()
  })
}
```

- [ ] **Commit**

```bash
git add lib/bkd-report.ts
git commit -m "feat: add shared BKD report library with Excel and PDF generation"
```

---

### Task 2: Create BKD report data API

**Files:**
- Create: `app/api/reports/bkd/route.ts`

- [ ] **Create data API**

```typescript
import { auth } from "@/lib/auth"
import { successResponse, errorResponse, unauthorized, forbidden } from "@/lib/api"
import { getBkdReport } from "@/lib/bkd-report"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(req.url)
    const semesterId = searchParams.get("semesterId") || undefined
    const prodiId = searchParams.get("prodiId") || undefined
    const userId = searchParams.get("userId") || undefined

    // Role-based access
    if (session.user.role === "DOSEN" && userId && userId !== session.user.id) return forbidden()
    if (session.user.role === "GKM" && prodiId && prodiId !== session.user.prodiId) return forbidden()

    const filters: Record<string, string | undefined> = { semesterId, prodiId, userId }

    // DOSEN can only see own data
    if (session.user.role === "DOSEN") filters.userId = session.user.id

    // GKM can only see own prodi
    if (session.user.role === "GKM" && !prodiId) filters.prodiId = session.user.prodiId

    const data = await getBkdReport(filters)
    return successResponse(data)
  } catch (error) {
    console.error("BKD report error:", error)
    return errorResponse("Server error", 500)
  }
}
```

- [ ] **Commit**

```bash
git add app/api/reports/bkd/route.ts
git commit -m "feat: add BKD report data API"
```

---

### Task 3: Create Excel export API

**Files:**
- Create: `app/api/reports/bkd/export-excel/route.ts`

- [ ] **Create Excel export API**

```typescript
import { auth } from "@/lib/auth"
import { errorResponse, unauthorized, forbidden } from "@/lib/api"
import { getBkdReport, generateBkdExcel } from "@/lib/bkd-report"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(req.url)
    const semesterId = searchParams.get("semesterId") || undefined
    const prodiId = searchParams.get("prodiId") || undefined
    const userId = searchParams.get("userId") || undefined

    if (session.user.role === "DOSEN" && userId && userId !== session.user.id) return forbidden()
    if (session.user.role === "GKM" && prodiId && prodiId !== session.user.prodiId) return forbidden()

    const filters: Record<string, string | undefined> = { semesterId, prodiId, userId }
    if (session.user.role === "DOSEN") filters.userId = session.user.id
    if (session.user.role === "GKM" && !prodiId) filters.prodiId = session.user.prodiId

    const data = await getBkdReport(filters)
    const buffer = await generateBkdExcel(data)

    const filename = `Laporan_BKD_${data.semester?.name || "semester"}_${data.semester?.year || ""}.xlsx`.replace(/\s+/g, "_")

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export Excel error:", error)
    return errorResponse("Server error", 500)
  }
}
```

- [ ] **Commit**

```bash
git add app/api/reports/bkd/export-excel/route.ts
git commit -m "feat: add BKD report Excel export API"
```

---

### Task 4: Create PDF export API

**Files:**
- Create: `app/api/reports/bkd/export-pdf/route.ts`

- [ ] **Create PDF export API**

```typescript
import { auth } from "@/lib/auth"
import { errorResponse, unauthorized, forbidden } from "@/lib/api"
import { getBkdReport, generateBkdPdf } from "@/lib/bkd-report"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(req.url)
    const semesterId = searchParams.get("semesterId") || undefined
    const prodiId = searchParams.get("prodiId") || undefined
    const userId = searchParams.get("userId") || undefined

    if (session.user.role === "DOSEN" && userId && userId !== session.user.id) return forbidden()
    if (session.user.role === "GKM" && prodiId && prodiId !== session.user.prodiId) return forbidden()

    const filters: Record<string, string | undefined> = { semesterId, prodiId, userId }
    if (session.user.role === "DOSEN") filters.userId = session.user.id
    if (session.user.role === "GKM" && !prodiId) filters.prodiId = session.user.prodiId

    const data = await getBkdReport(filters)
    const buffer = await generateBkdPdf(data)

    const filename = `Laporan_BKD_${data.semester?.name || "semester"}_${data.semester?.year || ""}.pdf`.replace(/\s+/g, "_")

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export PDF error:", error)
    return errorResponse("Server error", 500)
  }
}
```

- [ ] **Commit**

```bash
git add app/api/reports/bkd/export-pdf/route.ts
git commit -m "feat: add BKD report PDF export API"
```

---

### Task 5: Create Dosen reports page

**Files:**
- Create: `app/(dashboard)/dashboard/dosen/reports/page.tsx`

- [ ] **Create page**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DosenReportsClient } from "./reports-client"

export default async function DosenReportsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "DOSEN") redirect("/dashboard")

  const semesters = await prisma.semester.findMany({
    orderBy: [{ year: "desc" }, { term: "desc" }],
    select: { id: true, name: true, year: true, term: true, isActive: true },
  })

  const activeSemester = semesters.find((s) => s.isActive)

  return (
    <DosenReportsClient
      semesters={semesters}
      activeSemesterId={activeSemester?.id}
      userId={session.user.id}
    />
  )
}
```

- [ ] **Create client component**

Create `app/(dashboard)/dashboard/dosen/reports/reports-client.tsx`:

```typescript
"use client"

import { useState, useCallback } from "react"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, FileDown, Loader2 } from "lucide-react"

interface Semester {
  id: string; name: string; year: string; term: string; isActive: boolean
}

interface CourseData {
  code: string; name: string; sks: number
  published: number; target: number
  daring: number; luring: number
  avgAttendance: number
}

interface BkdData {
  semester: { id: string; name: string; year: string } | null
  reportDate: string
  dosen: Array<{
    id: string; name: string; nidn: string | null; prodi: string
    totalSks: number; totalMk: number
    totalPublished: number; totalTarget: number; progressPercent: number
    daringCount: number; luringCount: number; avgAttendance: number
    courses: CourseData[]
  }>
}

interface Props {
  semesters: Semester[]
  activeSemesterId?: string
  userId: string
}

export function DosenReportsClient({ semesters, activeSemesterId, userId }: Props) {
  const [semesterId, setSemesterId] = useState(activeSemesterId || "")
  const [data, setData] = useState<BkdData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (semesterId) params.set("semesterId", semesterId)
      const res = await fetch(`/api/reports/bkd?${params.toString()}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {}
    setLoading(false)
  }, [semesterId])

  const exportUrl = (type: "excel" | "pdf") => {
    const params = new URLSearchParams()
    if (semesterId) params.set("semesterId", semesterId)
    return `/api/reports/bkd/export-${type}?${params.toString()}`
  }

  const dosen = data?.dosen?.[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Laporan BKD</h1>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Semester</Label>
          <Select value={semesterId} onValueChange={setSemesterId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.year} {s.isActive ? "(Aktif)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={fetchData} disabled={loading || !semesterId}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Tampilkan
        </Button>
        {data && (
          <>
            <Button variant="outline" asChild>
              <a href={exportUrl("excel")}><Download className="h-4 w-4 mr-2" />Excel</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={exportUrl("pdf")}><FileText className="h-4 w-4 mr-2" />PDF</a>
            </Button>
          </>
        )}
      </div>

      {loading && <p className="text-muted-foreground">Memuat...</p>}

      {data && dosen && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total SKS</p>
              <p className="text-2xl font-bold">{dosen.totalSks}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold">{dosen.totalPublished}/{dosen.totalTarget}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Daring / Luring</p>
              <p className="text-2xl font-bold">{dosen.daringCount} / {dosen.luringCount}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Rata-rata Hadir</p>
              <p className="text-2xl font-bold">{dosen.avgAttendance}%</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detail per MK</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MK</TableHead>
                    <TableHead>SKS</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Daring</TableHead>
                    <TableHead>Luring</TableHead>
                    <TableHead>Hadir%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dosen.courses.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell><span className="font-medium">{c.code}</span><br /><span className="text-xs text-muted-foreground">{c.name}</span></TableCell>
                      <TableCell>{c.sks}</TableCell>
                      <TableCell>{c.published}</TableCell>
                      <TableCell>{c.target}</TableCell>
                      <TableCell>
                        <Badge variant={c.target > 0 && c.published >= c.target ? "default" : "secondary"}>
                          {c.target > 0 ? Math.round((c.published / c.target) * 100) : 0}%
                        </Badge>
                      </TableCell>
                      <TableCell>{c.daring}</TableCell>
                      <TableCell>{c.luring}</TableCell>
                      <TableCell>{c.avgAttendance}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {data && !dosen && (
        <p className="text-muted-foreground">Belum ada data untuk semester ini.</p>
      )}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/dosen/reports/page.tsx" "app/(dashboard)/dashboard/dosen/reports/reports-client.tsx"
git commit -m "feat: add dosen BKD report page"
```

---

### Task 6: Create Admin reports page

**Files:**
- Create: `app/(dashboard)/dashboard/admin/reports/page.tsx`
- Create: `app/(dashboard)/dashboard/admin/reports/reports-client.tsx`

- [ ] **Create admin page**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AdminReportsClient } from "./reports-client"

export default async function AdminReportsPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/dashboard")

  const semesters = await prisma.semester.findMany({
    orderBy: [{ year: "desc" }, { term: "desc" }],
    select: { id: true, name: true, year: true, term: true, isActive: true },
  })

  const prodiList = await prisma.prodi.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const activeSemester = semesters.find((s) => s.isActive)

  return (
    <AdminReportsClient
      semesters={semesters}
      prodiList={prodiList}
      activeSemesterId={activeSemester?.id}
    />
  )
}
```

- [ ] **Create admin client component**

```typescript
"use client"

import { useState, useCallback } from "react"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Loader2, Users, BookOpen, CheckCircle2, Clock } from "lucide-react"

interface Semester {
  id: string; name: string; year: string; term: string; isActive: boolean
}
interface Prodi { id: string; name: string }

interface BkdData {
  semester: { id: string; name: string; year: string } | null
  reportDate: string
  dosen: Array<{
    id: string; name: string; nidn: string | null; prodi: string
    totalSks: number; totalMk: number
    totalPublished: number; totalTarget: number; progressPercent: number
    daringCount: number; luringCount: number; avgAttendance: number
    courses: Array<{ code: string; name: string; sks: number; published: number; target: number; progressPercent: number; daring: number; luring: number; avgAttendance: number }>
  }>
}

interface Props {
  semesters: Semester[]
  prodiList: Prodi[]
  activeSemesterId?: string
}

export function AdminReportsClient({ semesters, prodiList, activeSemesterId }: Props) {
  const [semesterId, setSemesterId] = useState(activeSemesterId || "")
  const [prodiId, setProdiId] = useState("")
  const [data, setData] = useState<BkdData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedDosen, setExpandedDosen] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (semesterId) params.set("semesterId", semesterId)
      if (prodiId) params.set("prodiId", prodiId)
      const res = await fetch(`/api/reports/bkd?${params.toString()}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {}
    setLoading(false)
  }, [semesterId, prodiId])

  const exportUrl = (type: "excel" | "pdf") => {
    const params = new URLSearchParams()
    if (semesterId) params.set("semesterId", semesterId)
    if (prodiId) params.set("prodiId", prodiId)
    return `/api/reports/bkd/export-${type}?${params.toString()}`
  }

  const stats = data ? {
    totalDosen: data.dosen.length,
    totalMk: data.dosen.reduce((s, d) => s + d.totalMk, 0),
    totalPublished: data.dosen.reduce((s, d) => s + d.totalPublished, 0),
    totalTarget: data.dosen.reduce((s, d) => s + d.totalTarget, 0),
  } : null

  const expanded = data?.dosen.find((d) => d.id === expandedDosen)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan BKD — Admin</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Semester</Label>
          <Select value={semesterId} onValueChange={setSemesterId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Pilih" /></SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name} {s.year} {s.isActive ? "(Aktif)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prodi</Label>
          <Select value={prodiId} onValueChange={setProdiId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Semua Prodi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Prodi</SelectItem>
              {prodiList.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={fetchData} disabled={loading || !semesterId}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Tampilkan
        </Button>
        {data && (
          <>
            <Button variant="outline" asChild>
              <a href={exportUrl("excel")}><Download className="h-4 w-4 mr-2" />Excel</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={exportUrl("pdf")}><FileText className="h-4 w-4 mr-2" />PDF</a>
            </Button>
          </>
        )}
      </div>

      {loading && <p className="text-muted-foreground">Memuat...</p>}

      {data && stats && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Dosen</p>
              <p className="text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5" />{stats.totalDosen}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total MK</p>
              <p className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" />{stats.totalMk}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />{stats.totalPublished}/{stats.totalTarget}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Rata-rata Progress</p>
              <p className="text-2xl font-bold flex items-center gap-2"><Clock className="h-5 w-5" />{stats.totalTarget > 0 ? Math.round((stats.totalPublished / stats.totalTarget) * 100) : 0}%</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Daftar Dosen</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dosen</TableHead>
                    <TableHead>Prodi</TableHead>
                    <TableHead>MK</TableHead>
                    <TableHead>SKS</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Daring</TableHead>
                    <TableHead>Hadir%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dosen.map((d) => (
                    <>
                      <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedDosen(expandedDosen === d.id ? null : d.id)}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>{d.prodi}</TableCell>
                        <TableCell>{d.totalMk}</TableCell>
                        <TableCell>{d.totalSks}</TableCell>
                        <TableCell>
                          <Badge variant={d.progressPercent >= 100 ? "default" : "secondary"}>{d.progressPercent}%</Badge>
                        </TableCell>
                        <TableCell>{d.daringCount}/{d.luringCount}</TableCell>
                        <TableCell>{d.avgAttendance}%</TableCell>
                      </TableRow>
                      {expandedDosen === d.id && (
                        <TableRow key={`${d.id}-detail`}>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>MK</TableHead><TableHead>SKS</TableHead><TableHead>Pub</TableHead><TableHead>Target</TableHead><TableHead>%</TableHead><TableHead>Daring</TableHead><TableHead>Luring</TableHead><TableHead>Hadir%</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {d.courses.map((c, i) => (
                                  <TableRow key={i}>
                                    <TableCell><span className="font-medium">{c.code}</span><br /><span className="text-xs text-muted-foreground">{c.name}</span></TableCell>
                                    <TableCell>{c.sks}</TableCell><TableCell>{c.published}</TableCell><TableCell>{c.target}</TableCell>
                                    <TableCell><Badge variant={c.published >= c.target ? "default" : "secondary"}>{Math.round((c.published / c.target) * 100)}%</Badge></TableCell>
                                    <TableCell>{c.daring}</TableCell><TableCell>{c.luring}</TableCell><TableCell>{c.avgAttendance}%</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                  {data.dosen.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/admin/reports/page.tsx" "app/(dashboard)/dashboard/admin/reports/reports-client.tsx"
git commit -m "feat: add admin BKD report page"
```

---

### Task 7: Create GKM reports page

**Files:**
- Create: `app/(dashboard)/dashboard/gkm/reports/page.tsx`
- Create: `app/(dashboard)/dashboard/gkm/reports/reports-client.tsx`

GKM page is similar to Admin but with prodi filter locked to GKM's own prodi and dosen-level detail. Uses same client component pattern.

- [ ] **Create GKM page**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { GKMLaporanClient } from "./reports-client"

export default async function GKMReportsPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "GKM") redirect("/dashboard")

  if (!session.user.prodiId) return <p>Anda belum ditugaskan sebagai GKM prodi manapun.</p>

  const prodi = await prisma.prodi.findUnique({
    where: { id: session.user.prodiId },
    select: { id: true, name: true },
  })
  if (!prodi) return <p>Prodi tidak ditemukan.</p>

  const semesters = await prisma.semester.findMany({
    orderBy: [{ year: "desc" }, { term: "desc" }],
    select: { id: true, name: true, year: true, term: true, isActive: true },
  })

  const activeSemester = semesters.find((s) => s.isActive)

  return (
    <GKMLaporanClient
      prodiName={prodi.name}
      prodiId={prodi.id}
      semesters={semesters}
      activeSemesterId={activeSemester?.id}
    />
  )
}
```

- [ ] **Create GKM client component**

```typescript
"use client"

import { useState, useCallback } from "react"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Loader2, Users, BookOpen, CheckCircle2, Clock } from "lucide-react"

interface Semester { id: string; name: string; year: string; term: string; isActive: boolean }

interface BkdData {
  semester: { id: string; name: string; year: string } | null
  reportDate: string
  dosen: Array<{
    id: string; name: string; nidn: string | null; prodi: string
    totalSks: number; totalMk: number
    totalPublished: number; totalTarget: number; progressPercent: number
    daringCount: number; luringCount: number; avgAttendance: number
    courses: Array<{ code: string; name: string; sks: number; published: number; target: number; progressPercent: number; daring: number; luring: number; avgAttendance: number }>
  }>
}

interface Props {
  prodiName: string
  prodiId: string
  semesters: Semester[]
  activeSemesterId?: string
}

export function GKMLaporanClient({ prodiName, prodiId, semesters, activeSemesterId }: Props) {
  const [semesterId, setSemesterId] = useState(activeSemesterId || "")
  const [data, setData] = useState<BkdData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedDosen, setExpandedDosen] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (semesterId) params.set("semesterId", semesterId)
      params.set("prodiId", prodiId)
      const res = await fetch(`/api/reports/bkd?${params.toString()}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {}
    setLoading(false)
  }, [semesterId, prodiId])

  const exportUrl = (type: "excel" | "pdf") => {
    const params = new URLSearchParams()
    if (semesterId) params.set("semesterId", semesterId)
    params.set("prodiId", prodiId)
    return `/api/reports/bkd/export-${type}?${params.toString()}`
  }

  const stats = data ? {
    totalDosen: data.dosen.length,
    totalMk: data.dosen.reduce((s, d) => s + d.totalMk, 0),
    totalPublished: data.dosen.reduce((s, d) => s + d.totalPublished, 0),
    totalTarget: data.dosen.reduce((s, d) => s + d.totalTarget, 0),
  } : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan BKD — {prodiName}</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Semester</Label>
          <Select value={semesterId} onValueChange={setSemesterId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Pilih" /></SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name} {s.year} {s.isActive ? "(Aktif)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={fetchData} disabled={loading || !semesterId}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Tampilkan
        </Button>
        {data && (
          <>
            <Button variant="outline" asChild>
              <a href={exportUrl("excel")}><Download className="h-4 w-4 mr-2" />Excel</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={exportUrl("pdf")}><FileText className="h-4 w-4 mr-2" />PDF</a>
            </Button>
          </>
        )}
      </div>

      {loading && <p className="text-muted-foreground">Memuat...</p>}

      {data && stats && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Dosen</p>
              <p className="text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5" />{stats.totalDosen}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total MK</p>
              <p className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" />{stats.totalMk}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />{stats.totalPublished}/{stats.totalTarget}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Rata-rata Progress</p>
              <p className="text-2xl font-bold flex items-center gap-2"><Clock className="h-5 w-5" />{stats.totalTarget > 0 ? Math.round((stats.totalPublished / stats.totalTarget) * 100) : 0}%</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Daftar Dosen</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dosen</TableHead><TableHead>MK</TableHead><TableHead>SKS</TableHead><TableHead>Progress</TableHead><TableHead>Daring/Luring</TableHead><TableHead>Hadir%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dosen.map((d) => (
                    <>
                      <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedDosen(expandedDosen === d.id ? null : d.id)}>
                        <TableCell className="font-medium">{d.name}<br /><span className="text-xs text-muted-foreground">{d.nidn}</span></TableCell>
                        <TableCell>{d.totalMk}</TableCell><TableCell>{d.totalSks}</TableCell>
                        <TableCell><Badge variant={d.progressPercent >= 100 ? "default" : "secondary"}>{d.progressPercent}%</Badge></TableCell>
                        <TableCell>{d.daringCount}/{d.luringCount}</TableCell><TableCell>{d.avgAttendance}%</TableCell>
                      </TableRow>
                      {expandedDosen === d.id && (
                        <TableRow key={`${d.id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>MK</TableHead><TableHead>SKS</TableHead><TableHead>Pub</TableHead><TableHead>Target</TableHead><TableHead>%</TableHead><TableHead>Daring</TableHead><TableHead>Hadir%</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {d.courses.map((c, i) => (
                                  <TableRow key={i}>
                                    <TableCell><span className="font-medium">{c.code}</span><br /><span className="text-xs text-muted-foreground">{c.name}</span></TableCell>
                                    <TableCell>{c.sks}</TableCell><TableCell>{c.published}</TableCell><TableCell>{c.target}</TableCell>
                                    <TableCell><Badge variant={c.published >= c.target ? "default" : "secondary"}>{Math.round((c.published / c.target) * 100)}%</Badge></TableCell>
                                    <TableCell>{c.daring}</TableCell><TableCell>{c.avgAttendance}%</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                  {data.dosen.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/gkm/reports/page.tsx" "app/(dashboard)/dashboard/gkm/reports/reports-client.tsx"
git commit -m "feat: add GKM BKD report page"
```

---

### Task 8: Create Dekanat reports page

**Files:**
- Create: `app/(dashboard)/dashboard/dekanat/reports/page.tsx`
- Create: `app/(dashboard)/dashboard/dekanat/reports/reports-client.tsx`

Dekanat page is similar to Admin (full prodi + dosen filtering, cross-prodi).

- [ ] **Create dekanat page**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DekanatReportsClient } from "./reports-client"

export default async function DekanatReportsPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "DEKANAT") redirect("/dashboard")

  const semesters = await prisma.semester.findMany({
    orderBy: [{ year: "desc" }, { term: "desc" }],
    select: { id: true, name: true, year: true, term: true, isActive: true },
  })

  const prodiList = await prisma.prodi.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const activeSemester = semesters.find((s) => s.isActive)

  return (
    <DekanatReportsClient
      semesters={semesters}
      prodiList={prodiList}
      activeSemesterId={activeSemester?.id}
    />
  )
}
```

- [ ] **Create dekanat client component** (same pattern as Admin, but with dekanat-specific intro)

Create `app/(dashboard)/dashboard/dekanat/reports/reports-client.tsx`. Same code as Admin client component but with `<h1>Laporan BKD — Dekanat</h1>` and different function name `DekanatReportsClient`.

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/dekanat/reports/page.tsx" "app/(dashboard)/dashboard/dekanat/reports/reports-client.tsx"
git commit -m "feat: add dekanat BKD report page"
```

---

### Task 9: Build & push

- [ ] **Build**

```bash
npm run build
```

Expected: 0 errors, all routes registered including:
- `/dashboard/dosen/reports`
- `/dashboard/admin/reports`
- `/dashboard/gkm/reports`
- `/dashboard/dekanat/reports`
- `/api/reports/bkd`
- `/api/reports/bkd/export-excel`
- `/api/reports/bkd/export-pdf`

- [ ] **Push**

```bash
git push
```
