import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProdiTable } from "@/components/admin/prodi/prodi-table"

export default async function ProdiPage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN")) redirect("/dashboard")

  const [prodi, faculties] = await Promise.all([
    prisma.prodi.findMany({
      include: {
        faculty: { select: { id: true, name: true, code: true } },
        gkmUsers: { take: 1, orderBy: { name: "asc" }, select: { id: true, name: true } },
        _count: { select: { users: true, courses: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.faculty.findMany({ orderBy: { name: "asc" } }),
  ])

  const users = await prisma.user.findMany({
    where: { role: "DOSEN", isActive: true },
    select: { id: true, name: true, nidn: true, prodiId: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6 animate-fade-in-up" id="main-content">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Data Prodi</h1>
      </div>
      <ProdiTable prodi={prodi} faculties={faculties} users={users} />
    </div>
  )
}
