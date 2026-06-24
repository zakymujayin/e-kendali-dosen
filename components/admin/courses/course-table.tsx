"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, Upload, Search, BookMarked } from "lucide-react"
import { CourseDialog } from "./course-dialog"
import { ImportDialog } from "./import-dialog"

interface CourseData {
  id: string
  name: string
  code: string
  sks: number
  totalMeeting: number
  prodiId: string
  semesterId: string
  prodi: { id: string; name: string }
  semester: { id: string; name: string; year: string; term: string }
  _count: { teachingLoads: number }
}

interface Props {
  prodiList: { id: string; name: string }[]
  semesters: { id: string; name: string; year: string; term: string }[]
}

export function CourseTable({ prodiList, semesters }: Props) {
  const [data, setData] = useState<CourseData[]>([])
  const [loading, setLoading] = useState(true)
  const [prodiFilter, setProdiFilter] = useState("")
  const [semesterFilter, setSemesterFilter] = useState("")
  const [search, setSearch] = useState("")
  const [editCourse, setEditCourse] = useState<CourseData | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CourseData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (prodiFilter) params.set("prodiId", prodiFilter)
    if (semesterFilter) params.set("semesterId", semesterFilter)
    if (search) params.set("search", search)
    const res = await fetch(`/api/courses?${params}`)
    const json = await res.json()
    if (json.success) {
      setData(json.data)
    }
    setLoading(false)
  }, [prodiFilter, semesterFilter, search])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(course: CourseData) {
    setDeleteTarget(course)
  }

  async function doDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/courses/${deleteTarget.id}`, { method: "DELETE" })
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
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={prodiFilter} onValueChange={(v) => { setProdiFilter(v); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Semua Prodi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">Semua Prodi</SelectItem>
            {prodiList.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={semesterFilter} onValueChange={(v) => { setSemesterFilter(v); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Semua Semester" /></SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">Semua Semester</SelectItem>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name} {s.year} - {s.term}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Cari kode atau nama MK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" aria-hidden="true" /> Import
        </Button>
        <Button onClick={() => { setEditCourse(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Tambah MK
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>SKS</TableHead>
              <TableHead>Total Pertemuan</TableHead>
              <TableHead>Prodi</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Penugasan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <BookMarked className="h-8 w-8 text-muted-foreground/30" />
                  <span>Tidak ada data MK</span>
                </div>
              </TableCell></TableRow>
            ) : data.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.code}</TableCell>
                <TableCell>{course.name}</TableCell>
                <TableCell>{course.sks}</TableCell>
                <TableCell>{course.totalMeeting}</TableCell>
                <TableCell>{course.prodi.name}</TableCell>
                <TableCell>{course.semester.name} {course.semester.year} - {course.semester.term}</TableCell>
                <TableCell><Badge variant="secondary">{course._count.teachingLoads}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditCourse(course); setDialogOpen(true) }}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Hapus ${course.name}`} onClick={() => handleDelete(course)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        course={editCourse}
        prodiList={prodiList}
        semesters={semesters}
        onSuccess={() => { setDialogOpen(false); setEditCourse(null); fetchData() }}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => { setImportOpen(false); fetchData() }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Hapus Mata Kuliah"
        description={`Anda yakin ingin menghapus MK "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={doDelete}
      />
    </div>
  )
}
