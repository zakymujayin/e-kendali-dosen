import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CampusManager } from "@/components/admin/campus/campus-manager"

export default async function CampusPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const locations = await prisma.campusLocation.findMany({
    include: { faculty: { select: { id: true, name: true } } },
    orderBy: [{ faculty: { name: "asc" } }, { label: "asc" }],
  })

  const faculties = await prisma.faculty.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6 animate-fade-in-up" id="main-content">
      <h1 className="text-2xl font-bold tracking-tight">Koordinat Kampus</h1>
      <CampusManager locations={locations} faculties={faculties} />
    </div>
  )
}
