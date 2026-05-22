import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, forbidden } from "@/lib/api"
import { parseExcel } from "@/lib/excel"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return errorResponse("File tidak ditemukan", 400)
    }

    const buffer = await file.arrayBuffer()
    const rows = await parseExcel<Record<string, unknown>>(buffer)

    const created: number[] = []
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      const nama = row["Nama"] as string | undefined
      const kode = row["Kode"] as string | undefined
      const prodiCode = row["ProdiCode"] as string | undefined
      const semesterName = row["SemesterName"] as string | undefined

      if (!nama || !kode || !prodiCode || !semesterName) {
        errors.push(`Baris ${rowNum}: Nama, Kode, ProdiCode, dan SemesterName wajib diisi`)
        continue
      }

      const prodi = await prisma.prodi.findUnique({ where: { code: prodiCode } })
      if (!prodi) {
        errors.push(`Baris ${rowNum}: Prodi dengan kode "${prodiCode}" tidak ditemukan`)
        continue
      }

      const semester = await prisma.semester.findFirst({ where: { name: semesterName } })
      if (!semester) {
        errors.push(`Baris ${rowNum}: Semester dengan nama "${semesterName}" tidak ditemukan`)
        continue
      }

      const sks = typeof row["SKS"] === "number" ? (row["SKS"] as number) : 2
      const totalMeeting = typeof row["TotalPertemuan"] === "number" ? (row["TotalPertemuan"] as number) : 16

      try {
        await prisma.course.create({
          data: {
            name: nama,
            code: kode,
            sks,
            totalMeeting,
            prodiId: prodi.id,
            semesterId: semester.id,
          },
        })
        created.push(rowNum)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        errors.push(`Baris ${rowNum}: ${message}`)
      }
    }

    return successResponse(
      { created: created.length, failed: errors.length, errors },
      "Import selesai"
    )
  } catch (error) {
    console.error("Import courses error:", error)
    return errorResponse("Server error", 500)
  }
}
