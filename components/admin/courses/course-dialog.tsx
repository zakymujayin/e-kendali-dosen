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

interface CourseData {
  id: string
  name: string
  code: string
  sks: number
  totalMeeting: number
  prodiId: string
  semesterId: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  course?: CourseData | null
  prodiList: { id: string; name: string }[]
  semesters: { id: string; name: string; year: string; term: string }[]
  onSuccess: () => void
}

export function CourseDialog({ open, onOpenChange, course, prodiList, semesters, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [sks, setSks] = useState("2")
  const [totalMeeting, setTotalMeeting] = useState("16")
  const [prodiId, setProdiId] = useState("")
  const [semesterId, setSemesterId] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(course?.name || "")
      setCode(course?.code || "")
      setSks(String(course?.sks ?? 2))
      setTotalMeeting(String(course?.totalMeeting ?? 16))
      setProdiId(course?.prodiId || "")
      setSemesterId(course?.semesterId || "")
    }
  }, [open, course])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const url = course ? `/api/courses/${course.id}` : "/api/courses"
    const method = course ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        code,
        sks: parseInt(sks),
        totalMeeting: parseInt(totalMeeting),
        prodiId,
        semesterId,
      }),
    })
    const data = await res.json()

    if (data.success) {
      toast.success(data.message)
      onSuccess()
    } else {
      toast.error(data.message || "Gagal menyimpan MK")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{course ? "Edit Mata Kuliah" : "Tambah Mata Kuliah"}</DialogTitle>
          <DialogDescription>
            {course ? "Ubah data mata kuliah" : "Isi form untuk menambah mata kuliah baru"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Kode MK</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nama MK</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sks">SKS</Label>
              <Input id="sks" type="number" min={1} max={24} value={sks} onChange={(e) => setSks(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalMeeting">Total Pertemuan</Label>
              <Input id="totalMeeting" type="number" min={1} value={totalMeeting} onChange={(e) => setTotalMeeting(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Prodi</Label>
            <Select value={prodiId} onValueChange={setProdiId} required>
              <SelectTrigger><SelectValue placeholder="Pilih prodi" /></SelectTrigger>
              <SelectContent>
                {prodiList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Semester</Label>
            <Select value={semesterId} onValueChange={setSemesterId} required>
              <SelectTrigger><SelectValue placeholder="Pilih semester" /></SelectTrigger>
              <SelectContent>
                {semesters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} {s.year} - {s.term}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
