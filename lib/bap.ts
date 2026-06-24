import type { TDocumentDefinitions, BufferOptions } from "pdfmake/interfaces"
import path from "path"
import { loadLetterheadLogo, letterheadContent } from "@/lib/pdf-letterhead"
import { buildPhotoLampiran, type PhotoFile } from "@/lib/pdf-photo-lampiran"

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

const styles = {
  title: { font: "Roboto", fontSize: 13, bold: true, alignment: "center", decoration: "underline" },
  section: { font: "Roboto", fontSize: 10, bold: true },
}

interface BapData {
  facultyName: string
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
  photos: PhotoFile[]
}

function buildBapContent(data: BapData, logoBase64: string | null) {
  return [
    ...letterheadContent(logoBase64, data.facultyName),

    { text: "BERITA ACARA PERKULIAHAN", style: "title", margin: [0, 4, 0, 0] },
    { text: "(BAP)", style: "title", margin: [0, 2, 0, 16] },

    {
      table: {
        widths: ["auto", "auto", "*"],
        body: [
          [{ text: "Mata Kuliah" }, { text: ":" }, { text: `${data.courseName} (${data.courseCode}) \u2014 ${data.courseSks} SKS` }],
          [{ text: "Dosen Pengampu" }, { text: ":" }, { text: `${data.dosenName} \u2014 ${data.dosenNidn}` }],
          [{ text: "Program Studi" }, { text: ":" }, { text: data.prodiName }],
          [{ text: "Semester" }, { text: ":" }, { text: data.semesterName }],
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

    ...buildPhotoLampiran(data.photos),

    { text: "\n" },
    {
      columns: [
        { width: "*", text: "" },
        {
          width: "auto",
          alignment: "left",
          stack: [
            { text: "Serang, ____________________", margin: [0, 0, 0, 4] },
            { text: "Dosen Pengampu,", margin: [0, 0, 0, 50] },
            { text: "(__________________________)" },
            { text: data.dosenName, bold: true, margin: [0, 6, 0, 0] },
            { text: `NIDN. ${data.dosenNidn}`, margin: [0, 2, 0, 0] },
          ],
        },
      ],
    },
  ]
}

function createPrinter() {
  return new PdfPrinter(
    fonts,
    null,
    { resolve: () => {}, resolved: () => Promise.resolve() },
    () => true
  )
}

async function renderPdf(content: Record<string, unknown>[]): Promise<Buffer> {
  const printer = createPrinter()
  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 50, 40, 50],
    defaultStyle: { font: "Roboto", fontSize: 11 },
    content,
    styles,
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

export async function generateBapPdf(data: BapData): Promise<Buffer> {
  const logoBase64 = await loadLetterheadLogo()
  const content = buildBapContent(data, logoBase64)
  return renderPdf(content)
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
  semesterName: string,
  facultyName: string,
  photosByMeetingNumber: Map<number, PhotoFile[]>
): Promise<Buffer> {
  const logoBase64 = await loadLetterheadLogo()
  const allContent: Record<string, unknown>[] = []

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i]
    const photos = photosByMeetingNumber.get(s.meetingNumber) || []
    const content = buildBapContent({
      facultyName,
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
      photos,
    }, logoBase64)
    allContent.push(...content)
    if (i < sessions.length - 1) {
      allContent.push({ text: "", pageBreak: "after" })
    }
  }

  return renderPdf(allContent)
}
