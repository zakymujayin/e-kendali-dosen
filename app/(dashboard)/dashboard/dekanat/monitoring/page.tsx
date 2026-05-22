import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { MonitoringClient } from "./monitoring-client"

export default async function DekanatMonitoringPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "DEKANAT") redirect("/dashboard")

  const prodiList = await prisma.prodi.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const allDosen = await prisma.user.findMany({
    where: { role: "DOSEN", isActive: true },
    select: { id: true, name: true, nidn: true, prodiId: true },
    orderBy: { name: "asc" },
  })

  return (
    <MonitoringClient
      prodiList={prodiList}
      allDosen={allDosen}
    />
  )
}
