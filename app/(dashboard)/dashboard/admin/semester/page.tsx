import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SemesterTable } from "@/components/admin/semester/semester-table"

export default async function SemesterPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="space-y-6 animate-fade-in-up" id="main-content">
      <h1 className="text-2xl font-bold tracking-tight">Data Semester</h1>
      <SemesterTable />
    </div>
  )
}
