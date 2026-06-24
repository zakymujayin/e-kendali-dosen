import { describe, it, expect } from "vitest"
import { generateExcel, parseExcel, generateTemplateExcel } from "@/lib/excel"

describe("generateExcel", () => {
  it("generates a buffer for non-empty data", async () => {
    const data = [{ name: "Test", value: 123 }]
    const buffer = await generateExcel(data, "Sheet1")
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it("generates a buffer for empty data", async () => {
    const buffer = await generateExcel([], "Empty")
    expect(buffer).toBeInstanceOf(Buffer)
  })

  it("includes headers in output", async () => {
    const data = [{ Nama: "John", Usia: 30 }]
    const buffer = await generateExcel(data, "Data")
    const parsed = await parseExcel<Record<string, unknown>>(buffer)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toHaveProperty("Nama")
  })

  it("handles multiple rows", async () => {
    const data = [
      { name: "A", val: 1 },
      { name: "B", val: 2 },
    ]
    const buffer = await generateExcel(data, "Multi")
    const parsed = await parseExcel<Record<string, unknown>>(buffer)
    expect(parsed).toHaveLength(2)
  })
})

describe("parseExcel", () => {
  it("parses a valid excel buffer", async () => {
    const original = [{ Name: "Test", Value: "123" }]
    const buffer = await generateExcel(original, "Test")
    const parsed = await parseExcel<Record<string, unknown>>(buffer)
    expect(parsed).toHaveLength(1)
    expect(String(parsed[0].Name)).toBe("Test")
  })

  it("returns empty array for empty data", async () => {
    const buffer = await generateExcel([], "Empty")
    const parsed = await parseExcel(buffer)
    expect(parsed).toEqual([])
  })
})

describe("generateTemplateExcel", () => {
  it("generates a buffer with headers", async () => {
    const columns = [
      { header: "Nama", key: "name" },
      { header: "Usia", key: "age" },
    ]
    const buffer = await generateTemplateExcel(columns, "Template")
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})
