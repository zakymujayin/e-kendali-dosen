import ExcelJS from "exceljs"
import { prisma } from "./prisma"
import type { Role } from "@prisma/client"

export interface DosenEntry {
  namaExcel: string
  namaNormalized: string
  nidn: string | null
  prodiCode: string
  prodiId?: string
}

export interface CourseEntry {
  kodeMk: string
  namaMk: string
  sks: number
  prodiCode: string
  prodiId?: string
}

export interface TeachingLoadEntry {
  namaNormalized: string
  kodeMk: string
  prodiCode: string
  kelas: string
}

export interface RawRow {
  [key: string]: unknown
  NO?: number | null
  NAMA_DOSEN?: string | null
  KODE_MK?: string | null
  MATA_KULIAH?: string | null
  SKS?: number | null
  SEMESTER?: string | null
  PRODI?: string | null
  KELAS?: string | null
  RUANG_KELAS?: string | null
  HARI?: string | null
  WAKTU?: string | null
  RUANG?: number | null
}

export interface DosenMatch {
  dosen: DosenEntry
  status: "matched" | "fuzzy" | "not_found"
  matchedUser: { id: string; name: string; nidn: string | null } | null
  candidates: Array<{ id: string; name: string; nidn: string | null }>
}

export interface CourseMatch {
  course: CourseEntry
  status: "matched" | "new"
  matchedCourse: { id: string; code: string; name: string } | null
}

export interface ParseResult {
  rows: RawRow[]
  fileName: string
  totalRows: number
}

const PRODI_CODE_MAP: Record<string, string> = {
  IAT: "IAT", IH: "IH", SPI: "SPI",
  BSA: "BSA", AFI: "AFI", IPII: "IPII",
}

export function normalizeName(rawName: string): string {
  const name = rawName.trim()
  const parts = name.split(",")
  const nameOnly = parts[0]
  return nameOnly
    .replace(/\b(Dr\.|Drs\.|H\.|Ir\.)\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export function extractKodeMk(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>
    if (typeof obj.text === "string" && obj.text.trim()) return obj.text.trim()
  }
  if (typeof value === "number") return String(value)
  return null
}

export function forwardFillRows(rows: RawRow[]): RawRow[] {
  let lastNo: number | null = null
  let lastNama: string | null = null

  return rows.map((row) => {
    const no = row.NO != null ? Number(row.NO) : lastNo
    const nama = row.NAMA_DOSEN != null ? String(row.NAMA_DOSEN) : lastNama
    if (row.NO != null) lastNo = no
    if (row.NAMA_DOSEN != null) lastNama = nama
    return { ...row, NO: no, NAMA_DOSEN: nama }
  })
}

export function mapColumns(raw: Record<string, unknown>): RawRow {
  const keys = Object.keys(raw)

  const findKey = (aliases: string[]): string | undefined =>
    keys.find((k) => aliases.some((a) => k.trim().toUpperCase() === a))

  const noKey = findKey(["NO"])
  const namaKey = findKey(["NAMA DOSEN"])
  const kodeMkKey = findKey(["KODE MK"])
  const namaMkKey = findKey(["MATA KULIAH", "MATAKULIAH", "NAMA MK"])
  const sksKey = findKey(["SKS"])
  const semesterKey = findKey(["SEMESTER"])
  const prodiKey = findKey(["PRODI"])
  const kelasKey = findKey(["KELAS"])
  const ruangKey = findKey(["RUANG KELAS"])
  const hariKey = findKey(["HARI"])
  const waktuKey = findKey(["WAKTU"])

  return {
    NO: noKey ? Number(raw[noKey]) || null : null,
    NAMA_DOSEN: namaKey ? String(raw[namaKey] ?? "") || null : null,
    KODE_MK: kodeMkKey ? extractKodeMk(raw[kodeMkKey]) : null,
    MATA_KULIAH: namaMkKey ? String(raw[namaMkKey] ?? "") || null : null,
    SKS: sksKey ? Number(raw[sksKey]) || 2 : 2,
    SEMESTER: semesterKey ? String(raw[semesterKey] ?? "") || null : null,
    PRODI: prodiKey ? String(raw[prodiKey] ?? "") || null : null,
    KELAS: kelasKey ? String(raw[kelasKey] ?? "") || null : null,
    RUANG_KELAS: ruangKey ? String(raw[ruangKey] ?? "") || null : null,
    HARI: hariKey ? String(raw[hariKey] ?? "") || null : null,
    WAKTU: waktuKey ? String(raw[waktuKey] ?? "") || null : null,
  }
}

export async function parseFile(buffer: ArrayBuffer, fileName?: string): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  let sheet = workbook.getWorksheet("MASTER")
  if (!sheet) {
    sheet = workbook.worksheets[0]
  }
  if (!sheet) throw new Error("File tidak memiliki sheet data")

  const allRows: Record<string, unknown>[] = []
  const headers: string[] = []

  const headerRow = sheet.getRow(5)
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim()
  })

  for (let r = 6; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r)
    const obj: Record<string, unknown> = {}
    let hasData = false

    headers.forEach((header, i) => {
      const colNumber = i + 1
      const cell = row.getCell(colNumber)
      const value = cell.value
      if (value != null) hasData = true
      obj[header] = value
    })

    if (hasData) allRows.push(obj)
  }

  const mapped = allRows.map(mapColumns)
  const filled = forwardFillRows(mapped)

  return {
    rows: filled,
    fileName: fileName || "Jadwal",
    totalRows: filled.length,
  }
}

