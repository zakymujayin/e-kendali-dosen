import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { errorResponse, unauthorized } from "@/lib/api"
import {
  parseFile,
  extractUniqueDosen,
  extractUniqueCourses,
  buildTeachingLoads,
  matchDosen,
  matchCourses,
  extractScheduleEntries,
  saveScheduleSlots,
} from "@/lib/import-jadwal"
import bcrypt from "bcryptjs"

const DEFAULT_PASSWORD = bcrypt.hashSync("password123", 12)

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403)
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const semesterId = formData.get("semesterId") as string | null
    const isPreview = formData.get("preview") === "true"

    if (!file) return errorResponse("File wajib diupload", 400)
    if (!semesterId) return errorResponse("Semester wajib dipilih", 400)

    const buffer = await file.arrayBuffer()
    const { rows, totalRows } = await parseFile(buffer, file.name)

    const dosenEntries = extractUniqueDosen(rows)
    const courseEntries = extractUniqueCourses(rows)
    const tlEntries = buildTeachingLoads(rows)

    const [dosenMatches, courseMatches] = await Promise.all([
      matchDosen(dosenEntries),
      matchCourses(courseEntries, semesterId),
    ])

    const semesters = await prisma.semester.findMany({ orderBy: { year: "desc" } })

    // Preview mode: return parse + match data without creating anything
    if (isPreview) {
      return Response.json({
        success: true,
        data: {
          totalRows,
          dosenMatches,
          courseMatches,
          tlCount: tlEntries.length,
          semesters,
        },
      })
    }

    // Execute mode: accept userMapping from admin
    const userMappingRaw = formData.get("userMapping") as string | null
    const userMapping: Record<string, string> = userMappingRaw
      ? JSON.parse(userMappingRaw)
      : {}

    const errors: string[] = []
    let usersCreated = 0
    let usersSkipped = 0
    let coursesCreated = 0
    let coursesSkipped = 0
    let teachingLoadsCreated = 0

    // Create new users for not_found entries (only if admin didn't provide mapping)
    for (const match of dosenMatches) {
      const key = match.dosen.namaNormalized
      if (userMapping[key]) continue // admin mapped this
      if (match.status === "matched") {
        usersSkipped++
        continue
      }
      try {
        const username = match.dosen.namaNormalized.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
        const email = `${username}@example.com`
        const existing = await prisma.user.findFirst({ where: { username } })
        const finalUsername = existing ? `${username}-${Date.now()}` : username

        const user = await prisma.user.create({
          data: {
            username: finalUsername,
            name: match.dosen.namaExcel,
            email,
            password: DEFAULT_PASSWORD,
            role: "DOSEN",
            nidn: match.dosen.nidn || null,
            prodiId: match.dosen.prodiId || null,
            isActive: true,
          },
        })
        userMapping[key] = user.id
        usersCreated++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        errors.push(`Dosen ${match.dosen.namaExcel}: ${msg}`)
      }
    }

    // Build final dosen map: admin mapping + auto-matched
    const finalDosenMap = new Map<string, string>()
    for (const match of dosenMatches) {
      const key = match.dosen.namaNormalized
      const id = userMapping[key] || match.matchedUser?.id
      if (id) finalDosenMap.set(key, id)
    }

    // Create new courses
    for (const match of courseMatches) {
      if (match.status === "matched") {
        coursesSkipped++
        continue
      }
      try {
        await prisma.course.create({
          data: {
            code: match.course.kodeMk,
            name: match.course.namaMk,
            sks: match.course.sks,
            prodiId: match.course.prodiId || "",
            semesterId,
            totalMeeting: 16,
          },
        })
        coursesCreated++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        errors.push(`MK ${match.course.kodeMk} (${match.course.namaMk}): ${msg}`)
      }
    }

    // Re-fetch course matches after creation
    const freshCourseMatches = await matchCourses(courseEntries, semesterId)
    const courseMap = new Map<string, string>()
    for (const match of freshCourseMatches) {
      if (match.matchedCourse) {
        courseMap.set(match.course.kodeMk, match.matchedCourse.id)
      }
    }

    // Create teaching loads
    for (const tl of tlEntries) {
      const userId = finalDosenMap.get(tl.namaNormalized)
      const courseId = courseMap.get(tl.kodeMk)
      if (!userId || !courseId) continue

      try {
        await prisma.teachingLoad.create({
          data: { userId, courseId, semesterId, isTeam: false },
        })
        teachingLoadsCreated++
      } catch {
        // Duplicate TL (unique constraint) — skip silently
      }
    }

    // Save schedule slots
    const prodiList = await prisma.prodi.findMany({ select: { id: true, code: true } })
    const prodiMap = new Map<string, string>()
    for (const p of prodiList) prodiMap.set(p.code, p.id)

    const scheduleEntries = extractScheduleEntries(rows, semesterId, finalDosenMap, courseMap, prodiMap)
    const scheduleSaved = await saveScheduleSlots(scheduleEntries)

    return Response.json({
      success: true,
      data: {
        totalRows,
        usersCreated,
        usersSkipped,
        coursesCreated,
        coursesSkipped,
        teachingLoadsCreated,
        scheduleSaved,
        errors,
      },
    })
  } catch (error) {
    console.error("Import jadwal error:", error)
    return errorResponse("Gagal mengimpor jadwal", 500)
  }
}
