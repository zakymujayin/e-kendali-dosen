import { prisma } from "./prisma"
import { generateExcel } from "./excel"
import { loadLetterheadLogo, letterheadContent } from "@/lib/pdf-letterhead"
import type { TDocumentDefinitions, BufferOptions } from "pdfmake/interfaces"
import path from "path"
import { format } from "date-fns"

// pdfmake CJS/ESM dual-export workaround for Next.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const m = require("pdfmake/js/Printer.js")
const PdfPrinter = m.default?.default || m.default || m
import { id } from "date-fns/locale"

const RB = path.resolve(process.cwd(), "node_modules/pdfmake/fonts/Roboto")
const fonts = {
  Roboto: {
    normal: RB + "/Roboto-Regular.ttf",
    bold: RB + "/Roboto-Medium.ttf",
    italics: RB + "/Roboto-Italic.ttf",
    bolditalics: RB + "/Roboto-MediumItalic.ttf",
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
  progressPercent: number
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
      const progressPercent = target > 0 ? Math.round((published / target) * 100) : 0

      return {
        code: tl.course.code, name: tl.course.name, sks: tl.course.sks,
        published, target, daring, luring,
        totalStudents, totalPresent, avgAttendance, progressPercent,
      }
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

  return {
    semester,
    reportDate: format(new Date(), "dd MMMM yyyy", { locale: id }),
    dosen,
  }
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

  return generateExcel(rows, "Laporan e-Kendali Dosen")
}

export async function generateBkdPdf(data: BkdReportData, facultyName: string): Promise<Buffer> {
  const logoBase64 = await loadLetterheadLogo()

  const printer = new PdfPrinter(
    fonts,
    null,
    { resolve: () => {}, resolved: () => Promise.resolve() },
    () => true
  )

  const body: unknown[][] = [
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
      body.push([
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
    pageMargins: [40, 50, 40, 50],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    content: [
      ...letterheadContent(logoBase64, facultyName),

      { text: "LAPORAN E-KENDALI DOSEN", style: "title", margin: [0, 4, 0, 4] },
      { text: `Semester: ${data.semester?.name || "-"} ${data.semester?.year || ""}`, style: "subtitle", margin: [0, 0, 0, 2] },
      { text: `Tanggal: ${data.reportDate}`, style: "subtitle", margin: [0, 0, 0, 12] },
      {
        table: { headerRows: 1, widths: ["auto", "*", "*", "auto", "auto", "auto", "auto", "auto"], body },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 12],
      },
      { text: `Ringkasan: ${data.dosen.length} dosen, ${summary.totalMk} MK, ${summary.totalPublished}/${summary.totalTarget} pertemuan`, italics: true, fontSize: 8, margin: [0, 0, 0, 16] },

      { text: "\n" },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            alignment: "left",
            stack: [
              { text: "Serang, ____________________", margin: [0, 0, 0, 4] },
              { text: "Mengetahui,", margin: [0, 0, 0, 4] },
              { text: "Dekan,", margin: [0, 0, 0, 40] },
              { text: "(__________________________)" },
              { text: "NIP. _________________________", margin: [0, 6, 0, 0] },
            ],
          },
        ],
      },
    ],
    styles: {
      title: { font: "Roboto", fontSize: 14, bold: true, alignment: "center" },
      subtitle: { font: "Roboto", fontSize: 10, alignment: "center" },
      tableHeader: { font: "Roboto", fontSize: 8.5, bold: true, fillColor: "#f0f0f0" },
    },
  }

  const options: BufferOptions = {}
  const pdfDoc = await printer.createPdfKitDocument(docDefinition, options)

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk))
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)))
    pdfDoc.on("error", reject)
    pdfDoc.end()
  })
}
