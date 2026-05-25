"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  faculty?: { id: string; name: string; code: string } | null
  onSuccess: () => void
}

export function FacultyDialog({ open, onOpenChange, faculty, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(faculty?.name || "")
      setCode(faculty?.code || "")
    }
  }, [open, faculty])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const url = faculty ? `/api/faculties/${faculty.id}` : "/api/faculties"
    const method = faculty ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code }),
    })
    const data = await res.json()

    if (data.success) {
      toast.success(data.message)
      onSuccess()
    } else {
      toast.error(data.message || "Gagal menyimpan fakultas")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{faculty ? "Edit Fakultas" : "Tambah Fakultas"}</DialogTitle>
          <DialogDescription>
            {faculty ? "Ubah nama atau kode fakultas" : "Isi form untuk menambah fakultas baru"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Fakultas</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fakultas Teknologi Informasi" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Kode Fakultas</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. FTI" required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
