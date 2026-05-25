import { prisma } from "./prisma"
import { NextResponse } from "next/server"
import { auth } from "./auth"
import type { Role } from "@prisma/client"

export async function getSession() {
  return auth()
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export function successResponse<T>(data: T, message?: string, status: number = 200) {
  return NextResponse.json(
    { success: true, message, data },
    { status }
  )
}

export function successResponseList<T>(
  data: T[],
  meta?: { total: number; page: number; limit: number }
) {
  return NextResponse.json(
    { success: true, data, meta },
    { status: 200 }
  )
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  )
}

export function errorValidation(errors: Record<string, string>, message?: string) {
  return NextResponse.json(
    { success: false, message: message || "Validasi gagal", errors },
    { status: 422 }
  )
}

export function notFound(message: string = "Not found") {
  return NextResponse.json(
    { success: false, message },
    { status: 404 }
  )
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, message: "Unauthorized" },
    { status: 401 }
  )
}

export function forbidden() {
  return NextResponse.json(
    { success: false, message: "Forbidden" },
    { status: 403 }
  )
}

export function requireRole(allowedRoles: Role[], userRole?: Role) {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

export async function getCampusLocations(facultyId?: string) {
  const where = facultyId ? { facultyId } : {}
  return prisma.campusLocation.findMany({ where })
}

export async function checkDaringQuota(
  teachingLoadId: string
): Promise<{ used: number; remaining: number; isAvailable: boolean }> {
  const used = await prisma.lectureSession.count({
    where: {
      teachingLoadId,
      isDaring: true,
      status: "PUBLISHED",
    },
  })
  return {
    used,
    remaining: Math.max(0, 4 - used),
    isAvailable: used < 4,
  }
}
