import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Globe, Download, FileText } from "lucide-react"
import { METHOD_LABELS } from "@/lib/constants"

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>
}) {
  const { courseId, sessionId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const lectureSession = await prisma.lectureSession.findUnique({
    where: { id: sessionId },
    include: {
      teachingLoad: {
        include: {
          course: true,
          user: { select: { id: true, name: true, nidn: true } },
          semester: true,
        },
      },
      documents: {
        select: { id: true, name: true, fileUrl: true, fileType: true, fileSize: true, createdAt: true },
      },
    },
  })

  if (!lectureSession) return notFound()
  if (lectureSession.teachingLoad.userId !== session.user.id) return notFound()

  const tl = lectureSession.teachingLoad

  const typeLabel =
    lectureSession.sessionType === "NORMAL" ? "Normal" :
    lectureSession.sessionType === "PENGGANTI" ? "Pengganti" : "Tambahan"

  const statusVariant = lectureSession.status === "PUBLISHED" ? "default" : "secondary"

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild aria-label="Kembali">
          <Link href={`/dashboard/dosen/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Detail Sesi &mdash; Pertemuan ke-{lectureSession.meetingNumber}
          </h1>
          <p className="text-muted-foreground">
            {tl.course.name} ({tl.course.code})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tanggal</p>
            <p className="font-semibold">
              {format(new Date(lectureSession.date), "dd MMM yyyy", { locale: id })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Jam</p>
            <p className="font-semibold">
              {lectureSession.startTime} - {lectureSession.endTime}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Metode</p>
            <p className="font-semibold">{METHOD_LABELS[lectureSession.method] || lectureSession.method}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={statusVariant}>{lectureSession.status}</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Sesi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Topik</span>
              <span className="font-medium text-right max-w-[200px]">{lectureSession.topic}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipe</span>
              <span>{typeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dosen</span>
              <span>{tl.user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Semester</span>
              <span>{tl.semester.name} {tl.semester.year}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kehadiran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hadir</span>
              <span className="font-medium">{lectureSession.studentPresent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tidak Hadir</span>
              <span className="font-medium">{lectureSession.studentAbsent}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Total</span>
              <span className="font-bold">{lectureSession.studentTotal}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {lectureSession.isDaring && lectureSession.platformUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" aria-hidden="true" /> URL Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={lectureSession.platformUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {lectureSession.platformUrl}
            </a>
          </CardContent>
        </Card>
      )}

      {!lectureSession.isDaring && lectureSession.latitude && lectureSession.longitude && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden="true" /> Lokasi GPS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-4">
              <span>Lat: {lectureSession.latitude}</span>
              <span>Lng: {lectureSession.longitude}</span>
            </div>
            {lectureSession.distanceMeters && (
              <p>Jarak dari kampus terdekat: {Math.round(lectureSession.distanceMeters)}m</p>
            )}
            {lectureSession.gpsAccuracy && (
              <p>Akurasi: {lectureSession.gpsAccuracy}m</p>
            )}
            <Badge variant={lectureSession.isGpsValid ? "default" : "destructive"}>
              {lectureSession.isGpsValid ? "Lokasi Valid" : "Lokasi Tidak Valid"}
            </Badge>
          </CardContent>
        </Card>
      )}

      {lectureSession.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catatan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{lectureSession.notes}</p>
          </CardContent>
        </Card>
      )}

      {lectureSession.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" aria-hidden="true" /> Dokumen ({lectureSession.documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lectureSession.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm">{doc.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(doc.fileSize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" asChild aria-label="Download Dokumen">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {lectureSession.status === "PUBLISHED" && (
        <div className="flex justify-end">
          <Button asChild>
            <a href={`/api/sessions/${lectureSession.id}/bap`} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Download BAP
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
