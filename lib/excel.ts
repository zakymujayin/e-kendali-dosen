import ExcelJS from "exceljs"

export async function parseExcel<T>(buffer: ArrayBuffer | Buffer): Promise<T[]> {
  const workbook = new ExcelJS.Workbook()
  const data = buffer instanceof Buffer ? new Uint8Array(buffer.buffer as ArrayBuffer) : new Uint8Array(buffer)
  await workbook.xlsx.load(data as any)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const headers: string[] = []
  const headerRow = worksheet.getRow(1)
  headerRow.eachCell((cell) => {
    headers.push(String(cell.value ?? ""))
  })

  const rows: T[] = []
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const obj: Record<string, unknown> = {}
    row.eachCell((cell, colNumber) => {
      obj[headers[colNumber - 1]] = cell.value
    })
    rows.push(obj as T)
  })

  return rows
}

export async function generateExcel(
  data: Record<string, unknown>[],
  sheetName: string = "Sheet1"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  if (data.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }

  const headers = Object.keys(data[0])
  worksheet.addRow(headers)

  for (const item of data) {
    worksheet.addRow(headers.map((h) => item[h]))
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateTemplateExcel(
  columns: { header: string; key: string }[],
  sheetName: string = "Template"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)
  worksheet.addRow(columns.map((c) => c.header))
  worksheet.columns = columns.map(() => ({ width: 25 }))

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
