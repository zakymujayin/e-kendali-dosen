import { prisma } from "@/lib/prisma"
import { sendEmailNotification } from "@/lib/notifications"
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

    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] Reset token for ${email}: ${token}`)
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002"
    const resetLink = `${baseUrl}/reset-password?token=${token}`
    await sendEmailNotification({
      to: user.email,
      subject: "Reset Password e-Kendali Dosen",
      html: `<p>Anda meminta reset password untuk akun e-Kendali Dosen.</p>
<p>Klik tautan berikut untuk reset password Anda:</p>
<p><a href="${resetLink}">${resetLink}</a></p>
<p>Tautan ini berlaku selama 1 jam.</p>
<p>Jika Anda tidak meminta reset password, abaikan email ini.</p>`,
    })

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
