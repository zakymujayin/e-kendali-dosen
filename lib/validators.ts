import { z } from "zod"
import { DARING_METHODS, LURING_METHODS } from "./constants"

export const isValidUrl = (url: string): boolean => {
  try {
    return new URL(url).protocol.startsWith("http")
  } catch {
    return false
  }
}

export const sessionSchema = z
  .object({
    teachingLoadId: z.string().min(1, "Teaching load wajib diisi"),
    meetingNumber: z.number().int().positive("Nomor pertemuan harus positif"),
    date: z.string().min(1, "Tanggal wajib diisi"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:MM"),
    topic: z.string().min(1, "Topik wajib diisi"),
    method: z.enum([...LURING_METHODS, ...DARING_METHODS] as any),
    sessionType: z.enum(["NORMAL", "PENGGANTI", "TAMBAHAN"]).default("NORMAL"),
    studentPresent: z.number().int().min(0, "Tidak boleh negatif"),
    studentAbsent: z.number().int().min(0, "Tidak boleh negatif"),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    gpsAccuracy: z.number().optional().nullable(),
    platformUrl: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      const isDaring = DARING_METHODS.includes(data.method as any)
      if (!isDaring && !data.latitude) return false
      return true
    },
    { message: "GPS wajib untuk sesi luring", path: ["latitude"] }
  )
  .refine(
    (data) => {
      const isDaring = DARING_METHODS.includes(data.method as any)
      if (isDaring && !data.platformUrl) return false
      return true
    },
    { message: "URL platform wajib untuk sesi daring", path: ["platformUrl"] }
  )

export const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

export const userSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter").optional().nullable(),
  role: z.enum(["ADMIN", "DOSEN", "GKM", "DEKANAT"]),
  nidn: z.string().optional().nullable(),
  nip: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  prodiId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => (data.role === "DOSEN" || data.role === "GKM") ? !!data.prodiId : true,
  { message: "Prodi wajib untuk role DOSEN dan GKM", path: ["prodiId"] }
)

export const prodiSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  code: z.string().min(1, "Kode wajib diisi"),
  facultyId: z.string().min(1, "Fakultas wajib diisi"),
})

export const courseSchema = z.object({
  name: z.string().min(1, "Nama MK wajib diisi"),
  code: z.string().min(1, "Kode MK wajib diisi"),
  sks: z.number().int().min(1).max(24),
  totalMeeting: z.number().int().min(1).default(16),
  prodiId: z.string().min(1, "Prodi wajib diisi"),
  semesterId: z.string().min(1, "Semester wajib diisi"),
})

export const semesterSchema = z.object({
  name: z.string().min(1, "Nama semester wajib diisi"),
  year: z.string().min(1, "Tahun wajib diisi"),
  term: z.enum(["Ganjil", "Genap"]),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().min(1, "Tanggal selesai wajib diisi"),
})
