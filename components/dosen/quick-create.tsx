"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

interface QuickCreateProps {
  teachingLoads: Array<{
    id: string
    course: { id: string; name: string; totalMeeting: number }
    sessions: Array<{ id: string }>
  }>
}

export function QuickCreate({ teachingLoads }: QuickCreateProps) {
  const router = useRouter()
  const unfinished = teachingLoads.filter((tl) => tl.sessions.length < tl.course.totalMeeting)
  const [courseId, setCourseId] = useState(unfinished[0]?.course.id || "")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [startTime, setStartTime] = useState("")

  if (unfinished.length === 0) return null

  function handleCreate() {
    if (!courseId) return
    const params = new URLSearchParams()
    if (date) params.set("date", date)
    if (startTime) params.set("startTime", startTime)
    router.push(`/dashboard/dosen/courses/${courseId}/sessions/new?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border bg-card">
      <div className="space-y-1">
        <Label className="text-xs">Mata Kuliah</Label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {unfinished.map((tl) => (
            <option key={tl.course.id} value={tl.course.id}>
              {tl.course.name} ({tl.sessions.length}/{tl.course.totalMeeting})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tanggal</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Jam Mulai</Label>
        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-10" />
      </div>
      <Button onClick={handleCreate} className="h-10">
        <Plus className="h-4 w-4 mr-2" /> Buat Sesi
      </Button>
      <p className="w-full text-sm text-muted-foreground">
        atau{" "}
        <a href="/dashboard/dosen/courses" className="text-primary hover:underline">
          lihat semua MK Saya →
        </a>
      </p>
    </div>
  )
}
