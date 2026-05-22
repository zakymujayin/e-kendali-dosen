# FASE 3b — BAP, Documents, Monitoring Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Complete remaining FASE 3 features: BAP PDF generation, document file upload, session detail view, GKM monitoring, Dekanat monitoring.

**Architecture:** Server-side PDF via pdfmake, disk-based file upload to `public/uploads/`, read-only monitoring pages using existing `/api/sessions` endpoint with role-based filtering.

**Tech Stack:** pdfmake (PDF), Next.js file system (uploads), existing Prisma + shadcn UI patterns

---

### Task 1: Install pdfmake dependency

**Files:**
- Modify: `package.json`
- Install: node_modules

- [ ] **Install pdfmake**

```bash
npm install pdfmake
```

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pdfmake dependency for BAP generation"
```

---

### Task 2: Create BAP generation library

**Files:**
- Create: `lib/bap.ts`

This function takes a session with all related data and returns a PDF Buffer using pdfmake with standard fonts (no external font files needed).

- [ ] **Create lib/bap.ts**

```typescript
import PdfPrinter from "pdfmake"
import type { TDocumentDefinitions, BufferOptions } from "pdfmake/interfaces"

const fonts = {
  Times: {
    normal: "Times-Roman",
    bold: "Times-Bold",
    italics: "Times-Italic",
    bolditalics: "Times-BoldItalic",
  },
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
}

interface BapData {
  universityName: string
  facultyName?: string
  prodiName: string
  courseCode: string
  courseName: string
  courseSks: number
  dosenName: string
  dosenNidn: string
  semesterName: string
  meetingNumber: number
  date: string
  startTime: string
  endTime: string
  topic: string
  methodLabel: string
  sessionType: string
  studentPresent: number
  studentAbsent: number
  studentTotal: number
  notes?: string | null
}

