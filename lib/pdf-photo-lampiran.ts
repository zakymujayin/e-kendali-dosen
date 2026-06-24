import fs from "fs"
import path from "path"

export interface PhotoFile {
  name: string
  fileUrl: string
  fileType: string
}

function readPhotoAsBase64(fileUrl: string, fileType: string): string | null {
  const diskPath = path.join(process.cwd(), "public", fileUrl)
  try {
    const buf = fs.readFileSync(diskPath)
    const mime = fileType === "png" ? "image/png" : "image/jpeg"
    return "data:" + mime + ";base64," + buf.toString("base64")
  } catch {
    return null
  }
}

export function buildPhotoLampiran(
  photos: PhotoFile[],
): Record<string, unknown>[] {
  if (photos.length === 0) return []

  const nodes: Record<string, unknown>[] = [
    { text: "LAMPIRAN: Foto Evidence", bold: true, fontSize: 10, margin: [0, 16, 0, 8] },
    {
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" }],
      margin: [0, 0, 0, 8],
    },
  ]

  const rows: Record<string, unknown>[][] = []
  let currentRow: Record<string, unknown>[] = []

  for (let i = 0; i < photos.length; i++) {
    const base64 = readPhotoAsBase64(photos[i].fileUrl, photos[i].fileType)
    const label = (i + 1).toString()

    currentRow.push({
      stack: [
        ...(base64
          ? [
              {
                image: base64,
                width: 220,
                maxHeight: 300,
                margin: [2, 0, 2, 3] as [number, number, number, number],
              },
            ]
          : [
              {
                text: "[Foto tidak tersedia]",
                width: 220,
                alignment: "center",
                fontSize: 9,
                italics: true,
                color: "#999",
                margin: [2, 30, 2, 30] as [number, number, number, number],
              },
            ]),
        {
          text: `[${label}] ${photos[i].name}`,
          fontSize: 8,
          alignment: "center",
          color: "#666",
          margin: [0, 2, 0, 0] as [number, number, number, number],
        },
      ],
      alignment: "center",
    })

    if (currentRow.length === 2 || i === photos.length - 1) {
      if (currentRow.length === 1) {
        currentRow.push({ text: "" })
      }
      rows.push(currentRow)
      currentRow = []
    }
  }

  for (const row of rows) {
    nodes.push({
      columns: row,
      columnGap: 16,
      margin: [0, 0, 0, 12],
    })
  }

  nodes.push({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" }],
    margin: [0, 2, 0, 0],
  })

  return nodes
}
