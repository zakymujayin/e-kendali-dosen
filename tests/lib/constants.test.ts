import { describe, it, expect } from "vitest"
import {
  DARING_METHODS, LURING_METHODS, MAX_DARING, CAMPUS_RADIUS_METERS,
  isDaringMethod, METHOD_LABELS, ROLE_LABELS,
} from "@/lib/constants"

describe("constants", () => {
  it("DARING_METHODS contains all expected methods", () => {
    expect(DARING_METHODS).toContain("ZOOM")
    expect(DARING_METHODS).toContain("GOOGLE_MEET")
    expect(DARING_METHODS).toContain("LMS")
    expect(DARING_METHODS).toContain("PLATFORM_LAIN")
  })

  it("DARING_METHODS values have no leading/trailing whitespace", () => {
    for (const m of DARING_METHODS) {
      expect(m.trim()).toBe(m)
    }
  })

  it("LURING_METHODS contains all expected methods", () => {
    expect(LURING_METHODS).toContain("TATAP_MUKA")
    expect(LURING_METHODS).toContain("PRAKTIKUM")
    expect(LURING_METHODS).toContain("SEMINAR")
    expect(LURING_METHODS).toContain("FIELD_STUDY")
  })

  it("LURING_METHODS values have no leading/trailing whitespace", () => {
    for (const m of LURING_METHODS) {
      expect(m.trim()).toBe(m)
    }
  })

  it("MAX_DARING is 4", () => {
    expect(MAX_DARING).toBe(4)
  })

  it("CAMPUS_RADIUS_METERS is 300", () => {
    expect(CAMPUS_RADIUS_METERS).toBe(300)
  })
})

describe("isDaringMethod", () => {
  it("returns true for daring methods", () => {
    expect(isDaringMethod("ZOOM")).toBe(true)
    expect(isDaringMethod("GOOGLE_MEET")).toBe(true)
    expect(isDaringMethod("LMS")).toBe(true)
  })

  it("returns false for luring methods", () => {
    expect(isDaringMethod("TATAP_MUKA")).toBe(false)
    expect(isDaringMethod("PRAKTIKUM")).toBe(false)
    expect(isDaringMethod("SEMINAR")).toBe(false)
    expect(isDaringMethod("FIELD_STUDY")).toBe(false)
  })

  it("returns false for unknown methods", () => {
    expect(isDaringMethod("UNKNOWN")).toBe(false)
  })
})

describe("METHOD_LABELS", () => {
  it("has labels for all daring methods", () => {
    for (const m of DARING_METHODS) {
      expect(METHOD_LABELS[m]).toBeDefined()
      expect(METHOD_LABELS[m].length).toBeGreaterThan(0)
    }
  })

  it("has labels for all luring methods", () => {
    for (const m of LURING_METHODS) {
      expect(METHOD_LABELS[m]).toBeDefined()
      expect(METHOD_LABELS[m].length).toBeGreaterThan(0)
    }
  })

  it("returns Indonesian labels", () => {
    expect(METHOD_LABELS.TATAP_MUKA).toBe("Tatap Muka")
    expect(METHOD_LABELS.ZOOM).toBe("Zoom Meeting")
    expect(METHOD_LABELS.LMS).toBe("LMS / Moodle")
  })
})

describe("ROLE_LABELS", () => {
  const roles = ["ADMIN", "DOSEN", "GKM", "DEKANAT"]
  for (const r of roles) {
    it(`has label for ${r}`, () => {
      expect(ROLE_LABELS[r]).toBeDefined()
      expect(ROLE_LABELS[r].length).toBeGreaterThan(0)
    })
  }
})
