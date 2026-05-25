"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { FacultyDialog } from "./faculty-dialog"

interface FacultyWithCount {
  id: string
  name: string
  code: string
  _count: { prodi: number }
}

interface Props {
  faculties: FacultyWithCount[]
}

export function FacultyTable({ faculties }: Props) {
  const router = useRouter()
  const [editFaculty, setEditFaculty] = useState<FacultyWithCount | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function handleDelete(f: FacultyWithCount) {
    if (f._count.prodi > 0) {
      toast.error("Fakultas masih memiliki prodi. Pindahkan atau hapus prodi terlebih dahulu.")
      return
    }
    if (!confirm(`Hapus fakultas "${f.name}"?`)) return
    const res = await fetch(`/api/faculties/${f.id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      toast.success(data.message)
      router.refresh()
    } else {
      toast.error(data.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditFaculty(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Tambah Fakultas
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Fakultas</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Prodi</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faculties.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell>{f.code}</TableCell>
                <TableCell><Badge variant="secondary">{f._count.prodi}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Edit fakultas" onClick={() => { setEditFaculty(f); setDialogOpen(true) }}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Hapus ${f.name}`} onClick={() => handleDelete(f)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {faculties.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Belum ada data fakultas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FacultyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        faculty={editFaculty}
        onSuccess={() => { setDialogOpen(false); setEditFaculty(null); router.refresh() }}
      />
    </div>
  )
}
