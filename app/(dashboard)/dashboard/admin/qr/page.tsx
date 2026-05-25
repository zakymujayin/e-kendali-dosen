import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { QrGeneratorClient } from "./qr-client"

export default async function QrPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">QR Code Scan Perkuliahan</h1>
        <p className="text-muted-foreground">Generate dan cetak QR Code untuk ditempel di kelas</p>
      </div>
      <QrGeneratorClient scanUrl={`${baseUrl}/scan`} />
    </div>
  )
}
