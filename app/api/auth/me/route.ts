import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, username: true, name: true, email: true, role: true,
        nidn: true, nip: true, phone: true, avatar: true,
        prodiId: true, isActive: true,
        prodi: { select: { name: true } },
      },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error("Get profile error:", error)
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { name, phone } = await req.json()

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name, phone },
      select: { id: true, name: true, email: true, phone: true },
    })

    return NextResponse.json({ success: true, data: user, message: "Profil berhasil diupdate" })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}
