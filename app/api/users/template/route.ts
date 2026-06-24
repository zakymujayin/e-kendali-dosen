import { auth } from "@/lib/auth"
import { errorResponse, unauthorized, forbidden } from "@/lib/api"
import { generateTemplateExcel } from "@/lib/excel"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const buffer = await generateTemplateExcel([
      { header: "Nama", key: "name" },
      { header: "Username", key: "username" },
      { header: "Email", key: "email" },
      { header: "NIDN", key: "nidn" },
      { header: "NIP", key: "nip" },
      { header: "Phone", key: "phone" },
      { header: "Role", key: "role" },
      { header: "ProdiCode", key: "prodiCode" },
    ])

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="template-user.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Generate template error:", error)
    return errorResponse("Server error", 500)
  }
}
