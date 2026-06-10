import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { DaftarHadirTable } from "@/components/dosen/daftar-hadir-table"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
}))

const p = (no: number, overrides = {}) => ({
  no, tanggal: "", hari: "", startTime: "", endTime: "", ruang: "", materi: "", method: "",
  hadir: 0, tidakHadir: 0, status: "", sessionId: null,
  platformUrl: "", latitude: null, longitude: null, gpsDistance: null, gpsValid: null,
  ...overrides,
})

describe("DaftarHadirTable", () => {
  const defaultProps = {
    courseId: "c-1", teachingLoadId: "tl-1", prodi: "Test Prodi", totalMeeting: 16,
    dosen: { name: "Dr. Test", nidn: "12345" },
    courseName: "Test Course", courseCode: "TST101", sks: 3,
    kelas: "A", semester: "Ganjil 2025/2026", jadwalInfo: "Senin 08:00",
    isOwner: true,
    initialPertemuan: [
      p(1, { tanggal: "2025-09-01", hari: "Sen", startTime: "08:00", endTime: "10:00", materi: "Pengenalan", method: "TATAP_MUKA", hadir: 28, tidakHadir: 2, status: "PUBLISHED", sessionId: "s-1" }),
    ],
  }

  it("renders course title", () => {
    render(<DaftarHadirTable {...defaultProps} />)
    expect(screen.getByText("Test Course")).toBeDefined()
  })

  it("renders meeting cards in grid", () => {
    render(<DaftarHadirTable {...defaultProps} />)
    const items = screen.getAllByText(/#1/)
    expect(items.length).toBeGreaterThan(0)
  })

  it("renders cetak button", () => {
    render(<DaftarHadirTable {...defaultProps} />)
    expect(screen.getByText("Cetak")).toBeDefined()
  })

  it("renders progress text", () => {
    render(<DaftarHadirTable {...defaultProps} />)
    expect(screen.getByText(/terisi/)).toBeDefined()
  })
})
