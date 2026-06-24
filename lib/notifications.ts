import { prisma } from "./prisma"
import nodemailer from "nodemailer"
import type { NotificationType } from "@prisma/client"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendInAppNotification(params: {
  userId: string
  title: string
  message: string
  type: NotificationType
  relatedId?: string
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      relatedId: params.relatedId,
    },
  })
}

export async function sendEmailNotification(params: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@e-kendali.app",
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
  } catch (error) {
    console.error("Email sending failed:", error)
  }
}

export async function notifyDaringWarning(userId: string, courseName: string) {
  return sendInAppNotification({
    userId,
    title: "Peringatan Kuota Daring",
    message: `Kuota daring untuk ${courseName} tersisa 1x lagi`,
    type: "DARING_WARNING",
  })
}

export async function notifyDaringFull(userId: string, courseName: string) {
  return sendInAppNotification({
    userId,
    title: "Kuota Daring Habis",
    message: `Kuota daring untuk ${courseName} sudah habis (maks 4x)`,
    type: "DARING_FULL",
  })
}

export async function notifyMissingJournal(
  userId: string,
  email: string,
  dosenName: string,
  courseName: string,
  courseCode: string,
  overdueCount: number,
) {
  const msg = `MK ${courseName} (${courseCode}): ${overdueCount} pertemuan sudah lewat 3 hari dan jurnal belum diisi.`
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002"

  await sendInAppNotification({
    userId,
    title: "Jurnal Belum Diisi",
    message: msg,
    type: "MISSING_JOURNAL",
  })

  await sendEmailNotification({
    to: email,
    subject: `[e-Kendali] Jurnal Belum Diisi — ${courseName}`,
    html: `<p>Yth. ${dosenName},</p>
<p>${msg}</p>
<p>Silakan segera mengisi jurnal mengajar Anda melalui:</p>
<p><a href="${baseUrl}/dashboard/dosen/courses">${baseUrl}/dashboard/dosen/courses</a></p>
<p>Salam,<br/>Tim Akademik</p>`,
  })
}
