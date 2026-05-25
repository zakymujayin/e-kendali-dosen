"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: { id: string; name: string; nidn: string | null; prodiId: string | null }[]
  courses: { id: string; name: string; code: string; sks: number; prodiId: string; prodi: { name: string } }[]
  semesters: { id: string; name: string; year: string; term: string; isActive: boolean }[]
  onSuccess: () => void
}

export function AssignForm({ open, onOpenChange, users, courses, semesters, onSuccess }: Props) {
  const [userId, setUserId] = useState("")
  const [courseId, setCourseId] = useState("")
  const [semesterId, setSemesterId] = useState("")
  const [isTeam, setIsTeam] = useState(false)
  const [loading, setLoading] = useState(false)

  const selectedUser = users.find(u => u.id === userId)
  const filteredCourses = courses.filter(c => !selectedUser?.prodiId || c.prodiId === selectedUser.prodiId)

  const selectedCourse = courses.find(c => c.id === courseId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !courseId || !semesterId) {
      toast.error("Semua field wajib diisi")
      return
    }
    setLoading(true)

    const res = await fetch("/api/teaching-loads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, courseId, semesterId, isTeam }),
    })
    const data = await res.json()

    if (data.success) {
      toast.success(data.message)
      onSuccess()
    } else {
      toast.error(data.message || "Gagal membuat penugasan")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Penugasan</DialogTitle>
          <DialogDescription>Atur dosen pengampu mata kuliah</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">Dosen</Label>
            <Select value={userId} onValueChange={(v) => { setUserId(v); setCourseId("") }}>
              <SelectTrigger id="userId"><SelectValue placeholder="Pilih dosen" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.nidn || "-"})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="semesterId">Semester</Label>
            <Select value={semesterId} onValueChange={setSemesterId}>
              <SelectTrigger id="semesterId"><SelectValue placeholder="Pilih semester" /></SelectTrigger>
              <SelectContent>
                {semesters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.year} - {s.term} {s.isActive ? "(Aktif)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="courseId">Mata Kuliah</Label>
            <Select value={courseId} onValueChange={setCourseId} disabled={!userId}>
              <SelectTrigger id="courseId"><SelectValue placeholder="Pilih MK" /></SelectTrigger>
              <SelectContent>
                {filteredCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} - {c.name} ({c.sks} SKS)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedCourse ? `SKS: ${selectedCourse.sks}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTeam(!isTeam)}
              aria-pressed={isTeam}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                isTeam ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input"
              }`}
            >
              Tim Teaching
            </button>
            <span className="text-sm text-muted-foreground">Centang jika tim teaching</span>
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
