import { describe, it, expect } from "vitest"
import { isValidUrl, sessionSchema, loginSchema } from "@/lib/validators"

describe("isValidUrl", () => {
  it("returns true for valid http URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(true)
    expect(isValidUrl("https://zoom.us/j/123456789")).toBe(true)
    expect(isValidUrl("https://meet.google.com/abc-defg-hij")).toBe(true)
  })

  it("returns false for invalid URLs", () => {
    expect(isValidUrl("")).toBe(false)
    expect(isValidUrl("not-a-url")).toBe(false)
    expect(isValidUrl("ftp://example.com")).toBe(false)
    expect(isValidUrl("javascript:alert(1)")).toBe(false)
  })
})

describe("sessionSchema", () => {
  const validSession = {
    teachingLoadId: "tl-1",
    meetingNumber: 1,
    date: "2026-05-22",
    startTime: "08:00",
    endTime: "09:40",
    topic: "Pemrograman Web",
    method: "TATAP_MUKA",
    sessionType: "NORMAL" as const,
    studentPresent: 25,
    studentAbsent: 5,
    latitude: -6.364,
    longitude: 106.829,
  }

  it("passes for valid luring session with GPS", () => {
    expect(sessionSchema.safeParse(validSession).success).toBe(true)
  })

  it("passes for valid daring session with URL", () => {
    const result = sessionSchema.safeParse({
      ...validSession,
      method: "ZOOM",
      platformUrl: "https://zoom.us/j/123",
      latitude: undefined,
      longitude: undefined,
    })
    expect(result.success).toBe(true)
  })

  it("accepts luring session without GPS (GPS disabled)", () => {
    const result = sessionSchema.safeParse({
      ...validSession,
      latitude: undefined,
      longitude: undefined,
    })
    expect(result.success).toBe(true)
  })

  it("fails for daring session without URL", () => {
    const result = sessionSchema.safeParse({
      ...validSession,
      method: "ZOOM",
      latitude: undefined,
      longitude: undefined,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("platformUrl"))).toBe(true)
    }
  })

  it("fails for invalid time format", () => {
    const result = sessionSchema.safeParse({
      ...validSession,
      startTime: "8:00",
    })
    expect(result.success).toBe(false)
  })

  it("fails for negative student count", () => {
    const result = sessionSchema.safeParse({
      ...validSession,
      studentPresent: -1,
    })
    expect(result.success).toBe(false)
  })

  it("accepts optional fields", () => {
    const result = sessionSchema.safeParse({
      ...validSession,
      notes: "Catatan tambahan",
      gpsAccuracy: 15.5,
    })
    expect(result.success).toBe(true)
  })
})

describe("loginSchema", () => {
  it("passes for valid login", () => {
    const result = loginSchema.safeParse({
      username: "dosen",
      password: "password123",
    })
    expect(result.success).toBe(true)
  })

  it("fails for empty username", () => {
    const result = loginSchema.safeParse({
      username: "",
      password: "password123",
    })
    expect(result.success).toBe(false)
  })

  it("fails for short password", () => {
    const result = loginSchema.safeParse({
      username: "dosen",
      password: "12345",
    })
    expect(result.success).toBe(false)
  })
})
