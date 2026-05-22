import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { SessionTable } from "@/components/dosen/session-table"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}))

describe("SessionTable", () => {
  const defaultProps = {
    courseId: "c-1",
    teachingLoadId: "tl-1",
    sessions: [
      {
        id: "s-1",
        meetingNumber: 1,
        date: "2026-05-22T00:00:00.000Z",
        startTime: "08:00",
        endTime: "09:40",
        topic: "Pengenalan HTML",
        method: "TATAP_MUKA",
        sessionType: "NORMAL",
        studentPresent: 25,
        studentTotal: 30,
        status: "PUBLISHED",
        _count: { documents: 0 },
      },
      {
        id: "s-2",
        meetingNumber: 2,
        date: "2026-05-23T00:00:00.000Z",
        startTime: "08:00",
        endTime: "09:40",
        topic: "CSS Dasar",
        method: "ZOOM",
        sessionType: "NORMAL",
        studentPresent: 28,
        studentTotal: 30,
        status: "DRAFT",
        _count: { documents: 0 },
      },
    ],
  }

  it("renders the Tambah Sesi button", () => {
    render(<SessionTable {...defaultProps} />)
    expect(screen.getByText("Tambah Sesi")).toBeDefined()
  })

  it("renders session topics", () => {
    render(<SessionTable {...defaultProps} />)
    expect(screen.getByText("Pengenalan HTML")).toBeDefined()
    expect(screen.getByText("CSS Dasar")).toBeDefined()
  })

  it("shows PUBLISHED status badge", () => {
    render(<SessionTable {...defaultProps} />)
    expect(screen.getByText("PUBLISHED")).toBeDefined()
  })

  it("shows DRAFT status badge", () => {
    render(<SessionTable {...defaultProps} />)
    expect(screen.getByText("DRAFT")).toBeDefined()
  })

  it("renders meeting numbers", () => {
    render(<SessionTable {...defaultProps} />)
    expect(screen.getByText("1")).toBeDefined()
    expect(screen.getByText("2")).toBeDefined()
  })

  it("shows BAP download button when published sessions exist", () => {
    render(<SessionTable {...defaultProps} />)
    expect(screen.getByText("Download Semua BAP")).toBeDefined()
  })

  it("handles empty sessions list", () => {
    render(<SessionTable {...defaultProps} sessions={[]} />)
    expect(screen.getByText("Belum ada sesi perkuliahan")).toBeDefined()
  })
})
