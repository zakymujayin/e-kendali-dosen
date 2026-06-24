"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Plus, Trash2, AlertTriangle, Upload, ClipboardList } from "lucide-react"
import { AssignForm } from "./assign-form"
import { ImportJadwalDialog } from "./import-jadwal-dialog"
import { Card, CardContent } from "@/components/ui/card"

interface LoadData {
  id: string
  userId: string
  courseId: string
  semesterId: string
  isTeam: boolean
  user: { id: string; name: string; nidn: string | null; prodiId: string | null }
  course: { id: string; name: string; code: string; sks: number; prodiId: string }
  semester: { id: string; name: string; year: string; term: string }
  _count: { sessions: number }
}

interface Props {
  users: { id: string; name: string; nidn: string | null; prodiId: string | null }[]
  courses: { id: string; name: string; code: string; sks: number; prodiId: string; prodi: { name: string } }[]
  semesters: { id: string; name: string; year: string; term: string; isActive: boolean }[]
}

export function LoadTable({ users, courses, semesters }: Props) {
  const [data, setData] = useState<LoadData[]>([])
  const [loading, setLoading] = useState(true)
  const [semesterFilter, setSemesterFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LoadData | null>(null)

  useEffect(() => {
    const active = semesters.find((s) => s.isActive)
    if (active && !semesterFilter) {
      setSemesterFilter(active.id)
    }
  }, [semesters, semesterFilter])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (semesterFilter) params.set("semesterId", semesterFilter)
    const res = await fetch(`/api/teaching-loads?${params}`)
    const json = await res.json()
    if (json.success) {
      setData(json.data)
    }
    setLoading(false)
  }, [semesterFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const sksMap = new Map<string, number>()
  const userMap = new Map<string, { name: string; nidn: string | null }>()
  data.forEach((load) => {
    const current = sksMap.get(load.userId) || 0
    sksMap.set(load.userId, current + load.course.sks)
    userMap.set(load.userId, { name: load.user.name, nidn: load.user.nidn })
  })

  const warnings: { userId: string; name: string; total: number }[] = []
  sksMap.forEach((total, userId) => {
    if (total < 12 || total > 24) {
      const u = userMap.get(userId)
      warnings.push({ userId, name: u?.name || "-", total })
    }
  })

  async function handleDelete(load: LoadData) {
    setDeleteTarget(load)
  }

  async function doDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/teaching-loads/${deleteTarget.id}`, { method: "DELETE" })
    const json = await res.json()
    if (json.success) {
      toast.success(json.message)
      fetchData()
    } else {
      toast.error(json.message)
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50" role="alert">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Peringatan Beban SKS</p>
                <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                  {warnings.map((w) => (
                    <li key={w.userId}>
                      {w.name}: {w.total} SKS ({w.total < 12 ? "Kurang dari 12" : "Lebih dari 24"})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Hapus Penugasan"
        description={`Anda yakin ingin menghapus penugasan ${deleteTarget?.course.name} untuk ${deleteTarget?.user.name}?`}
        onConfirm={doDelete}
      />

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={semesterFilter} onValueChange={(v) => { setSemesterFilter(v) }}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Pilih semester" /></SelectTrigger>
          <SelectContent>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} {s.year} - {s.term} {s.isActive ? "(Aktif)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" aria-hidden="true" /> Import Jadwal
        </Button>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Tambah Penugasan
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dosen</TableHead>
              <TableHead>Mata Kuliah</TableHead>
              <TableHead>SKS</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Tim</TableHead>
              <TableHead>Sesi</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <ClipboardList className="h-8 w-8 text-muted-foreground/30" />
                  <span>Tidak ada data penugasan</span>
                </div>
              </TableCell></TableRow>
            ) : data.map((load) => (
              <TableRow key={load.id}>
                <TableCell>
                  <div className="font-medium">{load.user.name}</div>
                  <div className="text-xs text-muted-foreground">{load.user.nidn || "-"}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{load.course.code}</div>
                  <div className="text-xs text-muted-foreground">{load.course.name}</div>
                </TableCell>
                <TableCell>{load.course.sks}</TableCell>
                <TableCell>
                  {load.semester.name} {load.semester.year} - {load.semester.term}
                </TableCell>
                <TableCell>
                  {load.isTeam ? (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300">Y</Badge>
                  ) : (
                    <Badge variant="outline">T</Badge>
                  )}
                </TableCell>
                <TableCell>{load._count.sessions}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" aria-label={`Hapus penugasan ${load.course.name}`} onClick={() => handleDelete(load)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AssignForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        users={users}
        courses={courses}
        semesters={semesters}
        onSuccess={() => { setDialogOpen(false); fetchData() }}
      />
      <ImportJadwalDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => { setImportOpen(false); fetchData() }}
        semesters={semesters}
      />
    </div>
  )
}
