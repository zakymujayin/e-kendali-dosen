import type { TDocumentDefinitions, BufferOptions } from "pdfmake/interfaces"
import path from "path"
import { loadLetterheadLogo, letterheadContent } from "@/lib/pdf-letterhead"

// pdfmake CJS/ESM dual-export workaround for Next.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const m = require("pdfmake/js/Printer.js")
const PdfPrinter = m.default?.default || m.default || m

const RB = path.resolve(process.cwd(), "node_modules/pdfmake/fonts/Roboto")
const fonts = {
  Roboto: {
    normal: RB + "/Roboto-Regular.ttf",
    bold: RB + "/Roboto-Medium.ttf",
    italics: RB + "/Roboto-Italic.ttf",
    bolditalics: RB + "/Roboto-MediumItalic.ttf",
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
  const logoBase64 = await loadLetterheadLogo()

  const printer = new PdfPrinter(
    fonts,
    null,
    { resolve: () => {}, resolved: () => Promise.resolve() },
    () => true
  )

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 50, 40, 50],
    defaultStyle: { font: "Roboto", fontSize: 11 },
    content: [
      ...letterheadContent(logoBase64),

      { text: "BERITA ACARA PERKULIAHAN", style: "title", margin: [0, 4, 0, 0] },
      { text: "(BAP)", style: "title", margin: [0, 2, 0, 16] },

      {
        table: {
          widths: ["auto", "auto", "*"],
          body: [
            [
              { text: "Mata Kuliah" },
              { text: ":" },
              { text: `${data.courseName} (${data.courseCode}) \u2014 ${data.courseSks} SKS` },
            ],
            [
              { text: "Dosen Pengampu" },
              { text: ":" },
              { text: `${data.dosenName} \u2014 ${data.dosenNidn}` },
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

      { text: "Detail Perkuliahan", style: "section", margin: [0, 0, 0, 8] },
      {
        table: {
          widths: ["auto", "auto", "*"],
          body: [
            [{ text: "Pertemuan ke-" }, { text: ":" }, { text: String(data.meetingNumber) }],
            [{ text: "Tanggal" }, { text: ":" }, { text: data.date }],
            [{ text: "Jam" }, { text: ":" }, { text: `${data.startTime} - ${data.endTime}` }],
            [{ text: "Topik" }, { text: ":" }, { text: data.topic }],
            [{ text: "Metode" }, { text: ":" }, { text: data.methodLabel }],
            [{ text: "Tipe" }, { text: ":" }, { text: data.sessionType }],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 12],
      },

      { text: "Kehadiran Mahasiswa", style: "section", margin: [0, 0, 0, 8] },
      {
        table: {
          widths: ["auto", "auto", "*"],
          body: [
            [{ text: "Hadir" }, { text: ":" }, { text: `${data.studentPresent} orang` }],
            [{ text: "Tidak Hadir" }, { text: ":" }, { text: `${data.studentAbsent} orang` }],
            [{ text: "Total" }, { text: ":" }, { text: `${data.studentTotal} orang` }],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 12],
      },

      ...(data.notes
        ? [
            { text: "Catatan", style: "section", margin: [0, 0, 0, 8] },
            { text: data.notes, margin: [0, 0, 0, 12], italics: true },
          ]
        : []),

      { text: "\n\n" },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            alignment: "left",
            stack: [
              { text: `Serang, ${data.date}`, margin: [0, 0, 0, 4] },
              { text: "Dosen Pengampu,", margin: [0, 0, 0, 50] },
              { text: data.dosenName, bold: true, decoration: "underline" },
              { text: `NIDN. ${data.dosenNidn}` },
            ],
          },
        ],
      },
    ],
    styles: {
      title: {
        font: "Roboto",
        fontSize: 13,
        bold: true,
        alignment: "center",
        decoration: "underline",
      },
      section: {
        font: "Roboto",
        fontSize: 10,
        bold: true,
      },
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

export async function generateBapBatchPdf(
  sessions: Array<{
    meetingNumber: number; date: string; startTime: string; endTime: string
    topic: string; method: string; sessionType: string
    studentPresent: number; studentAbsent: number; studentTotal: number
    notes: string | null
  }>,
  courseInfo: { code: string; name: string; sks: number },
  dosenInfo: { name: string; nidn: string | null },
  prodiName: string,
  semesterName: string
): Promise<Buffer> {
  const pdfBuffers: Buffer[] = []
  for (const s of sessions) {
    const buf = await generateBapPdf({
      universityName: "Universitas",
      prodiName,
      courseCode: courseInfo.code,
      courseName: courseInfo.name,
      courseSks: courseInfo.sks,
      dosenName: dosenInfo.name,
      dosenNidn: dosenInfo.nidn || "-",
      semesterName,
      meetingNumber: s.meetingNumber,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      topic: s.topic,
      methodLabel: s.method,
      sessionType: s.sessionType === "NORMAL" ? "Normal" : s.sessionType === "PENGGANTI" ? "Pengganti" : "Tambahan",
      studentPresent: s.studentPresent,
      studentAbsent: s.studentAbsent,
      studentTotal: s.studentTotal,
      notes: s.notes,
    })
    pdfBuffers.push(buf)
  }

  return Buffer.concat(pdfBuffers)
}
