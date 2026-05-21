import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: "Token dan password wajib diisi" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password minimal 6 karakter" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Token tidak valid atau sudah kadaluarsa" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    })

    return NextResponse.json(
      { success: true, message: "Password berhasil direset" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
