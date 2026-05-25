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

interface SemesterData {
  id: string
  name: string
  year: string
  term: string
  startDate: string
  endDate: string
  isActive: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  semester?: SemesterData | null
  onSuccess: () => void
}

function toDateInputValue(dateStr: string) {
  return new Date(dateStr).toISOString().split("T")[0]
}

export function SemesterDialog({ open, onOpenChange, semester, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [year, setYear] = useState("")
  const [term, setTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(semester?.name || "")
      setYear(semester?.year || "")
      setTerm(semester?.term || "")
      setStartDate(semester ? toDateInputValue(semester.startDate) : "")
      setEndDate(semester ? toDateInputValue(semester.endDate) : "")
    }
  }, [open, semester])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const url = semester ? `/api/semesters/${semester.id}` : "/api/semesters"
    const method = semester ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        year,
        term,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      }),
    })
    const data = await res.json()

    if (data.success) {
      toast.success(data.message)
      onSuccess()
    } else {
      toast.error(data.message || "Gagal menyimpan semester")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{semester ? "Edit Semester" : "Tambah Semester"}</DialogTitle>
          <DialogDescription>
            {semester ? "Ubah data semester" : "Isi form untuk menambah semester baru"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Tahun</Label>
            <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="term">Term</Label>
            <Select value={term} onValueChange={setTerm} required>
              <SelectTrigger id="term"><SelectValue placeholder="Pilih term" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ganjil">Ganjil</SelectItem>
                <SelectItem value="Genap">Genap</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Tanggal Mulai</Label>
            <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Tanggal Selesai</Label>
            <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
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
