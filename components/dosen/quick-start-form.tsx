"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Globe, Crosshair, Save } from "lucide-react"
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

  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [gpsAcc, setGpsAcc] = useState<number | null>(null)
  const [campusLabel, setCampusLabel] = useState<string | null>(null)
  const [gpsDistance, setGpsDistance] = useState<number | null>(null)
  const [gpsValid, setGpsValid] = useState<boolean | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  const isDaring = DARING.includes(method)

  useEffect(() => {
    if (LURING.includes(method)) {
      detectGps()
    }
  }, [method])

  function detectGps() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setLat(latitude)
        setLng(longitude)
        setGpsAcc(accuracy)
        try {
          const res = await fetch("/api/campus/validate-gps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
          })
          if (res.ok) {
            const j = await res.json()
            if (j.data) {
              setCampusLabel(j.data.label ?? null)
              setGpsDistance(j.data.distance ?? null)
              setGpsValid(j.data.distance !== null && j.data.distance <= (j.data.radiusMeters ?? 300))
            }
          }
        } catch {
          // validation failure non-fatal
        }
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

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

      if (lat != null && lng != null) {
        body.latitude = lat
        body.longitude = lng
        body.gpsAccuracy = gpsAcc
        body.distanceMeters = gpsDistance
        body.isGpsValid = gpsValid
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
          <div className="grid grid-cols-2 gap-4">
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

          {!isDaring && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
              <Crosshair className="h-4 w-4" />
              {gpsLoading ? (
                "Mendeteksi lokasi..."
              ) : gpsValid ? (
                <span className="text-green-600">
                  Terdeteksi: {campusLabel ?? "Kampus"} ({gpsDistance}m)
                </span>
              ) : lat ? (
                <span className="text-amber-600">Di luar area kampus ({gpsDistance}m)</span>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={detectGps}>
                  Deteksi lokasi
                </Button>
              )}
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
