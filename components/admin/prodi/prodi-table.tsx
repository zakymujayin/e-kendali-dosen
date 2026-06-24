"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, UserCog, Trash2, GraduationCap } from "lucide-react"
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  async function handleDelete(id: string, name: string) {
    setDeleteTarget({ id, name })
  }

  async function doDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/prodi/${deleteTarget.id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      toast.success(data.message)
      router.refresh()
    } else {
      toast.error(data.message)
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditProdi(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Tambah Prodi
        </Button>
      </div>

      <div className="rounded-md border bg-card">
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
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditProdi(p); setDialogOpen(true) }}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Atur GKM" onClick={() => { setAssignProdi(p); setAssignOpen(true) }}>
                      <UserCog className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Hapus ${p.name}`} onClick={() => handleDelete(p.id, p.name)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {prodi.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  <div className="flex flex-col items-center gap-2">
                    <GraduationCap className="h-8 w-8 text-muted-foreground/30" />
                    <span>Belum ada data prodi</span>
                  </div>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Hapus Program Studi"
        description={`Anda yakin ingin menghapus prodi "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={doDelete}
      />
    </div>
  )
}
