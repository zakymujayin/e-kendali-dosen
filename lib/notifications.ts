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
      from: process.env.SMTP_FROM || "noreply@bkd.app",
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

export async function notifyReminderPublish(userId: string, sessionCount: number) {
  return sendInAppNotification({
    userId,
    title: "Pengingat Publish",
    message: `Anda memiliki ${sessionCount} sesi DRAFT yang belum dipublish > 7 hari`,
    type: "REMINDER_PUBLISH",
  })
}
