# FASE 6 — Testing Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement this plan task-by-task.

**Goal:** Set up Vitest + RTL + MSW, write tests for utility libs and key components.

**Architecture:** Vitest with jsdom environment, React Testing Library for components, MSW for API mocking. Tests live in `tests/` mirroring `lib/` and `components/` structure.

**Tech Stack:** vitest, @testing-library/react, @testing-library/jest-dom, jsdom, msw

---

### Task 1: Setup Vitest + test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
```

- [ ] **Create tests/setup.ts**

```typescript
import "@testing-library/jest-dom/vitest"
```

- [ ] **Install dependencies**

```bash
npm install --save-dev vitest@^3.1.0 @testing-library/react@^16.3.0 @testing-library/jest-dom@^6.6.0 jsdom@^26.0.0 --legacy-peer-deps
```

- [ ] **Add test script to package.json**

In `package.json`, add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Verify setup works**

```bash
npm test
```

Expected output: `No test files found` (no tests yet, but vitest runs without crashing)

- [ ] **Commit**

```bash
git add vitest.config.ts tests/setup.ts package.json
git commit -m "chore: add vitest testing infrastructure"
```

---

### Task 2: Unit test lib/gps.ts

**Files:**
- Create: `tests/lib/gps.test.ts`

- [ ] **Create test file**

```typescript
import { describe, it, expect } from "vitest"
import { hitungJarakMeter, isInCampusRadius } from "@/lib/gps"

