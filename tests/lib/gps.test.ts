import { describe, it, expect } from "vitest"
import { hitungJarakMeter, isInCampusRadius } from "@/lib/gps"

describe("hitungJarakMeter", () => {
  it("returns 0 for same coordinates", () => {
    expect(hitungJarakMeter(-6.2, 106.8, -6.2, 106.8)).toBe(0)
  })

  it("calculates distance between two nearby points", () => {
    // ~111m for 0.001 deg latitude
    const result = hitungJarakMeter(-6.364, 106.829, -6.363, 106.829)
    expect(result).toBeGreaterThan(80)
    expect(result).toBeLessThan(150)
  })

  it("returns positive distance regardless of order", () => {
    const d1 = hitungJarakMeter(0, 0, 1, 1)
    const d2 = hitungJarakMeter(1, 1, 0, 0)
    expect(Math.abs(d1 - d2)).toBeLessThan(1)
  })
})

describe("isInCampusRadius", () => {
  const campusLat = -6.364
  const campusLng = 106.829

  it("returns true when within default radius (300m)", () => {
    expect(isInCampusRadius(-6.363, 106.829, campusLat, campusLng)).toBe(true)
  })

  it("returns false when outside default radius", () => {
    expect(isInCampusRadius(-6.4, 106.85, campusLat, campusLng)).toBe(false)
  })

  it("uses custom radius", () => {
    expect(isInCampusRadius(-6.363, 106.829, campusLat, campusLng, 50)).toBe(false)
    expect(isInCampusRadius(-6.363, 106.829, campusLat, campusLng, 200)).toBe(true)
  })
})
