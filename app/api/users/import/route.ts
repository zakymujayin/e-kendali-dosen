import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, forbidden } from "@/lib/api"
import { parseExcel } from "@/lib/excel"
import bcrypt from "bcryptjs"

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
      const email = row["Email"] as string | undefined
      const role = row["Role"] as string | undefined

      if (!nama || !email || !role) {
        errors.push(`Baris ${rowNum}: Nama, Email, dan Role wajib diisi`)
        continue
      }

      const validRoles = ["ADMIN", "DOSEN", "GKM", "DEKANAT"]
      if (!validRoles.includes(role)) {
        errors.push(`Baris ${rowNum}: Role tidak valid`)
        continue
      }

      let prodiId: string | undefined
      const prodiCode = row["ProdiCode"] as string | undefined
      if (prodiCode) {
        const prodi = await prisma.prodi.findUnique({ where: { code: prodiCode } })
        if (!prodi) {
          errors.push(`Baris ${rowNum}: Prodi dengan kode "${prodiCode}" tidak ditemukan`)
          continue
        }
        prodiId = prodi.id
      }

      const hashed = await bcrypt.hash("password123", 12)

      try {
        await prisma.user.create({
          data: {
            name: nama,
            email,
            password: hashed,
            role: role as "ADMIN" | "DOSEN" | "GKM" | "DEKANAT",
            nidn: (row["NIDN"] as string) || null,
            nip: (row["NIP"] as string) || null,
            phone: (row["Phone"] as string) || null,
            prodiId: prodiId || null,
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
    console.error("Import users error:", error)
    return errorResponse("Server error", 500)
  }
}
