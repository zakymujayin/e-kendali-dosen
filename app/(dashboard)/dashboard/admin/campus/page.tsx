import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CampusForm } from "@/components/admin/campus/campus-form"

export default async function CampusPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const location = await prisma.campusLocation.findFirst({
    include: { faculty: { select: { id: true, name: true } } },
  })

  const faculties = await prisma.faculty.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Koordinat Kampus</h1>
      <CampusForm location={location} faculties={faculties} />
    </div>
  )
}
