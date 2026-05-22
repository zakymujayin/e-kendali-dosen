"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, UserCog, Trash2 } from "lucide-react"
import { ProdiDialog } from "./prodi-dialog"
import { AssignGkmDialog } from "./assign-gkm-dialog"

interface ProdiWithRelations {
  id: string
  name: string
  code: string
  facultyId: string
  faculty: { id: string; name: string; code: string }
  gkmUsers: { id: string; name: string }[]
  _count: { users: number; courses: number }
}

interface Props {
  prodi: ProdiWithRelations[]
  faculties: { id: string; name: string; code: string }[]
  users: { id: string; name: string; nidn: string | null; prodiId: string | null }[]
}

export function ProdiTable({ prodi, faculties, users }: Props) {
  const router = useRouter()
  const [editProdi, setEditProdi] = useState<ProdiWithRelations | null>(null)
  const [assignProdi, setAssignProdi] = useState<ProdiWithRelations | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus prodi "${name}"?`)) return
    const res = await fetch(`/api/prodi/${id}`, { method: "DELETE" })
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
        <Button onClick={() => { setEditProdi(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Prodi
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Fakultas</TableHead>
              <TableHead>GKM</TableHead>
              <TableHead>Dosen</TableHead>
              <TableHead>MK</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prodi.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.code}</TableCell>
                <TableCell>{p.faculty.name}</TableCell>
                <TableCell>{p.gkmUsers[0]?.name || "-"}</TableCell>
                <TableCell><Badge variant="secondary">{p._count.users}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{p._count.courses}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditProdi(p); setDialogOpen(true) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setAssignProdi(p); setAssignOpen(true) }}>
                      <UserCog className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id, p.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {prodi.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Belum ada data prodi
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ProdiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prodi={editProdi}
        faculties={faculties}
        onSuccess={() => { setDialogOpen(false); setEditProdi(null); router.refresh() }}
      />

      <AssignGkmDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        prodi={assignProdi}
        users={users}
        onSuccess={() => { setAssignOpen(false); setAssignProdi(null); router.refresh() }}
      />
    </div>
  )
}
