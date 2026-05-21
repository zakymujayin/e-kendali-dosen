import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, BookOpen, MapPin } from "lucide-react"

export default async function AdminDashboardPage() {
  const session = await auth()
  const facultyId = session?.user?.prodiId

  const [totalUsers, totalProdi, totalCourses, campusLocation] = await Promise.all([
    prisma.user.count(),
    prisma.prodi.count(),
    prisma.course.count(),
    prisma.campusLocation.findFirst(),
  ])

  const stats = [
    { label: "Total User", value: totalUsers, icon: Users },
    { label: "Total Prodi", value: totalProdi, icon: GraduationCap },
    { label: "Total MK", value: totalCourses, icon: BookOpen },
    { label: "Koordinat Kampus", value: campusLocation ? "Tersimpan" : "Belum Setup", icon: MapPin },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Admin</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