export function extractUniqueDosen(rows: RawRow[]): DosenEntry[] {
  const seen = new Set<string>()
  return rows.reduce<DosenEntry[]>((acc, row) => {
    const nama = row.NAMA_DOSEN
    if (!nama) return acc
    const normalized = normalizeName(nama)
    const key = `${normalized}|${row.PRODI || ""}`
    if (seen.has(key)) return acc
    seen.add(key)
    acc.push({
      namaExcel: nama,
      namaNormalized: normalized,
      nidn: null,
      prodiCode: row.PRODI || "",
      prodiId: undefined,
    })
    return acc
  }, [])
}

export function extractUniqueCourses(rows: RawRow[]): CourseEntry[] {
  const seen = new Set<string>()
  return rows.reduce<CourseEntry[]>((acc, row) => {
    const kodeMk = row.KODE_MK
    if (!kodeMk) return acc
    const key = `${kodeMk}|${row.PRODI || ""}`
    if (seen.has(key)) return acc
    seen.add(key)
    acc.push({
      kodeMk,
      namaMk: row.MATA_KULIAH || "",
      sks: row.SKS || 2,
      prodiCode: row.PRODI || "",
      prodiId: undefined,
    })
    return acc
  }, [])
}

export function buildTeachingLoads(rows: RawRow[]): TeachingLoadEntry[] {
  return rows.map((row) => ({
    namaNormalized: row.NAMA_DOSEN ? normalizeName(row.NAMA_DOSEN) : "",
    kodeMk: row.KODE_MK || "",
    prodiCode: row.PRODI || "",
    kelas: row.KELAS || "",
  }))
}

export async function matchDosen(
  entries: DosenEntry[]
): Promise<DosenMatch[]> {
  const results: DosenMatch[] = []

  for (const entry of entries) {
    const prodi = await prisma.prodi.findUnique({
      where: { code: PRODI_CODE_MAP[entry.prodiCode] || entry.prodiCode },
    })
    if (prodi) entry.prodiId = prodi.id

    const users = await prisma.user.findMany({
      where: {
        name: { contains: entry.namaNormalized, mode: "insensitive" },
        role: "DOSEN" as Role,
      },
      select: { id: true, name: true, nidn: true },
    })

    if (users.length === 1) {
      const matchedUser = users[0]
      const exactMatch =
        matchedUser.name.toLowerCase() === entry.namaNormalized
      results.push({
        dosen: entry,
        status: exactMatch ? "matched" : "fuzzy",
        matchedUser,
        candidates: users,
      })
    } else if (users.length > 1) {
      results.push({
        dosen: entry,
        status: "fuzzy",
        matchedUser: null,
        candidates: users,
      })
    } else {
      results.push({
        dosen: entry,
        status: "not_found",
        matchedUser: null,
        candidates: [],
      })
    }
  }

  return results
}

export async function matchCourses(
  entries: CourseEntry[],
  semesterId: string
): Promise<CourseMatch[]> {
  const results: CourseMatch[] = []

  for (const entry of entries) {
    if (!entry.prodiId) {
      const prodi = await prisma.prodi.findUnique({
        where: { code: PRODI_CODE_MAP[entry.prodiCode] || entry.prodiCode },
      })
      if (prodi) entry.prodiId = prodi.id
    }

    const existing = await prisma.course.findFirst({
      where: {
        code: entry.kodeMk,
        semesterId,
      },
      select: { id: true, code: true, name: true, prodiId: true },
    })

    results.push({
      course: entry,
      status: existing ? "matched" : "new",
      matchedCourse: existing || null,
    })
  }

  return results
}

export interface ScheduleEntry {
  semesterId: string
  userId: string
  courseId: string
  prodiId: string
  roomName: string
  className: string
  day: string
  startTime: string
  endTime: string
}

export function extractScheduleEntries(
  rows: RawRow[],
  semesterId: string,
  dosenMap: Map<string, string>,
  courseMap: Map<string, string>,
  prodiMap: Map<string, string>
): ScheduleEntry[] {
  return rows.reduce<ScheduleEntry[]>((acc, row) => {
    const dosenId = row.NAMA_DOSEN ? dosenMap.get(normalizeName(row.NAMA_DOSEN)) : undefined
    const courseId = row.KODE_MK ? courseMap.get(row.KODE_MK) : undefined
    const prodiCode = row.PRODI ? String(row.PRODI) : ""
    const prodiId = prodiCode ? prodiMap.get(prodiCode) : undefined
    const ruang = row.RUANG_KELAS ? String(row.RUANG_KELAS) : ""
    const kelas = row.KELAS ? String(row.KELAS) : ""
    const hari = row.HARI ? String(row.HARI) : ""
    const waktu = row.WAKTU ? String(row.WAKTU) : ""

    if (!dosenId || !courseId || !prodiId || !ruang || !hari || !waktu) return acc

    const [startTime, endTime] = waktu.split("-").map((t: string) => t.trim())

    acc.push({
      semesterId, userId: dosenId, courseId, prodiId,
      roomName: ruang, className: kelas,
      day: hari.toUpperCase(), startTime: startTime || "", endTime: endTime || "",
    })

    return acc
  }, [])
}

export async function saveScheduleSlots(entries: ScheduleEntry[]): Promise<number> {
  if (entries.length === 0) return 0
  const { prisma } = await import("./prisma")

  await prisma.scheduleSlot.deleteMany({
    where: { semesterId: entries[0].semesterId },
  })

  const result = await prisma.scheduleSlot.createMany({
    data: entries,
    skipDuplicates: true,
  })

  return result.count
}
