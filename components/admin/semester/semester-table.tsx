"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, CheckCircle } from "lucide-react"
import { SemesterDialog } from "./semester-dialog"

interface SemesterData {
  id: string
  name: string
  year: string
  term: string
  startDate: string
  endDate: string
  isActive: boolean
  _count: { courses: number }
}

export function SemesterTable() {
  const router = useRouter()
  const [semesters, setSemesters] = useState<SemesterData[]>([])
  const [editSemester, setEditSemester] = useState<SemesterData | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchSemesters()
  }, [])

  async function fetchSemesters() {
    const res = await fetch("/api/semesters")
    const data = await res.json()
    if (data.success) {
      setSemesters(data.data)
    }
  }

  async function handleActivate(id: string) {
    const res = await fetch(`/api/semesters/${id}/activate`, { method: "PUT" })
    const data = await res.json()
    if (data.success) {
      toast.success(data.message)
      fetchSemesters()
    } else {
      toast.error(data.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditSemester(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Tambah Semester
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Tahun</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Tanggal Mulai</TableHead>
              <TableHead>Tanggal Selesai</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {semesters.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.year}</TableCell>
                <TableCell>{s.term}</TableCell>
                <TableCell>{new Date(s.startDate).toLocaleDateString("id-ID")}</TableCell>
                <TableCell>{new Date(s.endDate).toLocaleDateString("id-ID")}</TableCell>
                <TableCell>
                  {s.isActive ? (
                    <Badge className="bg-green-500">Aktif</Badge>
                  ) : (
                    <Badge variant="secondary">Tidak</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditSemester(s); setDialogOpen(true) }}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    {!s.isActive && (
                      <Button variant="ghost" size="icon" aria-label="Aktifkan" onClick={() => handleActivate(s.id)}>
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {semesters.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Belum ada data semester
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SemesterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        semester={editSemester}
        onSuccess={() => { setDialogOpen(false); setEditSemester(null); fetchSemesters() }}
      />
    </div>
  )
}
