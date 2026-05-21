import * as XLSX from "xlsx"

export function parseExcel<T>(buffer: ArrayBuffer): T[] {
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet) as T[]
}

export function generateExcel(
  data: Record<string, any>[],
  sheetName: string = "Sheet1"
): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }))
}

export function generateTemplateExcel(
  columns: { header: string; key: string }[],
  sheetName: string = "Template"
): Buffer {
  const data = columns.reduce((acc, col) => {
    acc[col.header] = ""
    return acc
  }, {} as Record<string, string>)

  const worksheet = XLSX.utils.json_to_sheet([data])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  worksheet["!cols"] = columns.map(() => ({ wch: 25 }))

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }))
}