export async function generateBapPdf(data: BapData): Promise<Buffer> {
  const printer = new PdfPrinter(fonts)

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [60, 50, 60, 50],
    defaultStyle: { font: "Times", fontSize: 11 },
    content: [
      // Kop
      { text: "KEMENTERIAN PENDIDIKAN DAN KEBUDAYAAN", style: "kop" },
      ...(data.facultyName
        ? [{ text: data.facultyName.toUpperCase(), style: "kop", margin: [0, 2, 0, 0] } as const]
        : []),
      { text: `PROGRAM STUDI ${data.prodiName.toUpperCase()}`, style: "kop", margin: [0, 2, 0, 0] },
      { text: "BERITA ACARA PERKULIAHAN", style: "title", margin: [0, 16, 0, 0] },
      { text: "(BAP)", style: "title", margin: [0, 2, 0, 16] },

      // Garis
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 490, y2: 0, lineWidth: 1 }],
        margin: [0, 0, 0, 16],
      },

      // Data
      {
        table: {
          widths: ["auto", "auto", "*"],
          body: [
            [
              { text: "Mata Kuliah", width: "auto" },
              { text: ":", width: "auto" },
              { text: `${data.courseName} (${data.courseCode}) — ${data.courseSks} SKS` },
            ],
            [
              { text: "Dosen Pengampu" },
              { text: ":" },
              { text: `${data.dosenName} — ${data.dosenNidn}` },
            ],
            [
              { text: "Program Studi" },
              { text: ":" },
              { text: data.prodiName },
            ],
            [
              { text: "Semester" },
              { text: ":" },
              { text: data.semesterName },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 12],
      },

      // Detail sesi
      { text: "Detail Perkuliahan", style: "section", margin: [0, 0, 0, 8] },
      {
        table: {
          widths: ["auto", "auto", "*"],
          body: [
            [
              { text: "Pertemuan ke-" },
              { text: ":" },
              { text: String(data.meetingNumber) },
            ],
            [
              { text: "Tanggal" },
              { text: ":" },
              { text: data.date },
            ],
            [
              { text: "Jam" },
              { text: ":" },
              { text: `${data.startTime} - ${data.endTime}` },
            ],
            [
              { text: "Topik" },
              { text: ":" },
              { text: data.topic },
            ],
            [
              { text: "Metode" },
              { text: ":" },
              { text: data.methodLabel },
            ],
            [
              { text: "Tipe" },
              { text: ":" },
              { text: data.sessionType },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 12],
      },

      // Kehadiran
      { text: "Kehadiran Mahasiswa", style: "section", margin: [0, 0, 0, 8] },
      {
        table: {
          widths: ["auto", "auto", "*"],
          body: [
            [
              { text: "Hadir" },
              { text: ":" },
              { text: `${data.studentPresent} orang` },
            ],
            [
              { text: "Tidak Hadir" },
              { text: ":" },
              { text: `${data.studentAbsent} orang` },
            ],
            [
              { text: "Total" },
              { text: ":" },
              { text: `${data.studentTotal} orang` },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 12],
      },

      // Catatan
      ...(data.notes
        ? [
            { text: "Catatan", style: "section", margin: [0, 0, 0, 8] },
            { text: data.notes, margin: [0, 0, 0, 12], italics: true },
          ]
        : []),

      // Tanda tangan
      { text: "\n\n\n" },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            alignment: "center",
            stack: [
              { text: "Dosen Pengampu,", margin: [0, 0, 0, 50] },
              { text: data.dosenName, bold: true },
              { text: `NIDN. ${data.dosenNidn}` },
            ],
          },
          { width: "*", text: "" },
        ],
      },
    ],
    styles: {
      kop: {
        font: "Helvetica",
        fontSize: 10,
        bold: true,
        alignment: "center",
        lineHeight: 1.2,
      },
      title: {
        font: "Helvetica",
        fontSize: 13,
        bold: true,
        alignment: "center",
        decoration: "underline",
      },
      section: {
        font: "Helvetica",
        fontSize: 10,
        bold: true,
      },
    },
  }

  const options: BufferOptions = {}
  const pdfDoc = printer.createPdfKitDocument(docDefinition, options)

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk))
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)))
    pdfDoc.on("error", reject)
    pdfDoc.end()
  })
}
```

- [ ] **Commit**

```bash
git add lib/bap.ts
git commit -m "feat: add BAP PDF generation library"
```

---

### Task 3: Create BAP download API endpoint

**Files:**
- Create: `app/api/sessions/[id]/bap/route.ts`

- [ ] **Create BAP API route**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { errorResponse, unauthorized, notFound, forbidden } from "@/lib/api"
import { generateBapPdf } from "@/lib/bap"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { METHOD_LABELS } from "@/lib/constants"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const lectureSession = await prisma.lectureSession.findUnique({
      where: { id },
      include: {
        teachingLoad: {
          include: {
            course: { include: { prodi: true } },
            user: { select: { id: true, name: true, nidn: true } },
            semester: true,
          },
        },
      },
    })

    if (!lectureSession) return notFound()
    if (lectureSession.teachingLoad.userId !== session.user.id) return forbidden()
    if (lectureSession.status !== "PUBLISHED") {
      return errorResponse("BAP hanya bisa diunduh untuk sesi yang sudah dipublish", 400)
    }

    const tl = lectureSession.teachingLoad

    const pdfBuffer = await generateBapPdf({
      universityName: "Universitas",
      facultyName: tl.course.prodi?.facultyId || undefined,
      prodiName: tl.course.prodi?.name || "-",
      courseCode: tl.course.code,
      courseName: tl.course.name,
      courseSks: tl.course.sks,
      dosenName: tl.user.name || "-",
      dosenNidn: tl.user.nidn || "-",
      semesterName: `${tl.semester.name} ${tl.semester.year}`,
      meetingNumber: lectureSession.meetingNumber,
      date: format(new Date(lectureSession.date), "dd MMMM yyyy", { locale: id }),
      startTime: lectureSession.startTime,
      endTime: lectureSession.endTime,
      topic: lectureSession.topic,
      methodLabel: METHOD_LABELS[lectureSession.method] || lectureSession.method,
      sessionType:
        lectureSession.sessionType === "NORMAL"
          ? "Normal"
          : lectureSession.sessionType === "PENGGANTI"
          ? "Pengganti"
          : "Tambahan",
      studentPresent: lectureSession.studentPresent,
      studentAbsent: lectureSession.studentAbsent,
      studentTotal: lectureSession.studentTotal,
      notes: lectureSession.notes,
    })

    // Update bapGeneratedAt
    await prisma.lectureSession.update({
      where: { id },
      data: { bapGeneratedAt: new Date() },
    })

    const filename = `BAP_${tl.course.code}_TM${lectureSession.meetingNumber}_${format(new Date(lectureSession.date), "yyyyMMdd")}.pdf`

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("BAP generation error:", error)
    return errorResponse("Gagal generate BAP", 500)
  }
}
```

