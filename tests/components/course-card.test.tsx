import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { CourseCard } from "@/components/dosen/course-card"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe("CourseCard", () => {
  const defaultProps = {
    id: "tl-1",
    course: {
      id: "c-1",
      name: "Pemrograman Web",
      code: "IF123",
      sks: 3,
      totalMeeting: 16,
    },
    publishedSessions: 10,
    draftSessions: 2,
    progress: 62.5,
  }

  it("renders course name and code", () => {
    render(<CourseCard {...defaultProps} />)
    expect(screen.getByText("Pemrograman Web")).toBeDefined()
    expect(screen.getByText(/IF123/)).toBeDefined()
  })

  it("renders SKS", () => {
    render(<CourseCard {...defaultProps} />)
    expect(screen.getByText(/3 SKS/)).toBeDefined()
  })

  it("renders progress percentage in badge", () => {
    render(<CourseCard {...defaultProps} />)
    expect(screen.getByText("10/16")).toBeDefined()
  })

  it("renders published and draft counts", () => {
    render(<CourseCard {...defaultProps} />)
    expect(screen.getByText(/10 published/)).toBeDefined()
    expect(screen.getByText(/2 draft/)).toBeDefined()
  })

  it("renders with 0 progress", () => {
    render(<CourseCard {...defaultProps} progress={0} publishedSessions={0} />)
    expect(screen.getByText("0/16")).toBeDefined()
  })

  it("renders daring quota when provided", () => {
    render(
      <CourseCard
        {...defaultProps}
        daringQuota={{ used: 2, remaining: 2, isAvailable: true }}
      />
    )
    expect(screen.getByText(/Daring: 2\/4/)).toBeDefined()
  })

  it("renders semester info when provided", () => {
    render(
      <CourseCard
        {...defaultProps}
        semester={{ name: "Ganjil", year: "2025/2026", term: "Ganjil" }}
      />
    )
    expect(screen.getByText(/Ganjil/)).toBeDefined()
    expect(screen.getByText(/2025\/2026/)).toBeDefined()
  })
})
