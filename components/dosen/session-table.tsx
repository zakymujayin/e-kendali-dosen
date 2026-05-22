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
import { Plus, Pencil, Trash2, FileDown } from "lucide-react"
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => router.push(`/dashboard/dosen/courses/${courseId}/sessions/new`)}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Sesi
        </Button>
      </div>

      <div className="rounded-md border">
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
                <TableCell className="text-xs">
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
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(s.id, s.meetingNumber)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {s.status === "PUBLISHED" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/dashboard/dosen/courses/${courseId}/sessions/${s.id}`)}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sessions.length === 0 && (
              <TableRow>
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
