"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Globe, Save, Camera } from "lucide-react"
import { METHOD_LABELS } from "@/lib/constants"
import { isValidUrl } from "@/lib/validators"

const LURING = ["TATAP_MUKA", "PRAKTIKUM", "SEMINAR", "FIELD_STUDY"]
const DARING = ["ZOOM", "GOOGLE_MEET", "MS_TEAMS", "LMS", "PLATFORM_LAIN"]

interface QuickStartFormProps {
  teachingLoadId: string
  courseId: string
  courseName: string
  defaultDate: string
  defaultStartTime: string
  defaultEndTime: string
}

export function QuickStartForm({
  teachingLoadId,
  courseId,
  courseName,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
}: QuickStartFormProps) {
  const router = useRouter()

  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [endTime, setEndTime] = useState(defaultEndTime)
  const [topic, setTopic] = useState(courseName)
  const [method, setMethod] = useState<string>("TATAP_MUKA")
  const [notes, setNotes] = useState("")
  const [platformUrl, setPlatformUrl] = useState("")
  const [publish, setPublish] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)

  const isDaring = DARING.includes(method)

  async function handleSubmit() {
    if (!date || !startTime || !endTime || !topic || !method) {
      toast.error("Lengkapi semua field wajib")
      return
    }
    if (isDaring && platformUrl && !isValidUrl(platformUrl)) {
      toast.error("URL platform tidak valid")
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        teachingLoadId,
        meetingNumber: 1,
        date: new Date(date),
        startTime,
        endTime,
        topic,
        method,
        notes: notes || null,
        isDaring,
      }

      if (isDaring && platformUrl) {
        body.platformUrl = platformUrl
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!json.success) {
        toast.error(json.message || "Gagal menyimpan")
        setSubmitting(false)
        return
      }

      const sessionId = json.data.id

      if (photoFile) {
        const fd = new FormData()
        fd.append("file", photoFile)
        fd.append("sessionId", sessionId)
        try { await fetch("/api/documents", { method: "POST", body: fd }) }
        catch { toast.error("Foto gagal diunggah, sesi tetap tersimpan") }
      }

      if (publish) {
        await fetch(`/api/sessions/${sessionId}/publish`, { method: "POST" })
      }

      toast.success("Sesi berhasil dibuat")
      router.push(`/dashboard/dosen/courses/${courseId}/sessions/${sessionId}`)
    } catch {
      toast.error("Gagal menyimpan sesi")
    } finally {
      setSubmitting(false)
    }
  }

  const luringGreen = method !== "" && !isDaring ? "ring-2 ring-green-500 bg-green-50" : ""
  const daringPurple = method !== "" && isDaring ? "ring-2 ring-purple-500 bg-purple-50" : ""

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Sesi Baru</h1>
        <p className="text-sm text-muted-foreground">{courseName}</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jam Mulai</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Jam Selesai</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Topik</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topik perkuliahan" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`grid grid-cols-2 gap-2 rounded-lg p-3 ${luringGreen}`}>
            {LURING.map((m) => (
              <Button
                key={m}
                type="button"
                variant={method === m ? "default" : "outline"}
                className={`h-10 ${method === m ? "bg-green-600 hover:bg-green-700" : ""}`}
                onClick={() => setMethod(m)}
              >
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-xs">{METHOD_LABELS[m as keyof typeof METHOD_LABELS] || m}</span>
              </Button>
            ))}
          </div>

          <div className={`grid grid-cols-2 gap-2 rounded-lg p-3 ${daringPurple}`}>
            {DARING.map((m) => (
              <Button
                key={m}
                type="button"
                variant={method === m ? "default" : "outline"}
                className={`h-10 ${method === m ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                onClick={() => setMethod(m)}
              >
                <Globe className="h-4 w-4 mr-1" />
                <span className="text-xs">{METHOD_LABELS[m as keyof typeof METHOD_LABELS] || m}</span>
              </Button>
            ))}
          </div>

          {isDaring && (
            <div className="space-y-2 pt-2">
              <Label>URL Platform</Label>
              <Input
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {!photoFile ? (
            <label
              htmlFor="qs-photo"
              className="flex items-center gap-2 justify-center w-full py-4 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/40 cursor-pointer transition-colors text-sm text-muted-foreground hover:text-primary"
            >
              <Camera className="h-5 w-5" />
              Ambil foto bukti kehadiran (opsional)
              <input
                id="qs-photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <div className="flex items-center gap-2 text-sm bg-green-50 text-green-800 rounded-lg p-3 border border-green-200">
              <Camera className="h-4 w-4 shrink-0" />
              <span className="truncate">{photoFile.name}</span>
              <button
                className="ml-auto text-xs text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => setPhotoFile(null)}
              >
                Hapus
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan perkuliahan (opsional)"
              rows={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="rounded border-input"
            />
            Publish setelah simpan
          </label>
        </CardContent>
      </Card>

      <Button className="w-full h-12 text-base" onClick={handleSubmit} disabled={submitting}>
        <Save className="h-5 w-5 mr-2" />
        {submitting ? "Menyimpan..." : "Simpan Sesi"}
      </Button>
    </div>
  )
}
