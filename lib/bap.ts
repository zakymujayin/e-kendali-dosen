import PdfPrinter from "pdfmake/js/Printer.js"
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
      { text: "KEMENTERIAN PENDIDIKAN DAN KEBUDAYAAN", style: "kop" },
      ...(data.facultyName
        ? [{ text: data.facultyName.toUpperCase(), style: "kop", margin: [0, 2, 0, 0] }]
        : []),
      { text: `PROGRAM STUDI ${data.prodiName.toUpperCase()}`, style: "kop", margin: [0, 2, 0, 0] },
      { text: "BERITA ACARA PERKULIAHAN", style: "title", margin: [0, 16, 0, 0] },
      { text: "(BAP)", style: "title", margin: [0, 2, 0, 16] },

      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 490, y2: 0, lineWidth: 1 }],
        margin: [0, 0, 0, 16],
      },

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