describe("hitungJarakMeter", () => {
  it("returns 0 for same coordinates", () => {
    const result = hitungJarakMeter(-6.2, 106.8, -6.2, 106.8)
    expect(result).toBe(0)
  })

  it("calculates distance between two points correctly", () => {
    // UI campus lat/lng approx -6.364, 106.829
    // ~100m away approx -6.363, 106.829
    const result = hitungJarakMeter(-6.364, 106.829, -6.363, 106.829)
    // Should be approximately 111 meters (1 deg lat ≈ 111km)
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
    // ~100m away
    expect(isInCampusRadius(-6.363, 106.829, campusLat, campusLng)).toBe(true)
  })

  it("returns false when outside default radius", () => {
    // ~5km away
    expect(isInCampusRadius(-6.4, 106.85, campusLat, campusLng)).toBe(false)
  })

  it("uses custom radius", () => {
    // ~100m away with 50m radius = false
    expect(isInCampusRadius(-6.363, 106.829, campusLat, campusLng, 50)).toBe(false)
    // Same with 200m radius = true
    expect(isInCampusRadius(-6.363, 106.829, campusLat, campusLng, 200)).toBe(true)
  })
})
```

- [ ] **Run tests and verify**

```bash
npm test -- tests/lib/gps.test.ts
```

Expected: all tests pass

- [ ] **Commit**

```bash
git add tests/lib/gps.test.ts
git commit -m "test: add GPS unit tests"
```

---

### Task 3: Unit test lib/constants.ts

**Files:**
- Create: `tests/lib/constants.test.ts`

- [ ] **Create test file**

```typescript
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
  it("has labels for all roles", () => {
    const roles = ["ADMIN", "DOSEN", "GKM", "DEKANAT"]
    for (const r of roles) {
      expect(ROLE_LABELS[r]).toBeDefined()
    }
  })
})
```

- [ ] **Run tests and verify**

```bash
npm test -- tests/lib/constants.test.ts
```

- [ ] **Commit**

```bash
git add tests/lib/constants.test.ts
git commit -m "test: add constants unit tests"
```

---

### Task 4: Unit test lib/validators.ts

**Files:**
- Create: `tests/lib/validators.test.ts`

- [ ] **Create test file**

```typescript
import { describe, it, expect } from "vitest"
import { isValidUrl, sessionSchema, loginSchema, userSchema } from "@/lib/validators"

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
    const result = sessionSchema.safeParse(validSession)
    expect(result.success).toBe(true)
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

  it("fails for luring session without GPS", () => {
    const result = sessionSchema.safeParse({
      ...validSession,
      latitude: undefined,
      longitude: undefined,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("latitude"))).toBe(true)
    }
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
      email: "dosen@example.com",
      password: "password123",
    })
    expect(result.success).toBe(true)
  })

  it("fails for invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    })
    expect(result.success).toBe(false)
  })

  it("fails for short password", () => {
    const result = loginSchema.safeParse({
      email: "dosen@example.com",
      password: "12345",
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Run tests and verify**

```bash
npm test -- tests/lib/validators.test.ts
```

- [ ] **Commit**

```bash
git add tests/lib/validators.test.ts
git commit -m "test: add validators unit tests"
```

---

### Task 5: Integration test lib/api.ts (response helpers)

**Files:**
- Create: `tests/lib/api.test.ts`

The `lib/api.ts` exports functions like `successResponse`, `errorResponse`, `notFound`, etc. These return `NextResponse` objects. We can test their status codes and JSON bodies.

- [ ] **Create test file**

```typescript
import { describe, it, expect } from "vitest"
import { successResponse, errorResponse, notFound, unauthorized, forbidden } from "@/lib/api"

async function parseResponse(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe("successResponse", () => {
  it("returns 200 with data by default", async () => {
    const res = await parseResponse(successResponse({ id: "1" }))
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toEqual({ id: "1" })
  })

  it("returns custom status code", async () => {
    const res = await parseResponse(successResponse({}, "Created", 201))
    expect(res.status).toBe(201)
    expect(res.body.message).toBe("Created")
  })

  it("includes message when provided", async () => {
    const res = await parseResponse(successResponse(null, "Success"))
    expect(res.body.message).toBe("Success")
  })
})

describe("errorResponse", () => {
  it("returns 400 with error message", async () => {
    const res = await parseResponse(errorResponse("Bad request"))
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("Bad request")
  })

  it("returns custom status code", async () => {
    const res = await parseResponse(errorResponse("Server error", 500))
    expect(res.status).toBe(500)
  })
})

describe("notFound", () => {
  it("returns 404", async () => {
    const res = await parseResponse(notFound())
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it("returns custom message", async () => {
    const res = await parseResponse(notFound("User not found"))
    expect(res.body.message).toBe("User not found")
  })
})

describe("unauthorized", () => {
  it("returns 401", async () => {
    const res = await parseResponse(unauthorized())
    expect(res.status).toBe(401)
    expect(res.body.message).toBe("Unauthorized")
  })
})

describe("forbidden", () => {
  it("returns 403", async () => {
    const res = await parseResponse(forbidden())
    expect(res.status).toBe(403)
    expect(res.body.message).toBe("Forbidden")
  })
})
```

- [ ] **Run tests**

```bash
npm test -- tests/lib/api.test.ts
```

- [ ] **Commit**

```bash
git add tests/lib/api.test.ts
git commit -m "test: add API response helpers integration tests"
```

---

### Task 6: Integration test lib/excel.ts

**Files:**
- Create: `tests/lib/excel.test.ts`

- [ ] **Create test file**

```typescript
import { describe, it, expect } from "vitest"
import { generateExcel, parseExcel } from "@/lib/excel"

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
    // Parse it back to verify headers
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
```

- [ ] **Run tests**

```bash
npm test -- tests/lib/excel.test.ts
```

- [ ] **Commit**

```bash
git add tests/lib/excel.test.ts
git commit -m "test: add Excel generation integration tests"
```

---

### Task 7: Component test — course-card

**Files:**
- Create: `tests/components/course-card.test.tsx`

The course-card component is a client component. We need to mock Next.js router since it imports from `next/navigation`.

- [ ] **Create test file**

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { CourseCard } from "@/components/dosen/course-card"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe("CourseCard", () => {
  const defaultProps = {
    id: "tl-1",
    courseId: "c-1",
    courseName: "Pemrograman Web",
    courseCode: "IF123",
    courseSks: 3,
    totalMeeting: 16,
    publishedSessions: 10,
    draftSessions: 2,
    totalDaring: 2,
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

  it("renders progress percentage", () => {
    render(<CourseCard {...defaultProps} />)
    expect(screen.getByText(/62\.5%/)).toBeDefined()
  })

  it("renders published and draft counts", () => {
    render(<CourseCard {...defaultProps} />)
    expect(screen.getByText(/10/)).toBeDefined()
    expect(screen.getByText(/2/)).toBeDefined()
  })

  it("renders with 0 progress", () => {
    render(<CourseCard {...defaultProps} progress={0} publishedSessions={0} />)
    expect(screen.getByText(/0%/)).toBeDefined()
  })
})
```

- [ ] **Run tests**

```bash
npm test -- tests/components/course-card.test.tsx
```

- [ ] **Commit**

```bash
git add tests/components/course-card.test.tsx
git commit -m "test: add CourseCard component test"
```

---

### Task 8: Component test — session-table

**Files:**
- Create: `tests/components/session-table.test.tsx`

- [ ] **Create test file**

```typescript
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

  it("renders session rows", () => {
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

  it("handles empty sessions list", () => {
    render(<SessionTable {...defaultProps} sessions={[]} />)
    expect(screen.getByText("Belum ada sesi perkuliahan")).toBeDefined()
  })
})
```

- [ ] **Run all tests**

```bash
npm test
```

Expected: all 8+ test files pass

- [ ] **Commit**

```bash
git add tests/components/session-table.test.tsx
git commit -m "test: add SessionTable component test"
```

---

### Task 9: Run all tests + push

- [ ] **Run full test suite**

```bash
npm test
```

Expected: all tests pass, exit code 0

- [ ] **Push**

```bash
git push
```
