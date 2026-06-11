import { describe, it, expect } from "vitest"
import { getOverdueMeetings } from "@/lib/jadwal"

describe("getOverdueMeetings", () => {
  const slots = [{ day: "Senin", startTime: "08:00", endTime: "10:00", roomName: "A", className: "01" }]
  // Semester mulai Senin 2026-01-05; pertemuan 1=12 Jan, 2=19 Jan, dst (nextDayOfWeek mulai dari hari berikutnya)
  const start = new Date("2026-01-05T00:00:00.000Z")

  it("mengembalikan pertemuan yang tanggalnya lewat & belum ada sesi", () => {
    const filled = new Set<number>([1])
    const today = new Date("2026-01-21T00:00:00.000Z")
    const result = getOverdueMeetings(slots, start, 4, filled, today)
    // pertemuan 1 sudah diisi; pertemuan 2 (19 Jan) lewat & belum diisi → overdue
    expect(result).toEqual([2])
  })

  it("tidak menandai pertemuan yang tanggalnya belum lewat", () => {
    const filled = new Set<number>()
    const today = new Date("2026-01-13T00:00:00.000Z")
    const result = getOverdueMeetings(slots, start, 4, filled, today)
    // hanya pertemuan 1 (12 Jan) yang sudah lewat
    expect(result).toEqual([1])
  })

  it("mengembalikan kosong bila tak ada slot", () => {
    expect(getOverdueMeetings([], start, 4, new Set(), new Date())).toEqual([])
  })
})
