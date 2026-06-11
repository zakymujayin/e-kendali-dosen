"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Clock, MapPin, BookOpen, Calendar, Play, Loader2, GraduationCap, Rocket, Pencil } from "lucide-react"
import { toast } from "sonner"

interface Props {
  userName: string
  role: string
}

interface SlotData {
  id: string
  courseId: string
  courseCode: string
  courseName: string
  sks: number
  prodiName: string
  prodiCode: string
  roomName: string
  className: string
  startTime: string
  endTime: string
  isActive?: boolean
}

interface MatchData {
  active: SlotData | null
  todaySchedules: SlotData[]
  allCourses: Array<{ id: string; code: string; name: string; sks: number }>
  semester: { id: string; name: string; year: string } | null
  currentTime: string
  day: string
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 10) return "Selamat Pagi"
  if (h < 15) return "Selamat Siang"
  if (h < 18) return "Selamat Sore"
  return "Selamat Malam"
}

function formatDate(): string {
  return new Date().toISOString().split("T")[0]
}

export function ScanClient({ userName, role }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viaQr = searchParams.get("via") === "qr"
  const methodParam = viaQr ? "&method=TATAP_MUKA" : ""
  const [data, setData] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState("")
  const [quickStarting, setQuickStarting] = useState(false)

  useEffect(() => {
    fetch("/api/schedules/smart-match")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function quickStart(slotId: string, courseId: string) {
    setQuickStarting(true)
    try {
      const res = await fetch("/api/sessions/quick-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleSlotId: slotId }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Sesi dimulai")
        router.push(`/dashboard/dosen/courses/${courseId}/sessions/${json.data.sessionId}`)
      } else {
        toast.error(json.message || "Gagal memulai sesi")
      }
    } catch {
      toast.error("Gagal memulai sesi")
    } finally {
      setQuickStarting(false)
    }
  }

  function detailStart(slot: SlotData) {
    const today = formatDate()
    router.push(
      `/dashboard/dosen/courses/${slot.courseId}/sessions/new?scheduleSlotId=${slot.id}&date=${today}&startTime=${slot.startTime}&endTime=${slot.endTime}${methodParam}`
    )
  }

  function startManual(courseId?: string) {
    const id = courseId || selectedCourse
    if (id) {
      router.push(`/dashboard/dosen/courses/${id}/sessions/new${viaQr ? "?method=TATAP_MUKA" : ""}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (role !== "DOSEN") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Halaman Dosen</h1>
        <p className="text-muted-foreground mb-6">Halaman ini khusus untuk dosen. Silakan login dengan akun dosen.</p>
        <Button onClick={() => router.push("/dashboard")}>Dashboard</Button>
      </div>
    )
  }

  const hasAnyScheduleToday = (data?.todaySchedules?.length ?? 0) > 0
  const nextSchedule = data?.todaySchedules?.find((s) => !s.isActive)

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {getGreeting()}
        </h1>
        <p className="text-muted-foreground">{userName}</p>
        {data?.semester && (
          <p className="text-xs text-muted-foreground mt-1">
            {data.semester.name} {data.semester.year} · {data.day}
          </p>
        )}
      </div>

      {data?.active ? (
        <Card className="border-l-4 border-l-primary shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              {data.active.startTime} - {data.active.endTime}
            </div>
            <CardTitle className="text-lg">{data.active.courseName}</CardTitle>
            <CardDescription>
              {data.active.courseCode} · {data.active.sks} SKS · {data.active.prodiName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {data.active.roomName} · Kelas {data.active.className}
            </div>
            <Button
              className="w-full text-base h-12"
              onClick={() => quickStart(data.active!.id, data.active!.courseId)}
              disabled={quickStarting}
            >
              <Rocket className="h-5 w-5 mr-2" />
              {quickStarting ? "Memulai..." : "Mulai Cepat"}
            </Button>
            <Button
              variant="outline"
              className="w-full text-base h-11"
              onClick={() => detailStart(data.active!)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Isi Detail (absensi, dll)
            </Button>
          </CardContent>
        </Card>
      ) : hasAnyScheduleToday ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Tidak ada jadwal perkuliahan aktif saat ini</p>
            {nextSchedule && (
              <p className="text-sm text-muted-foreground mt-1">
                Berikutnya: {nextSchedule.startTime} - {nextSchedule.courseName}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <p>Tidak ada jadwal hari ini</p>
            <p className="text-xs mt-1">Hubungi admin untuk import jadwal semester Anda</p>
          </CardContent>
        </Card>
      )}

      {hasAnyScheduleToday && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Jadwal Hari Ini</h2>
          {data!.todaySchedules.map((slot) => (
            <Card
              key={slot.id}
              className={`cursor-pointer hover:bg-accent transition-colors ${slot.isActive ? "ring-2 ring-primary" : ""}`}
              onClick={() => detailStart(slot)}
            >
              <CardContent className="py-3 flex items-center gap-3">
                <div className="text-sm font-medium text-muted-foreground w-16 shrink-0">
                  {slot.startTime}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{slot.courseName}</p>
                  <p className="text-xs text-muted-foreground">
                    {slot.roomName} · {slot.className}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Play className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data?.allCourses && data.allCourses.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h2 className="text-sm font-medium text-muted-foreground">Atau pilih MK lain</h2>
          <div className="flex gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih mata kuliah..." />
              </SelectTrigger>
              <SelectContent>
                {data.allCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={!selectedCourse}
              onClick={() => startManual()}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard/dosen")}>
          Dashboard
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard/dosen/courses")}>
          Semua Sesi
        </Button>
      </div>
    </div>
  )
}
