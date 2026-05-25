import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { UserTable } from "@/components/admin/users/user-table"

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const faculties = await prisma.faculty.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6 animate-fade-in-up" id="main-content">
      <h1 className="text-2xl font-bold tracking-tight">Data User</h1>
      <UserTable faculties={faculties} />
    </div>
  )
}
