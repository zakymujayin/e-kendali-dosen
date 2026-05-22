# Sub-FASE 3a — Sesi Perkuliahan Implementation Plan

**Goal:** Build dosen lecture session management — CRUD sessions with GPS validation (luring), URL/kuota validation (daring), publish, and document upload.

**Architecture:** API routes under `app/api/sessions/`, dosen pages under `app/(dashboard)/dashboard/dosen/courses/`, shared components under `components/dosen/`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Zod, sonner, leaflet

---

### Task 1: API Dashboard Dosen

**Files:** Create `app/api/dashboard/dosen/route.ts`

GET endpoint returning:
- total MK diampu (count teaching loads for this user in active semester)
- total sesi published
- total sesi draft
- list of teaching loads with progress info

### Task 2: API Daring Quota

**Files:** Create `app/api/teaching-loads/[id]/daring-quota/route.ts`

GET endpoint returning `{ used, remaining, isAvailable, maxDaring }` using `checkDaringQuota()` from `lib/api.ts`.

### Task 3: API Sessions — Create + List

**Files:** Create `app/api/sessions/route.ts`

POST: Create session with GPS/URL validation. Use `sessionSchema` from validators. Calculate GPS distance, check daring quota. Save as DRAFT.

GET: List sessions with filters (for GKM/Dekanat). Admin/GKM/Dekanat access.

### Task 4: API Sessions/My

**Files:** Create `app/api/sessions/my/route.ts`

GET: All sessions for current user, with `?courseId=` filter. Include TeachingLoad with Course + Semester.

### Task 5: API Session Detail + Update + Delete

**Files:** Create `app/api/sessions/[id]/route.ts`

GET: Detail sesi with TeachingLoad + documents.
PUT: Edit sesi (only DRAFT).
DELETE: Hapus sesi (only DRAFT).

### Task 6: API Session Publish

**Files:** Create `app/api/sessions/[id]/publish/route.ts`

PUT: Change status to PUBLISHED, set publishedAt. Only DRAFT sessions.

### Task 7: API Documents

**Files:** Create `app/api/documents/route.ts` + `app/api/documents/[id]/route.ts`

POST: Upload document to session.
GET: Download document.
DELETE: Delete document.

### Task 8: Course Card Component

**Files:** Create `components/dosen/course-card.tsx`

Card component showing course name, code, SKS, progress TM, daring quota badge.

### Task 9: MK Saya Page

**Files:** Create `app/(dashboard)/dashboard/dosen/courses/page.tsx`

Server component fetching teaching loads and rendering course cards.

### Task 10: Session Table Component

**Files:** Create `components/dosen/session-table.tsx`

Table component listing sessions with status badges and action buttons.

### Task 11: Course Detail Page

**Files:** Create `app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx`

Server + client page showing course info and session table.

### Task 12: Session Form Component

**Files:** Create `components/dosen/session-form.tsx`

Complex form with: meeting number, date, time, topic, method grid (Luring/Daring), attendance, GPS detection (luring), URL input (daring), kuota info bar, notes. Submit as Draft or Publish.

### Task 13: Session Form Pages

**Files:** Create:
- `app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/new/page.tsx`
- `app/(dashboard)/dashboard/dosen/courses/[courseId]/sessions/[id]/edit/page.tsx`
