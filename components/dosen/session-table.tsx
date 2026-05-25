"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, FileDown, FileText } from "lucide-react"
import { METHOD_LABELS } from "@/lib/constants"

interface SessionData {
  id: string
  meetingNumber: number
  date: string
  startTime: string
  endTime: string
  topic: string
  method: string
  sessionType: string
  studentPresent: number
  studentTotal: number
  status: string
  _count?: { documents: number }
}

interface Props {
  courseId: string
  teachingLoadId: string
  sessions: SessionData[]
}

export function SessionTable({ courseId, teachingLoadId, sessions }: Props) {
  const router = useRouter()

  async function handleDelete(id: string, meetingNumber: number) {
    if (!confirm(`Hapus sesi pertemuan ke-${meetingNumber}?`)) return
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      toast.success(data.message)
      router.refresh()
    } else {
      toast.error(data.message || "Gagal menghapus sesi")
    }
  }

  const publishedCount = sessions.filter((s) => s.status === "PUBLISHED").length

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {publishedCount > 0 && (
          <Button variant="outline" asChild>
            <a href={`/api/reports/bap-batch?teachingLoadId=${teachingLoadId}`} target="_blank" rel="noopener noreferrer" aria-label="Download Semua BAP">
              <FileText className="h-5 w-5 mr-2" aria-hidden="true" /> Download Semua BAP
            </a>
          </Button>
        )}
        <Button onClick={() => router.push(`/dashboard/dosen/courses/${courseId}/sessions/new`)} aria-label="Tambah Sesi">
          <Plus className="h-5 w-5 mr-2" aria-hidden="true" /> Tambah Sesi
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">TM</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jam</TableHead>
              <TableHead>Topik</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead>Hadir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.meetingNumber}</TableCell>
                <TableCell>
                  {format(new Date(s.date), "dd MMM yyyy", { locale: id })}
                </TableCell>
                <TableCell className="text-base">
                  {s.startTime} - {s.endTime}
                </TableCell>
                <TableCell className="max-w-xs truncate">{s.topic}</TableCell>
                <TableCell>
                  <Badge variant="outline">{METHOD_LABELS[s.method] || s.method}</Badge>
                </TableCell>
                <TableCell>{s.studentPresent}/{s.studentTotal}</TableCell>
                <TableCell>
                  <Badge variant={s.status === "PUBLISHED" ? "default" : "secondary"}>
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {s.status === "DRAFT" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/dashboard/dosen/courses/${courseId}/sessions/${s.id}/edit`)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-5 w-5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(s.id, s.meetingNumber)}
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </Button>
                      </>
                    )}
                    {s.status === "PUBLISHED" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/dashboard/dosen/courses/${courseId}/sessions/${s.id}`)}
                        aria-label="Download BAP"
                      >
                        <FileDown className="h-5 w-5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sessions.length === 0 && (
              <TableRow aria-live="polite">
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Belum ada sesi perkuliahan
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
