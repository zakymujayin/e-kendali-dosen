"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { MapPin, Globe, Crosshair, Save, Send, Wifi } from "lucide-react"
import { METHOD_LABELS, MAX_DARING } from "@/lib/constants"
import { isValidUrl } from "@/lib/validators"

const LURING = ["TATAP_MUKA", "PRAKTIKUM", "SEMINAR", "FIELD_STUDY"]
const DARING = ["ZOOM", "GOOGLE_MEET", "MS_TEAMS", "LMS", "PLATFORM_LAIN"]

interface SessionFormProps {
  teachingLoadId: string
  courseId: string
  courseName: string
  courseTotalMeeting: number
  existingSession?: {
    id: string
    meetingNumber: number
    date: string
    startTime: string
    endTime: string
    topic: string
    method: string
    sessionType: string
    studentPresent: number
    studentAbsent: number
    latitude?: number | null
    longitude?: number | null
    gpsAccuracy?: number | null
    platformUrl?: string | null
    isDaring: boolean
    notes?: string | null
  } | null
}

export function SessionForm({
  teachingLoadId,
  courseId,
  courseName,
  courseTotalMeeting,
  existingSession,
}: SessionFormProps) {
  const router = useRouter()
  const isEdit = !!existingSession

  const [meetingNumber, setMeetingNumber] = useState(existingSession?.meetingNumber || 0)
  const [date, setDate] = useState(existingSession?.date?.split("T")[0] || "")
  const [startTime, setStartTime] = useState(existingSession?.startTime || "")
  const [endTime, setEndTime] = useState(existingSession?.endTime || "")
  const [topic, setTopic] = useState(existingSession?.topic || "")
  const [method, setMethod] = useState(existingSession?.method || "")
  const [sessionType, setSessionType] = useState(existingSession?.sessionType || "NORMAL")
  const [studentPresent, setStudentPresent] = useState(existingSession?.studentPresent?.toString() || "0")
  const [studentAbsent, setStudentAbsent] = useState(existingSession?.studentAbsent?.toString() || "0")
  const [platformUrl, setPlatformUrl] = useState(existingSession?.platformUrl || "")
  const [notes, setNotes] = useState(existingSession?.notes || "")

  const [latitude, setLatitude] = useState(existingSession?.latitude?.toString() || "")
  const [longitude, setLongitude] = useState(existingSession?.longitude?.toString() || "")
  const [gpsAccuracy, setGpsAccuracy] = useState(existingSession?.gpsAccuracy?.toString() || "")
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "valid" | "invalid" | "error">("idle")
  const [gpsDistance, setGpsDistance] = useState<number | null>(null)

  const [daringQuota, setDaringQuota] = useState<{
    used: number
    remaining: number
    isAvailable: boolean
  } | null>(null)
  const [quotaLoading, setQuotaLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [urlError, setUrlError] = useState("")

  const isDaring = DARING.includes(method as any)

  useEffect(() => {
    if (!isEdit && meetingNumber === 0) {
      setMeetingNumber(1)
    }
  }, [isEdit, meetingNumber])

  useEffect(() => {
    if (DARING.includes(method as any)) {
      setQuotaLoading(true)
      fetch(`/api/teaching-loads/${teachingLoadId}/daring-quota`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setDaringQuota(json.data)
        })
        .catch(() => {})
        .finally(() => setQuotaLoading(false))
    }
  }, [method, teachingLoadId])

  const handleUrlBlur = useCallback(() => {
    if (!platformUrl) {
      setUrlError("")
      return
    }
    if (!isValidUrl(platformUrl)) {
      setUrlError("URL tidak valid. Harus https://...")
    } else {
      setUrlError("")
    }
  }, [platformUrl])

  function handleDetectGps() {
    if (!navigator.geolocation) {
      toast.error("GPS tidak didukung browser ini")
      return
    }
    setGpsStatus("loading")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        setLatitude(lat)
        setLongitude(lng)
        setGpsAccuracy(pos.coords.accuracy?.toFixed(1) || "")

        try {
          const res = await fetch("/api/campus/validate-gps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
            }),
          })
          const json = await res.json()
          if (json.success && json.data) {
            setGpsDistance(json.data.distanceMeters)
            setGpsStatus(json.data.isValid ? "valid" : "invalid")
          } else {
            setGpsStatus("error")
          }
        } catch {
          setGpsStatus("error")
        }
      },
      (err) => {
        setGpsStatus("error")
        if (err.code === 1) {
          toast.error("Akses GPS ditolak. Izinkan akses lokasi di browser")
        } else {
          toast.error("Gagal mendapatkan lokasi")
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const totalStudents = (parseInt(studentPresent) || 0) + (parseInt(studentAbsent) || 0)

  async function handleSubmit(publishAfter: boolean) {
    if (!date || !startTime || !endTime || !topic || !method || !meetingNumber) {
      toast.error("Lengkapi semua field wajib")
      return
    }

    if (!isDaring && (!latitude || !longitude)) {
      toast.error("Deteksi GPS wajib untuk sesi luring")
      return
    }

    if (isDaring) {
      if (!platformUrl) {
        toast.error("URL platform wajib diisi untuk sesi daring")
        return
      }
      if (!isValidUrl(platformUrl)) {
        toast.error("URL platform tidak valid")
        return
      }
    }

    setLoading(true)

    const body: Record<string, unknown> = {
      teachingLoadId,
      meetingNumber,
      date,
      startTime,
      endTime,
      topic,
      method,
      sessionType,
      studentPresent: parseInt(studentPresent) || 0,
      studentAbsent: parseInt(studentAbsent) || 0,
      notes: notes || null,
    }

    if (!isDaring) {
      body.latitude = parseFloat(latitude) || null
      body.longitude = parseFloat(longitude) || null
      body.gpsAccuracy = parseFloat(gpsAccuracy) || null
    }

    if (isDaring) {
      body.platformUrl = platformUrl
    }

    const url = isEdit ? `/api/sessions/${existingSession!.id}` : "/api/sessions"
    const methodHttp = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method: methodHttp,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (!data.success) {
      toast.error(data.message || "Gagal menyimpan sesi")
      setLoading(false)
      return
    }

    if (publishAfter && data.data?.id) {
      const pubRes = await fetch(`/api/sessions/${data.data.id}/publish`, { method: "PUT" })
      const pubData = await pubRes.json()
      if (pubData.success) {
        toast.success("Sesi berhasil dipublish")
      } else {
        toast.error(pubData.message || "Gagal publish")
      }
    } else {
      toast.success(data.message || "Sesi berhasil disimpan")
    }

    setLoading(false)
    router.push(`/dashboard/dosen/courses/${courseId}`)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Sesi" : "Tambah Sesi"} &mdash; {courseName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {daringQuota && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              daringQuota.remaining === 0 ? "bg-red-50 border-red-200" :
              daringQuota.remaining <= 1 ? "bg-yellow-50 border-yellow-200" :
              "bg-blue-50 border-blue-200"
            }`}>
              <Wifi className={`h-4 w-4 ${
                daringQuota.remaining === 0 ? "text-red-500" :
                daringQuota.remaining <= 1 ? "text-yellow-500" :
                "text-blue-500"
              }`} />
              <span className="text-sm font-medium">
                Sisa kuota daring: {daringQuota.remaining}/{MAX_DARING}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meetingNumber">Pertemuan ke-</Label>
              <Input
                id="meetingNumber"
                type="number"
                min={1}
                max={courseTotalMeeting}
                value={meetingNumber}
                onChange={(e) => setMeetingNumber(parseInt(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionType">Tipe Sesi</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="PENGGANTI">Pengganti</SelectItem>
                  <SelectItem value="TAMBAHAN">Tambahan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Tanggal</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Jam Mulai</Label>
              <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Jam Selesai</Label>
              <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topik</Label>
            <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} required placeholder="Materi perkuliahan" />
          </div>

          <div className="space-y-2">
            <Label>Metode</Label>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Luring</p>
              <div className="flex flex-wrap gap-2">
                {LURING.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      method === m
                        ? "bg-green-100 border-green-500 text-green-800"
                        : "bg-background border-input hover:bg-muted"
                    }`}
                  >
                    {METHOD_LABELS[m] || m}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 mt-2">
              <p className="text-xs text-muted-foreground font-medium">Daring</p>
              <div className="flex flex-wrap gap-2">
                {DARING.map((m) => {
                  const disabled = m === method ? false : !!daringQuota && !daringQuota.isAvailable
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => !disabled && setMethod(m)}
                      disabled={disabled && m !== method}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                        method === m
                          ? "bg-purple-100 border-purple-500 text-purple-800"
                          : disabled
                          ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-background border-input hover:bg-muted"
                      }`}
                    >
                      {METHOD_LABELS[m] || m}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {!isDaring && method && (
            <div className="space-y-3 p-4 rounded-lg border bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Validasi GPS</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleDetectGps} disabled={gpsStatus === "loading"}>
                  <Crosshair className="h-4 w-4 mr-2" />
                  {gpsStatus === "loading" ? "Mendeteksi..." : "Deteksi Lokasi Saya"}
                </Button>
              </div>

              {latitude && longitude && (
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Lat: {latitude}</div>
                  <div>Lng: {longitude}</div>
                  {gpsAccuracy && <div>Akurasi: {gpsAccuracy}m</div>}
                </div>
              )}

              {gpsStatus === "valid" && gpsDistance !== null && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                  <MapPin className="h-4 w-4" />
                  <span>Lokasi valid &mdash; jarak {Math.round(gpsDistance)}m dari kampus ✓</span>
                </div>
              )}
              {gpsStatus === "invalid" && gpsDistance !== null && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                  <MapPin className="h-4 w-4" />
                  <span>Lokasi di luar area kampus &mdash; jarak {Math.round(gpsDistance)}m &gt; 300m ✗</span>
                </div>
              )}
              {gpsStatus === "error" && (
                <p className="text-xs text-red-500">Gagal validasi GPS. Coba lagi atau periksa izin lokasi.</p>
              )}
            </div>
          )}

          {isDaring && method && (
            <div className="space-y-3 p-4 rounded-lg border bg-gray-50">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">URL Platform</span>
              </div>
              <Input
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://zoom.us/j/..."
                className={urlError ? "border-red-500" : ""}
              />
              {urlError && <p className="text-xs text-red-500">{urlError}</p>}
              {platformUrl && !urlError && isValidUrl(platformUrl) && (
                <p className="text-xs text-green-600">URL valid ✓</p>
              )}
              {daringQuota && (
                <p className="text-xs text-muted-foreground">
                  Kuota daring terpakai: {daringQuota.used}/{MAX_DARING}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Kehadiran Mahasiswa</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="present" className="text-xs">Hadir</Label>
                <Input
                  id="present"
                  type="number"
                  min={0}
                  value={studentPresent}
                  onChange={(e) => setStudentPresent(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="absent" className="text-xs">Tidak Hadir</Label>
                <Input
                  id="absent"
                  type="number"
                  min={0}
                  value={studentAbsent}
                  onChange={(e) => setStudentAbsent(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total</Label>
                <div className="flex h-10 items-center px-3 rounded-md border bg-muted text-sm">
                  {totalStudents}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (opsional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Batal
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSubmit(false)}
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Menyimpan..." : "Simpan Draft"}
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Menyimpan..." : "Simpan & Publish"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
