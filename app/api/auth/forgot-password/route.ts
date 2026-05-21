import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email wajib diisi" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { success: true, message: "Jika email terdaftar, tautan reset akan dikirim" },
        { status: 200 }
      )
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 3600000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: expires,
      },
    })

    console.log(`[DEV] Reset token for ${email}: ${token}`)

    return NextResponse.json(
      { success: true, message: "Tautan reset telah dikirim ke email Anda" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
