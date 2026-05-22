declare module "pdfmake/js/Printer.js" {
  import type { TDocumentDefinitions, BufferOptions } from "pdfmake/interfaces"

  class PdfPrinter {
    constructor(fonts: Record<string, Record<string, string>>)
    createPdfKitDocument(
      docDefinition: TDocumentDefinitions,
      options?: BufferOptions
    ): PDFKit.PDFDocument
  }

  export default PdfPrinter
}

declare module "pdfmake/interfaces" {
  interface TDocumentDefinitions {
    pageSize?: string | { width: number; height: number }
    pageMargins?: [number, number, number, number] | number
    defaultStyle?: Record<string, unknown>
    content: Record<string, unknown>[]
    styles?: Record<string, Record<string, unknown>>
    [key: string]: unknown
  }

  interface BufferOptions {
    [key: string]: unknown
  }
}
