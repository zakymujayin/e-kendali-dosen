"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  prodi?: { id: string; name: string; code: string; facultyId: string; kaprodiNama?: string | null; kaprodiNip?: string | null } | null
  faculties: { id: string; name: string; code: string }[]
  onSuccess: () => void
}

export function ProdiDialog({ open, onOpenChange, prodi, faculties, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [facultyId, setFacultyId] = useState("")
  const [kaprodiNama, setKaprodiNama] = useState("")
  const [kaprodiNip, setKaprodiNip] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(prodi?.name || "")
      setCode(prodi?.code || "")
      setFacultyId(prodi?.facultyId || "")
      setKaprodiNama(prodi?.kaprodiNama || "")
      setKaprodiNip(prodi?.kaprodiNip || "")
    }
  }, [open, prodi])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const url = prodi ? `/api/prodi/${prodi.id}` : "/api/prodi"
    const method = prodi ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, facultyId, kaprodiNama: kaprodiNama || null, kaprodiNip: kaprodiNip || null }),
    })
    const data = await res.json()

    if (data.success) {
      toast.success(data.message)
      onSuccess()
    } else {
      toast.error(data.message || "Gagal menyimpan prodi")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{prodi ? "Edit Prodi" : "Tambah Prodi"}</DialogTitle>
          <DialogDescription>
            {prodi ? "Ubah data prodi" : "Isi form untuk menambah prodi baru"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Prodi</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Kode Prodi</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facultyId">Fakultas</Label>
            <Select value={facultyId} onValueChange={setFacultyId} required>
              <SelectTrigger id="facultyId"><SelectValue placeholder="Pilih fakultas" /></SelectTrigger>
              <SelectContent>
                {faculties.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kaprodiNama">Nama Kaprodi</Label>
            <Input id="kaprodiNama" value={kaprodiNama} onChange={(e) => setKaprodiNama(e.target.value)} placeholder="Nama Ketua Program Studi" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kaprodiNip">NIP Kaprodi</Label>
            <Input id="kaprodiNip" value={kaprodiNip} onChange={(e) => setKaprodiNip(e.target.value)} placeholder="NIP Ketua Program Studi" />
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
