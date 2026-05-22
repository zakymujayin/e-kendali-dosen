# FASE 2 — Data Master Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 6 CRUD Admin features (Prodi, Users, Semester, Courses, Teaching Loads, Campus Location) with API routes, pages, and components.

**Architecture:** Feature-based directories under `components/admin/[feature]/`, RESTful API routes under `app/api/[feature]/`, shared validation via `lib/validators.ts`, shared response helpers via `lib/api.ts`. All API routes follow: `auth()` → `requireRole("ADMIN")` → Zod validate → prisma mutate → response helper.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Tailwind v4, shadcn/ui, Zod, Sonner (toast), Lucide icons, Leaflet

---

### Task 1: API Prodi

**Files:**
- Create: `app/api/prodi/route.ts`
- Create: `app/api/prodi/[id]/route.ts`
- Create: `app/api/prodi/[id]/assign-gkm/route.ts`

### Task 2: Component Prodi

**Files:**
- Create: `components/admin/prodi/prodi-table.tsx`
- Create: `components/admin/prodi/prodi-dialog.tsx`
- Create: `components/admin/prodi/assign-gkm-dialog.tsx`
- Modify: `app/(dashboard)/dashboard/admin/prodi/page.tsx`

### Task 3: API Users

**Files:**
- Create: `app/api/users/route.ts`
- Create: `app/api/users/[id]/route.ts`
- Create: `app/api/users/[id]/toggle-active/route.ts`
- Create: `app/api/users/import/route.ts`
- Create: `app/api/users/template/route.ts`

### Task 4: Component Users

**Files:**
- Create: `components/admin/users/user-table.tsx`
- Create: `components/admin/users/user-form.tsx`
- Create: `components/admin/users/import-dialog.tsx`
- Modify: `app/(dashboard)/dashboard/admin/users/page.tsx`

### Task 5: API Semester

**Files:**
- Create: `app/api/semesters/route.ts`
- Create: `app/api/semesters/active/route.ts`
- Create: `app/api/semesters/[id]/route.ts`
- Create: `app/api/semesters/[id]/activate/route.ts`

### Task 6: Component Semester

**Files:**
- Create: `components/admin/semester/semester-table.tsx`
- Create: `components/admin/semester/semester-dialog.tsx`
- Modify: `app/(dashboard)/dashboard/admin/semester/page.tsx`

### Task 7: API Courses

**Files:**
- Create: `app/api/courses/route.ts`
- Create: `app/api/courses/[id]/route.ts`
- Create: `app/api/courses/import/route.ts`

### Task 8: Component Courses

**Files:**
- Create: `components/admin/courses/course-table.tsx`
- Create: `components/admin/courses/course-dialog.tsx`
- Modify: `app/(dashboard)/dashboard/admin/courses/page.tsx`

### Task 9: API Teaching Loads

**Files:**
- Create: `app/api/teaching-loads/route.ts`
- Create: `app/api/teaching-loads/[id]/route.ts`
- Create: `app/api/teaching-loads/my/route.ts`

### Task 10: Component Teaching Loads

**Files:**
- Create: `components/admin/teaching-loads/load-table.tsx`
- Create: `components/admin/teaching-loads/assign-form.tsx`
- Modify: `app/(dashboard)/dashboard/admin/teaching-loads/page.tsx`

### Task 11: API Campus Location

**Files:**
- Create: `app/api/campus/location/route.ts`
- Create: `app/api/campus/validate-gps/route.ts`

### Task 12: Component Campus

**Files:**
- Create: `components/admin/campus/campus-form.tsx`
- Modify: `app/(dashboard)/dashboard/admin/campus/page.tsx`
