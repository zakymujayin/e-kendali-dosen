export const DARING_METHODS = [
  "ZOOM",
  "GOOGLE_MEET",
 "MS_TEAMS",
  "LMS",
  "PLATFORM_LAIN",
] as const

export const LURING_METHODS = [
  "TATAP_MUKA",
  "PRAKTIKUM",
  "SEMINAR",
  "FIELD_STUDY",
] as const

export const MAX_DARING = 4
export const CAMPUS_RADIUS_METERS = 300

export const isDaringMethod = (method: string): boolean =>
  DARING_METHODS.includes(method as any)

export const METHOD_LABELS: Record<string, string> = {
  TATAP_MUKA: "Tatap Muka",
  PRAKTIKUM: "Praktikum",
  SEMINAR: "Seminar",
  FIELD_STUDY: "Studi Lapangan",
  ZOOM: "Zoom Meeting",
  GOOGLE_MEET: "Google Meet",
  MS_TEAMS: "Microsoft Teams",
  LMS: "LMS / Moodle",
  PLATFORM_LAIN: "Platform Lain",
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  DOSEN: "Dosen",
  GKM: "GKM",
  DEKANAT: "Dekanat",
}
