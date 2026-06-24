import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, BookOpen, MapPin } from "lucide-react"

export default async function AdminDashboardPage() {
  const [totalUsers, totalProdi, totalCourses, campusLocation] = await Promise.all([
    prisma.user.count(),
    prisma.prodi.count(),
    prisma.course.count(),
    prisma.campusLocation.count(),
  ])

  const stats = [
    { label: "Total User", value: totalUsers, icon: Users },
    { label: "Total Prodi", value: totalProdi, icon: GraduationCap },
    { label: "Total MK", value: totalCourses, icon: BookOpen },
    { label: "Koordinat Kampus", value: `${campusLocation} lokasi`, icon: MapPin },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up" id="main-content">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard Admin</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          const accentMap: Record<string, string> = {
            "Total User": "text-blue-600",
            "Total Prodi": "text-green-600",
            "Total MK": "text-orange-600",
            "Koordinat Kampus": "text-purple-600",
          }
          const iconColor = accentMap[s.label] || "text-muted-foreground"
          return (
            <Card key={s.label} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
