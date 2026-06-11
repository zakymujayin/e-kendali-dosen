import type { TDocumentDefinitions, BufferOptions } from "pdfmake/interfaces"
import path from "path"
import { MAX_DARING } from "@/lib/constants"
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

export interface JurnalData {
  kopInstitusi: string
  kopSubtitle: string
  namaDosen: string
  nidn: string
  prodi: string
  mataKuliah: string
  kodeMK: string
  sks: number
  kelas: string
  semester: string
  kaprodiNama: string | null
  kaprodiNip: string | null
  pertemuan: {
    no: number
    tanggal: string
    materi: string
    metode: string
  }[]
}

export async function generateJurnalPdf(data: JurnalData): Promise<Buffer> {
  const logoBase64 = await loadLetterheadLogo()

  const printer = new PdfPrinter(
    fonts,
    null,
    { resolve: () => {}, resolved: () => Promise.resolve() },
    () => true
  )

  const tableBody: unknown[][] = [
    [
      { text: "No", style: "tableHeader", alignment: "center" },
      { text: "Tanggal", style: "tableHeader", alignment: "center" },
      { text: "Materi", style: "tableHeader" },
      { text: "L/D", style: "tableHeader", alignment: "center" },
      { text: "TTD", style: "tableHeader", alignment: "center" },
    ],
  ]

  for (let i = 0; i < data.pertemuan.length; i++) {
    const p = data.pertemuan[i]
    const metodeLabel = p.metode === "Daring" ? "D" : p.metode === "Luring" ? "L" : ""
    tableBody.push([
      { text: String(p.no), alignment: "center" },
      { text: p.tanggal || "", alignment: "center" },
      { text: p.materi || "" },
      { text: metodeLabel, alignment: "center" },
      { text: "", alignment: "center" },
    ])
  }

  const daringCount = data.pertemuan.filter((p) => p.metode === "Daring").length
  const terlaksana = data.pertemuan.filter((p) => p.materi).length
  const totalPertemuan = data.pertemuan.length
  const daringNote =
    daringCount > MAX_DARING
      ? `Jumlah sesi daring: ${daringCount} (melebihi kuota ${MAX_DARING})`
      : `Jumlah sesi daring: ${daringCount}`

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [40, 50, 40, 40],
    defaultStyle: { font: "Roboto", fontSize: 10 },
    content: [
      ...letterheadContent(logoBase64),

      { text: "DAFTAR HADIR DOSEN", style: "title", margin: [0, 0, 0, 10] },

      {
        table: {
          widths: ["auto", "auto", "*"],
          body: [
            [
              { text: "Nama Dosen", bold: true },
              { text: ":" },
              { text: `${data.namaDosen} — NIDN. ${data.nidn}` },
            ],
            [
              { text: "Prodi", bold: true },
              { text: ":" },
              { text: data.prodi },
            ],
            [
              { text: "Mata Kuliah", bold: true },
              { text: ":" },
              { text: `${data.mataKuliah} (${data.kodeMK}) — ${data.sks} SKS` },
            ],
            [
              { text: "Kelas", bold: true },
              { text: ":" },
              { text: data.kelas || "-" },
            ],
            [
              { text: "Semester", bold: true },
              { text: ":" },
              { text: data.semester },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 12],
      },

      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "*", "auto", 70],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#000",
          vLineColor: () => "#000",
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 16],
      },

      {
        text: [
          { text: "Keterangan: ", bold: true },
          "L = Luring (tatap muka), D = Daring (kuliah online)",
        ],
        fontSize: 9,
        margin: [0, 0, 0, 4],
      },

      {
        text: `Jumlah pertemuan terlaksana: ${terlaksana} dari ${totalPertemuan}`,
        fontSize: 9,
        margin: [0, 0, 0, 4],
      },

      {
        text: daringNote,
        fontSize: 9,
        italics: true,
        color: daringCount > MAX_DARING ? "#92400e" : "#000",
        margin: [0, 0, 0, 8],
      },

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
              { text: "Ketua Program Studi,", margin: [0, 0, 0, 40] },
              { text: "(__________________________)" },
              ...(data.kaprodiNama ? [{ text: data.kaprodiNama, bold: true, margin: [0, 6, 0, 0] }] : []),
              ...(data.kaprodiNip ? [{ text: `NIP. ${data.kaprodiNip}`, margin: [0, 2, 0, 0] }] : [{ text: "NIP.", margin: [0, 4, 0, 0] }]),
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
      tableHeader: {
        font: "Roboto",
        fontSize: 9,
        bold: true,
        fillColor: "#f0f0f0",
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
