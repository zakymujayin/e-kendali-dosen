import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { UserForm } from "@/components/admin/users/user-form"

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const [faculties, prodiList] = await Promise.all([
    prisma.faculty.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.prodi.findMany({ select: { id: true, name: true, facultyId: true }, orderBy: { name: "asc" } }),
  ])

  return <UserForm mode="edit" userId={id} faculties={faculties} prodiList={prodiList} />
}