- [ ] **Commit**

```bash
git add app/api/sessions/\[id\]/bap/route.ts
git commit -m "feat: add BAP download API endpoint"
```

---

### Task 4: Update Document API — actual file storage

**Files:**
- Modify: `app/api/documents/route.ts`
- Modify: `app/api/documents/[id]/route.ts`

- [ ] **Rewrite POST /api/documents to save file to disk**

Replace `app/api/documents/route.ts` entirely:

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, notFound, forbidden } from "@/lib/api"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const sessionId = formData.get("sessionId") as string | null

    if (!file || !sessionId) return errorResponse("File dan sessionId wajib diisi", 400)

    const lectureSession = await prisma.lectureSession.findUnique({
      where: { id: sessionId },
      include: { teachingLoad: true },
    })
    if (!lectureSession) return notFound()
    if (lectureSession.teachingLoad.userId !== session.user.id) return forbidden()

    const allowedTypes = ["pdf", "docx", "jpg", "jpeg", "png"]
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!ext || !allowedTypes.includes(ext)) {
      return errorResponse("Tipe file tidak didukung (PDF, DOCX, JPG, PNG)", 400)
    }

    if (file.size > 10485760) {
      return errorResponse("File maksimal 10MB", 400)
    }

    // Save file to disk
    const timestamp = Date.now()
    const safeFilename = `${timestamp}-${file.name}`
    const uploadDir = join(process.cwd(), "public", "uploads", "documents", sessionId)
    const filePath = join(uploadDir, safeFilename)

    await mkdir(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    const fileUrl = `/uploads/documents/${sessionId}/${safeFilename}`

    const doc = await prisma.document.create({
      data: {
        sessionId,
        name: file.name,
        fileUrl,
        fileType: ext,
        fileSize: file.size,
      },
    })

    return successResponse(doc, "Dokumen berhasil diupload")
  } catch (error) {
    console.error("Upload document error:", error)
    return errorResponse("Server error", 500)
  }
}
```

- [ ] **Rewrite GET /api/documents/[id] to redirect to file**

Replace `app/api/documents/[id]/route.ts` entirely:

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, notFound, forbidden } from "@/lib/api"
import { unlink } from "fs/promises"
import { join } from "path"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { session: { include: { teachingLoad: true } } },
    })
    if (!doc) return notFound()

    return successResponse(doc)
  } catch (error) {
    console.error("Get document error:", error)
    return errorResponse("Server error", 500)
  }
}

// Update DELETE to also remove file from disk
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { session: { include: { teachingLoad: true } } },
    })
    if (!doc) return notFound()
    if (doc.session.teachingLoad.userId !== session.user.id) return forbidden()
    if (doc.session.status !== "DRAFT") return errorResponse("Hanya bisa menghapus dokumen pada sesi DRAFT", 400)

    // Delete file from disk
    try {
      const filePath = join(process.cwd(), "public", doc.fileUrl)
      await unlink(filePath)
    } catch {
      // File already removed or never existed — proceed with DB delete
    }

    await prisma.document.delete({ where: { id } })

    return successResponse(null, "Dokumen berhasil dihapus")
  } catch (error) {
    console.error("Delete document error:", error)
    return errorResponse("Server error", 500)
  }
}
```

- [ ] **Commit**

```bash
git add app/api/documents/route.ts app/api/documents/\[id\]/route.ts
git commit -m "feat: actual file upload storage for documents"
```

---

### Task 5: Create Session Detail View page

**Files:**
- Create: `app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/[sessionId]/page.tsx`

