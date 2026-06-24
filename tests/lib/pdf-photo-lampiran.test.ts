import { describe, it, expect } from "vitest"
import { buildPhotoLampiran, type PhotoFile } from "@/lib/pdf-photo-lampiran"

describe("buildPhotoLampiran", () => {
  it("returns empty array for empty photos", () => {
    expect(buildPhotoLampiran([])).toEqual([])
  })

  it("includes section title and separator lines", () => {
    const photos: PhotoFile[] = [
      { name: "test.jpg", fileUrl: "/nonexistent/test.jpg", fileType: "jpg" },
    ]
    const result = buildPhotoLampiran(photos)
    expect(result.length).toBeGreaterThanOrEqual(3)
    expect(result[0]).toMatchObject({ text: "LAMPIRAN: Foto Evidence" })
  })

  it("shows fallback for missing photo file", () => {
    const photos: PhotoFile[] = [
      { name: "missing.jpg", fileUrl: "/nonexistent/missing.jpg", fileType: "jpg" },
    ]
    const result = buildPhotoLampiran(photos)
    const hasFallback = result.some(
      (node) =>
        typeof node === "object" &&
        node !== null &&
        "columns" in node &&
        Array.isArray((node as Record<string, unknown>).columns)
    )
    expect(hasFallback).toBe(true)
  })

  it("creates grid of 2 columns for multiple photos", () => {
    const photos: PhotoFile[] = [
      { name: "a.jpg", fileUrl: "/nope/a.jpg", fileType: "jpg" },
      { name: "b.jpg", fileUrl: "/nope/b.jpg", fileType: "jpg" },
      { name: "c.jpg", fileUrl: "/nope/c.jpg", fileType: "jpg" },
    ]
    const result = buildPhotoLampiran(photos)
    const columnNodes = result.filter(
      (node) =>
        typeof node === "object" &&
        node !== null &&
        "columns" in node
    )
    expect(columnNodes.length).toBe(2)
  })
})
