# FASE 6 — Testing Infrastructure

## Overview

Set up Vitest + React Testing Library + MSW for unit, integration, and component testing. Write tests for pure utility functions, API helpers, and key components.

## Approach

- **Vitest** — test runner (fast, ESM-native, minimal config)
- **React Testing Library** — component testing
- **MSW** (Mock Service Worker) — mock API calls in component tests

## Scope

### 6a — Core (FASE ini)
| # | Item | Target |
|---|------|--------|
| 1 | Setup Vitest + RTL + MSW | `vitest.config.ts`, `tests/setup.ts` |
| 2 | Unit test: `lib/gps.ts` | `hitungJarakMeter()`, `isInCampusRadius()` |
| 3 | Unit test: `lib/validators.ts` | `sessionSchema` validation rules |
| 4 | Unit test: `lib/constants.ts` | `isDaringMethod()`, `METHOD_LABELS` |
| 5 | Integration: `lib/api.ts` | `successResponse`, `errorResponse` etc |
| 6 | Integration: `lib/excel.ts` | `generateExcel()`, `parseExcel()` |
| 7 | Component: `components/dosen/session-table.tsx` | Render, delete action |
| 8 | Component: `components/dosen/course-card.tsx` | Render with props |

### 6b — Deferred
- API route integration tests (need test DB)
- E2E with Playwright

## Dependencies

```json
{
  "vitest": "^3.1.0",
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.6.0",
  "jsdom": "^26.0.0",
  "msw": "^2.7.0"
}
```

## File Structure

```
tests/
  setup.ts          # vitest setup (jsdom, RTL matchers)
  lib/
    gps.test.ts
    validators.test.ts
    constants.test.ts
    api.test.ts
    excel.test.ts
  components/
    session-table.test.tsx
    course-card.test.tsx
vitest.config.ts
```

## Implementation Order

1. Install dependencies + create `vitest.config.ts` + `tests/setup.ts`
2. `lib/gps.test.ts`
3. `lib/validators.test.ts`
4. `lib/constants.test.ts`
5. `lib/api.test.ts`
6. `lib/excel.test.ts`
7. `components/session-table.test.tsx`
8. `components/course-card.test.tsx`
9. All tests pass + commit
