import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, Clock } from "lucide-react"

export default async function GKMDashboardPage() {
  const session = await auth()
  const gkmProdiId = session?.user?.prodiId

  if (!gkmProdiId) return <p>Anda belum ditugaskan sebagai GKM prodi manapun.</p>

  const prodi = await prisma.prodi.findUnique({
    where: { id: gkmProdiId },
    include: {
      users: {
        where: { role: "DOSEN", isActive: true },
        include: {
          teachingLoads: {
            include: {
              course: true,
              sessions: true,
            },
          },
        },
      },
    },
  })

  if (!prodi) return <p>Prodi tidak ditemukan.</p>

  const dosenCount = prodi.users.length
  const totalMK = prodi.users.reduce((acc, u) => acc + u.teachingLoads.length, 0)
  const totalSessions = prodi.users.reduce(
    (acc, u) => acc + u.teachingLoads.reduce((a, tl) => a + tl.sessions.length, 0),
    0
  )

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard GKM — {prodi.name}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dosen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dosenCount}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Penugasan MK</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMK}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sesi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Dosen</CardTitle>
        </CardHeader>
        <CardContent>
          {dosenCount === 0 ? (
            <p className="text-muted-foreground">Belum ada dosen di prodi ini.</p>
          ) : (
            <div className="space-y-3">
              {prodi.users.map((dosen) => (
                <div
                  key={dosen.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{dosen.name}</p>
                    <p className="text-sm text-muted-foreground">{dosen.nidn || "-"}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{dosen.teachingLoads.length} MK</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
