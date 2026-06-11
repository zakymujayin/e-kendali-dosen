import path from "path"
import fs from "fs"
import sharp from "sharp"

// Memuat & memangkas logo institusi (hapus area transparan) menjadi data URI base64.
export async function loadLetterheadLogo(): Promise<string | null> {
  const logoPath = path.resolve(process.cwd(), "public/logo.png")
  if (!fs.existsSync(logoPath)) return null
  const buf = await sharp(logoPath).trim().png().toBuffer()
  return "data:image/png;base64," + buf.toString("base64")
}

// Kop surat resmi (dipakai bersama oleh jurnal mengajar & BAP).
// Self-contained: tiap node memakai style inline agar tak bergantung pada styles dokumen pemanggil.
// Disetel untuk pageMargins kiri/kanan 40 (lebar konten ~515pt).
export function letterheadContent(logoBase64: string | null): Record<string, unknown>[] {
  return [
    ...(logoBase64
      ? [{ image: logoBase64, width: 50, absolutePosition: { x: 90, y: 52 } }]
      : []),
    { text: "KEMENTERIAN AGAMA REPUBLIK INDONESIA", fontSize: 11, bold: true, alignment: "center" },
    { text: "UNIVERSITAS ISLAM NEGERI", fontSize: 10, bold: true, alignment: "center" },
    { text: "SULTAN MAULANA HASANUDDIN BANTEN", fontSize: 10, bold: true, alignment: "center" },
    { text: "FAKULTAS USHULUDDIN DAN ADAB", fontSize: 12, bold: true, alignment: "center" },
    { text: "Jl. Syekh Nawawi Al Bantani Kp Andamui Sukawana Curug Kota Serang Banten 42171", fontSize: 8, italics: true, alignment: "center" },
    { text: "Telp (0254) 200323-208849  Fax (0254) 200022", fontSize: 8, italics: true, alignment: "center" },
    { text: "Website: www.fuda.uinbanten.ac.id  E-mail: surat@uinbanten.ac.id", fontSize: 8, italics: true, alignment: "center" },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 3 }], margin: [0, 2, 0, 1] },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1 }], margin: [0, 0, 0, 12] },
  ]
}
