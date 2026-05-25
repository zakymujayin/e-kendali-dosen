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
import { MapPin, Globe, Crosshair, Save, Wifi } from "lucide-react"
import { METHOD_LABELS, MAX_DARING } from "@/lib/constants"
import { isValidUrl } from "@/lib/validators"
import { HelpTip } from "@/components/ui/help-tip"

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

const STEPS = [
  { num: 1, label: "Kapan?" },
  { num: 2, label: "Apa & Bagaimana?" },
  { num: 3, label: "Siapa? + Selesai" },
] as const

export function SessionForm({
  teachingLoadId,
  courseId,
  courseName,
  courseTotalMeeting,
  existingSession,
}: SessionFormProps) {
  const router = useRouter()
  const isEdit = !!existingSession

  const [step, setStep] = useState(1)
  const [meetingNumber, setMeetingNumber] = useState(existingSession?.meetingNumber || 0)
  const [date, setDate] = useState(existingSession?.date?.split("T")[0] || new Date().toISOString().split("T")[0])
  const [startTime, setStartTime] = useState(existingSession?.startTime || "")
  const [endTime, setEndTime] = useState(existingSession?.endTime || "")
  const [topic, setTopic] = useState(existingSession?.topic || "")
  const [method, setMethod] = useState(existingSession?.method || "")
  const [sessionType] = useState(existingSession?.sessionType || "NORMAL")
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
  const [publishAfterSave, setPublishAfterSave] = useState(false)
  const [urlError, setUrlError] = useState("")

  const isDaring = DARING.includes(method as any)

  useEffect(() => {
    if (!isEdit && meetingNumber === 0) {
      setMeetingNumber(1)
    }
  }, [isEdit, meetingNumber])

  useEffect(() => {
    if (!isEdit) {
      fetch(`/api/sessions?teachingLoadId=${teachingLoadId}`)
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data?.length > 0) {
            const maxMeeting = Math.max(...json.data.map((s: any) => s.meetingNumber))
            setMeetingNumber(maxMeeting + 1)
          }
        })
        .catch(() => {})
    }
  }, [isEdit, teachingLoadId])

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
          <CardTitle className="text-xl">{isEdit ? "Edit Sesi" : "Tambah Sesi"} &mdash; {courseName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s.num ? "bg-primary text-primary-foreground" :
                  step > s.num ? "bg-green-500 text-white" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {step > s.num ? "✓" : s.num}
                </div>
                <span className={`text-sm ${step === s.num ? "font-medium" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}
          </div>

          {daringQuota && (
            <div className={`mb-6 flex items-center gap-2 p-3 rounded-lg border ${
              daringQuota.remaining === 0 ? "bg-red-50 border-red-200" :
              daringQuota.remaining <= 1 ? "bg-yellow-50 border-yellow-200" :
              "bg-blue-50 border-blue-200"
            }`}>
              <Wifi className={`h-4 w-4 ${
              daringQuota.remaining === 0 ? "text-red-500" :
              daringQuota.remaining <= 1 ? "text-yellow-500" :
              "text-blue-500"
              }`} aria-hidden="true" />
              <span className="text-base font-medium">
                Sisa kuota daring: {daringQuota.remaining}/{MAX_DARING}
              </span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Kapan perkuliahan dilaksanakan?</h3>
              <p className="text-sm text-muted-foreground">
                Sesi pertemuan ke-{meetingNumber} dari {courseTotalMeeting} pertemuan
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-base">Tanggal</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="text-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-base">Jam Mulai</Label>
                  <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="text-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-base">Jam Selesai</Label>
                  <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="text-base" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" onClick={() => {
                  if (!date || !startTime || !endTime) { toast.error("Lengkapi tanggal dan jam terlebih dahulu"); return }
                  setStep(2)
                }}>
                  Selanjutnya →
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Apa materi dan bagaimana metodenya?</h3>
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-base">Topik / Materi</Label>
                <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} required placeholder="Materi perkuliahan" className="text-base" />
              </div>
              <fieldset className="space-y-2">
                <legend className="flex items-center gap-1 text-base font-medium">
                  Metode mengajar
                  <HelpTip text="Pilih cara mengajar: tatap muka langsung di kelas (luring) atau online via Zoom/Google Meet (daring)" />
                </legend>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">Luring</p>
                  <div className="flex flex-wrap gap-2">
                    {LURING.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        aria-pressed={method === m}
                        className={`px-4 py-3 rounded-lg text-base border transition-colors ${
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
                  <p className="text-sm text-muted-foreground font-medium">Daring</p>
                  <div className="flex flex-wrap gap-2">
                    {DARING.map((m) => {
                      const disabled = m === method ? false : !!daringQuota && !daringQuota.isAvailable
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => !disabled && setMethod(m)}
                          disabled={disabled && m !== method}
                          aria-pressed={method === m}
                          className={`px-4 py-3 rounded-lg text-base border transition-colors ${
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
              </fieldset>

              {!isDaring && method && (
                <div className="space-y-3 p-4 rounded-lg border bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" aria-hidden="true" />
                      <span className="text-base font-medium">Validasi GPS</span>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleDetectGps} disabled={gpsStatus === "loading"}>
                      <Crosshair className="h-4 w-4 mr-2" aria-hidden="true" />
                      {gpsStatus === "loading" ? "Mendeteksi..." : "Deteksi Lokasi Saya"}
                    </Button>
                  </div>
                  {latitude && longitude && (
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Lat: {latitude}</div>
                      <div>Lng: {longitude}</div>
                      {gpsAccuracy && <div>Akurasi: {gpsAccuracy}m</div>}
                    </div>
                  )}
                  {gpsStatus === "valid" && gpsDistance !== null && (
                    <div className="flex items-center gap-2 text-base text-green-700 bg-green-50 p-2 rounded" aria-live="polite">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      <span>Lokasi valid &mdash; jarak {Math.round(gpsDistance)}m dari kampus ✓</span>
                    </div>
                  )}
                  {gpsStatus === "invalid" && gpsDistance !== null && (
                    <div className="flex items-center gap-2 text-base text-red-700 bg-red-50 p-2 rounded" aria-live="polite">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      <span>Lokasi di luar area kampus &mdash; jarak {Math.round(gpsDistance)}m &gt; 300m ✗</span>
                    </div>
                  )}
                  {gpsStatus === "error" && (
                    <p className="text-sm text-red-500" role="alert">Gagal validasi GPS. Coba lagi atau periksa izin lokasi.</p>
                  )}
                </div>
              )}

              {isDaring && method && (
                <div className="space-y-3 p-4 rounded-lg border bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-600" aria-hidden="true" />
                    <span className="text-base font-medium">URL Platform</span>
                  </div>
                  <Input
                    value={platformUrl}
                    onChange={(e) => setPlatformUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    placeholder="https://zoom.us/j/..."
                    className={`text-base ${urlError ? "border-red-500" : ""}`}
                  />
                  {urlError && <p className="text-sm text-red-500" role="alert">{urlError}</p>}
                  {platformUrl && !urlError && isValidUrl(platformUrl) && (
                    <p className="text-sm text-green-600">URL valid ✓</p>
                  )}
                  {daringQuota && (
                    <p className="text-sm text-muted-foreground">
                      Kuota daring terpakai: {daringQuota.used}/{MAX_DARING}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>← Kembali</Button>
                <Button type="button" onClick={() => {
                  if (!topic || !method) { toast.error("Lengkapi topik dan metode mengajar"); return }
                  if (!isDaring && (!latitude || !longitude)) { toast.error("Deteksi GPS wajib untuk sesi luring"); return }
                  if (isDaring && !platformUrl) { toast.error("URL platform wajib untuk sesi daring"); return }
                  setStep(3)
                }}>
                  Selanjutnya →
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Siapa saja yang hadir?</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="present" className="text-base">Mahasiswa Hadir</Label>
                  <Input id="present" type="number" min={0} value={studentPresent} onChange={(e) => setStudentPresent(e.target.value)} className="text-base" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="absent" className="text-base">Tidak Hadir</Label>
                  <Input id="absent" type="number" min={0} value={studentAbsent} onChange={(e) => setStudentAbsent(e.target.value)} className="text-base" />
                </div>
                <div className="space-y-1">
                  <Label className="text-base">Total</Label>
                  <div className="flex h-10 items-center px-3 rounded-md border bg-muted text-base">{totalStudents}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-base">Catatan (opsional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan..." rows={3} className="text-base" />
              </div>
              <label className="flex items-center gap-2 text-base cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishAfterSave}
                  onChange={(e) => setPublishAfterSave(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Langsung publish setelah simpan
              </label>
              <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>← Kembali</Button>
                <Button type="button" onClick={() => handleSubmit(publishAfterSave)} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                  {loading ? "Menyimpan..." : "Simpan ✓"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
