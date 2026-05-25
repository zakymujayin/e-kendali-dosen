"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, Download, Upload, Search, Power, PowerOff } from "lucide-react"
import { ROLE_LABELS } from "@/lib/constants"
import { ImportDialog } from "./import-dialog"

interface UserData {
  id: string
  username: string
  name: string
  email: string
  role: string
  nidn: string | null
  nip: string | null
  phone: string | null
  avatar: string | null
  prodiId: string | null
  isActive: boolean
  prodi?: { id: string; name: string } | null
}

interface Props {
  faculties: { id: string; name: string }[]
}

export function UserTable({ faculties }: Props) {
  const router = useRouter()
  const [data, setData] = useState<UserData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [roleFilter, setRoleFilter] = useState("")
  const [search, setSearch] = useState("")
  const [importOpen, setImportOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (roleFilter) params.set("role", roleFilter)
    if (search) params.set("search", search)
    params.set("page", String(page))
    params.set("limit", String(limit))
    const res = await fetch(`/api/users?${params}`)
    const json = await res.json()
    if (json.success) {
      setData(json.data)
      setTotal(json.meta.total)
    }
    setLoading(false)
  }, [roleFilter, search, page, limit])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleToggleActive(user: UserData) {
    const res = await fetch(`/api/users/${user.id}/toggle-active`, { method: "PUT" })
    const json = await res.json()
    if (json.success) {
      toast.success(json.message)
      fetchData()
    } else {
      toast.error(json.message)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus user "${name}"?`)) return
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
    const json = await res.json()
    if (json.success) {
      toast.success(json.message)
      fetchData()
    } else {
      toast.error(json.message)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Semua Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">Semua Role</SelectItem>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Cari nama, username, atau email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-10"
          />
        </div>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => window.open("/api/users/template")}>
          <Download className="h-4 w-4 mr-2" aria-hidden="true" /> Template
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" aria-hidden="true" /> Import
        </Button>
        <Button onClick={() => router.push("/dashboard/admin/users/create")}>
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Tambah User
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>NIDN</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Prodi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada data user</TableCell></TableRow>
            ) : data.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.nidn || "-"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABELS[user.role] || user.role}</Badge>
                </TableCell>
                <TableCell>{user.prodi?.name || "-"}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "destructive"}>
                    {user.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => router.push(`/dashboard/admin/users/${user.id}/edit`)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={user.isActive ? "Nonaktifkan" : "Aktifkan"} onClick={() => handleToggleActive(user)}>
                      {user.isActive ? <PowerOff className="h-4 w-4" aria-hidden="true" /> : <Power className="h-4 w-4" aria-hidden="true" />}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Hapus ${user.name}`} onClick={() => handleDelete(user.id, user.name)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Total: {total} user</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Sebelumnya
            </Button>
            <span className="flex items-center text-sm px-2">{page} / {totalPages || 1}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={() => { setImportOpen(false); fetchData() }} />
    </div>
  )
}