- [ ] **Create session detail page**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Globe, Download, FileText } from "lucide-react"
import { METHOD_LABELS } from "@/lib/constants"

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>
}) {
  const { courseId, sessionId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const lectureSession = await prisma.lectureSession.findUnique({
    where: { id: sessionId },
    include: {
      teachingLoad: {
        include: {
          course: true,
          user: { select: { id: true, name: true, nidn: true } },
          semester: true,
        },
      },
      documents: {
        select: { id: true, name: true, fileUrl: true, fileType: true, fileSize: true, createdAt: true },
      },
    },
  })

  if (!lectureSession) return notFound()
  if (lectureSession.teachingLoad.userId !== session.user.id) {
    return notFound()
  }

  const tl = lectureSession.teachingLoad

  const typeLabel =
    lectureSession.sessionType === "NORMAL"
      ? "Normal"
      : lectureSession.sessionType === "PENGGANTI"
      ? "Pengganti"
      : "Tambahan"

  const statusVariant = lectureSession.status === "PUBLISHED" ? "default" : "secondary"

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/dosen/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Detail Sesi — Pertemuan ke-{lectureSession.meetingNumber}
          </h1>
          <p className="text-muted-foreground">
            {tl.course.name} ({tl.course.code})
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tanggal</p>
            <p className="font-semibold">
              {format(new Date(lectureSession.date), "dd MMM yyyy", { locale: id })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Jam</p>
            <p className="font-semibold">
              {lectureSession.startTime} - {lectureSession.endTime}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Metode</p>
            <p className="font-semibold">{METHOD_LABELS[lectureSession.method] || lectureSession.method}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={statusVariant}>{lectureSession.status}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Session Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Sesi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Topik</span>
              <span className="font-medium text-right max-w-[200px]">{lectureSession.topic}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipe</span>
              <span>{typeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dosen</span>
              <span>{tl.user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Semester</span>
              <span>{tl.semester.name} {tl.semester.year}</span>
            </div>
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kehadiran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hadir</span>
              <span className="font-medium">{lectureSession.studentPresent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tidak Hadir</span>
              <span className="font-medium">{lectureSession.studentAbsent}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Total</span>
              <span className="font-bold">{lectureSession.studentTotal}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPS / URL Info */}
      {lectureSession.isDaring && lectureSession.platformUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" /> URL Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={lectureSession.platformUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {lectureSession.platformUrl}
            </a>
          </CardContent>
        </Card>
      )}

      {!lectureSession.isDaring && lectureSession.latitude && lectureSession.longitude && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Lokasi GPS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-4">
              <span>Lat: {lectureSession.latitude}</span>
              <span>Lng: {lectureSession.longitude}</span>
            </div>
            {lectureSession.distanceMeters && (
              <p>Jarak dari kampus: {Math.round(lectureSession.distanceMeters)}m</p>
            )}
            {lectureSession.gpsAccuracy && (
              <p>Akurasi: {lectureSession.gpsAccuracy}m</p>
            )}
            <Badge variant={lectureSession.isGpsValid ? "default" : "destructive"}>
              {lectureSession.isGpsValid ? "Lokasi Valid" : "Lokasi Tidak Valid"}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {lectureSession.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catatan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{lectureSession.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {lectureSession.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Dokumen ({lectureSession.documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lectureSession.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doc.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(doc.fileSize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BAP Download */}
      {lectureSession.status === "PUBLISHED" && (
        <div className="flex justify-end">
          <Button asChild>
            <a href={`/api/sessions/${lectureSession.id}/bap`} target="_blank">
              <Download className="h-4 w-4 mr-2" />
              Download BAP
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/[sessionId]/page.tsx"
git commit -m "feat: add session detail view page with BAP download"
```

---

### Task 6: Update Session Table — replace disabled download with View link

**Files:**
- Modify: `components/dosen/session-table.tsx`

- [ ] **Update session-table.tsx**

Change the disabled `FileDown` button for PUBLISHED sessions to an active `FileDown` link to the detail page:

Replace lines 113-117:
```tsx
                    {s.status === "PUBLISHED" && (
                      <Button variant="ghost" size="icon" disabled>
                        <FileDown className="h-4 w-4" />
                      </Button>
                    )}
```

With:
```tsx
                    {s.status === "PUBLISHED" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/dashboard/dosen/courses/${courseId}/sessions/${s.id}`)}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                    )}
```

- [ ] **Commit**

```bash
git add components/dosen/session-table.tsx
git commit -m "feat: enable session detail view button for published sessions"
```

---

### Task 7: Create GKM Monitoring page

**Files:**
- Create: `app/(dashboard)/dashboard/gkm/monitoring/page.tsx`

This page uses `GET /api/sessions` which auto-filters by GKM's prodiId. It adds date range and dosen filters.

- [ ] **Create GKM monitoring page**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { MonitoringClient } from "./monitoring-client"

export default async function GKMMonitoringPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "GKM") redirect("/dashboard")
  if (!session.user.prodiId) return <p>Anda belum ditugaskan sebagai GKM prodi manapun.</p>

  const prodi = await prisma.prodi.findUnique({
    where: { id: session.user.prodiId },
    select: { id: true, name: true },
  })
  if (!prodi) return <p>Prodi tidak ditemukan.</p>

  const dosenList = await prisma.user.findMany({
    where: { prodiId: session.user.prodiId, role: "DOSEN", isActive: true },
    select: { id: true, name: true, nidn: true },
    orderBy: { name: "asc" },
  })

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, year: true },
  })

  return (
    <MonitoringClient
      prodiName={prodi.name}
      dosenList={dosenList}
      semesterId={semester?.id}
    />
  )
}
```

And create the client component:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Users, BookOpen, CheckCircle2, Clock } from "lucide-react"
import { METHOD_LABELS } from "@/lib/constants"

interface DosenItem {
  id: string
  name: string
  nidn: string | null
}

interface SessionItem {
  id: string
  meetingNumber: number
  date: string
  startTime: string
  endTime: string
  topic: string
  method: string
  status: string
  teachingLoad: {
    user: { id: string; name: string; nidn: string | null }
    course: { id: string; name: string; code: string }
  }
}

interface Props {
  prodiName: string
  dosenList: DosenItem[]
  semesterId?: string
}

export function MonitoringClient({ prodiName, dosenList, semesterId }: Props) {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDosen, setSelectedDosen] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedDosen) params.set("userId", selectedDosen)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      params.set("limit", "200")

      const res = await fetch(`/api/sessions?${params.toString()}`)
      const json = await res.json()
      if (json.success) setSessions(json.data)
    } catch {}
    setLoading(false)
  }, [selectedDosen, dateFrom, dateTo])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const stats = {
    total: sessions.length,
    published: sessions.filter((s) => s.status === "PUBLISHED").length,
    draft: sessions.filter((s) => s.status === "DRAFT").length,
    dosenCount: new Set(sessions.map((s) => s.teachingLoad.user.id)).size,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Monitoring Perkuliahan — {prodiName}</h1>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sesi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <BookOpen className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dosen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dosenCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Dosen</Label>
          <Select value={selectedDosen} onValueChange={setSelectedDosen}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Semua Dosen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Dosen</SelectItem>
              {dosenList.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dari Tanggal</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sampai Tanggal</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Sesi Perkuliahan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dosen</TableHead>
                <TableHead>MK</TableHead>
                <TableHead>TM</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Topik</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Belum ada sesi
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.teachingLoad.user.name}</TableCell>
                    <TableCell>{s.teachingLoad.course.name}</TableCell>
                    <TableCell>{s.meetingNumber}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(s.date), "dd MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{s.startTime}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{s.topic}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{METHOD_LABELS[s.method] || s.method}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "PUBLISHED" ? "default" : "secondary"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

Note: The `/api/sessions` endpoint currently doesn't support `dateFrom`/`dateTo` filters. The client-side filtering will be sufficient for now.

- [ ] **Create page.tsx and monitoring-client.tsx**

Create `app/(dashboard)/dashboard/gkm/monitoring/page.tsx` with the server component and `app/(dashboard)/dashboard/gkm/monitoring/monitoring-client.tsx` with the client component.

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/gkm/monitoring/page.tsx" "app/(dashboard)/dashboard/gkm/monitoring/monitoring-client.tsx"
git commit -m "feat: add GKM monitoring page with filters"
```

---

### Task 8: Create Dekanat Monitoring page

**Files:**
- Create: `app/(dashboard)/dashboard/dekanat/monitoring/page.tsx`
- Create: `app/(dashboard)/dashboard/dekanat/monitoring/monitoring-client.tsx`

- [ ] **Create Dekanat monitoring server page**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { MonitoringClient } from "./monitoring-client"

export default async function DekanatMonitoringPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "DEKANAT") redirect("/dashboard")

  const prodiList = await prisma.prodi.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, year: true },
  })

  const allDosen = await prisma.user.findMany({
    where: { role: "DOSEN", isActive: true },
    select: { id: true, name: true, nidn: true, prodiId: true },
    orderBy: { name: "asc" },
  })

  return (
    <MonitoringClient
      prodiList={prodiList}
      allDosen={allDosen}
      semesterId={semester?.id}
    />
  )
}
```

- [ ] **Create Dekanat monitoring client component**

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Building2, Users, CheckCircle2, Clock } from "lucide-react"
import { METHOD_LABELS } from "@/lib/constants"

interface ProdiItem {
  id: string
  name: string
}

interface DosenItem {
  id: string
  name: string
  nidn: string | null
  prodiId: string | null
}

interface SessionItem {
  id: string
  meetingNumber: number
  date: string
  startTime: string
  endTime: string
  topic: string
  method: string
  status: string
  teachingLoad: {
    user: { id: string; name: string; nidn: string | null }
    course: { id: string; name: string; code: string; prodi?: { id: string; name: string } | null }
  }
}

interface Props {
  prodiList: ProdiItem[]
  allDosen: DosenItem[]
  semesterId?: string
}

export function MonitoringClient({ prodiList, allDosen, semesterId }: Props) {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProdi, setSelectedProdi] = useState("")
  const [selectedDosen, setSelectedDosen] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const filteredDosen = selectedProdi
    ? allDosen.filter((d) => d.prodiId === selectedProdi)
    : allDosen

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedProdi) params.set("prodiId", selectedProdi)
      if (selectedDosen) params.set("userId", selectedDosen)
      params.set("limit", "200")

      const res = await fetch(`/api/sessions?${params.toString()}`)
      const json = await res.json()
      if (json.success) setSessions(json.data)
    } catch {}
    setLoading(false)
  }, [selectedProdi, selectedDosen])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const stats = {
    total: sessions.length,
    published: sessions.filter((s) => s.status === "PUBLISHED").length,
    draft: sessions.filter((s) => s.status === "DRAFT").length,
    prodiCount: new Set(sessions.map((s) => s.teachingLoad.course.prodi?.id)).size,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Monitoring Perkuliahan — Dekanat</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sesi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prodi</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prodiCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Prodi</Label>
          <Select value={selectedProdi} onValueChange={(v) => { setSelectedProdi(v); setSelectedDosen("") }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Semua Prodi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Prodi</SelectItem>
              {prodiList.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dosen</Label>
          <Select value={selectedDosen} onValueChange={setSelectedDosen}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Semua Dosen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Dosen</SelectItem>
              {filteredDosen.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dari Tanggal</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sampai Tanggal</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Sesi Perkuliahan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodi</TableHead>
                <TableHead>Dosen</TableHead>
                <TableHead>MK</TableHead>
                <TableHead>TM</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Belum ada sesi
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.teachingLoad.course.prodi?.name || "-"}</TableCell>
                    <TableCell className="font-medium">{s.teachingLoad.user.name}</TableCell>
                    <TableCell>{s.teachingLoad.course.name}</TableCell>
                    <TableCell>{s.meetingNumber}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(s.date), "dd MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{s.startTime}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{METHOD_LABELS[s.method] || s.method}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "PUBLISHED" ? "default" : "secondary"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

Wait — the `/api/sessions` GET endpoint doesn't return course.prodi info for DEKANAT sessions. Let me check...

Looking at `app/api/sessions/route.ts`, the GET endpoint includes:
```ts
course: { select: { id: true, name: true, code: true, sks: true } },
```

It doesn't include `prodi`. For DEKANAT monitoring, we need prodi name. We need to add `prodi: { select: { id: true, name: true } }` to the course include.

So we need to also update the sessions GET endpoint.

- [ ] **Update sessions API to include prodi info**

In `app/api/sessions/route.ts`, change the course include:
```typescript
course: { select: { id: true, name: true, code: true, sks: true, prodiId: true, prodi: { select: { id: true, name: true } } } },
```

- [ ] **Create the Dekanat monitoring files**

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/dekanat/monitoring/page.tsx" "app/(dashboard)/dashboard/dekanat/monitoring/monitoring-client.tsx" app/api/sessions/route.ts
git commit -m "feat: add Dekanat monitoring page with prodi/dosen filters"
```

---

### Task 9: Build & verify

- [ ] **Run build**

```bash
npm run build
```

Expected: 0 errors, 0 warnings.

- [ ] **Verify route listing includes all new pages**

Check output contains:
- `/dashboard/dosen/courses/[courseId]/sessions/[sessionId]` (detail view)
- `/dashboard/gkm/monitoring` 
- `/dashboard/dekanat/monitoring`
- `/api/sessions/[id]/bap`
- `/api/documents` (POST) still works

- [ ] **Commit any fixes**

```bash
git add -A
git commit -m "fix: build fixes for FASE 3b"
```

- [ ] **Push to GitHub**

```bash
git push
```
