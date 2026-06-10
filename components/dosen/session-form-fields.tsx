"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MapPin, Crosshair, Globe, Wifi, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { MAX_DARING, isDaringMethod } from "@/lib/constants"
import { isValidUrl } from "@/lib/validators"

export interface SessionFieldValues {
  date: string
  startTime: string
  endTime: string
  topic: string
  method: string
  studentPresent: number
  studentAbsent: number
  platformUrl: string
  notes: string
  latitude: string
  longitude: string
  gpsAccuracy: string
  gpsDistance: number | null
  gpsValid: boolean | null
}

export const defaultSessionFieldValues: SessionFieldValues = {
  date: new Date().toISOString().split("T")[0],
  startTime: "",
  endTime: "",
  topic: "",
  method: "",
  studentPresent: 0,
  studentAbsent: 0,
  platformUrl: "",
  notes: "",
  latitude: "",
  longitude: "",
  gpsAccuracy: "",
  gpsDistance: null,
  gpsValid: null,
}

interface SessionFormFieldsProps {
  values: SessionFieldValues
  onChange: (patch: Partial<SessionFieldValues>) => void
  teachingLoadId: string
}

export function SessionFormFields({
  values,
  onChange,
  teachingLoadId,
}: SessionFormFieldsProps) {
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "valid" | "invalid" | "error">("idle")
  const [daringQuota, setDaringQuota] = useState<{ used: number; remaining: number; isAvailable: boolean } | null>(null)
  const [urlError, setUrlError] = useState("")

  const isDaring = isDaringMethod(values.method)
  const totalStudents = values.studentPresent + values.studentAbsent

  useEffect(() => {
    if (values.gpsValid === true) setGpsStatus("valid")
    else if (values.gpsValid === false && values.latitude) setGpsStatus("invalid")
    else setGpsStatus("idle")
  }, [values.gpsValid, values.latitude])

  useEffect(() => {
    if (!isDaringMethod(values.method)) { setDaringQuota(null); return }
    fetch(`/api/teaching-loads/${teachingLoadId}/daring-quota`)
      .then(r => r.json())
      .then(json => { if (json.success) setDaringQuota(json.data) })
      .catch(() => {})
  }, [values.method, teachingLoadId])

  const handleUrlBlur = useCallback(() => {
    if (!values.platformUrl) { setUrlError(""); return }
    if (!isValidUrl(values.platformUrl)) setUrlError("URL tidak valid. Harus https://...")
    else setUrlError("")
  }, [values.platformUrl])

  function handleDetectGps() {
    if (!navigator.geolocation) { toast.error("GPS tidak didukung browser ini"); return }
    setGpsStatus("loading")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        const acc = pos.coords.accuracy?.toFixed(1) || ""
        try {
          const res = await fetch("/api/campus/validate-gps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: parseFloat(lat), longitude: parseFloat(lng) }),
          })
          const json = await res.json()
          if (json.success && json.data) {
            const { distanceMeters, isValid } = json.data
            onChange({ latitude: lat, longitude: lng, gpsAccuracy: acc, gpsDistance: Math.round(distanceMeters), gpsValid: isValid })
            setGpsStatus(isValid ? "valid" : "invalid")
          } else {
            onChange({ latitude: lat, longitude: lng, gpsAccuracy: acc, gpsDistance: null, gpsValid: false })
            setGpsStatus("error")
          }
        } catch {
          setGpsStatus("error")
          toast.error("Gagal validasi GPS")
        }
      },
      (err) => {
        setGpsStatus("error")
        toast.error(err.code === 1 ? "Akses GPS ditolak. Izinkan di browser." : "Gagal mendapatkan lokasi")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-5 p-6 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sf-date">Tanggal</Label>
          <Input
            id="sf-date"
            type="date"
            value={values.date}
            onChange={e => onChange({ date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-start">Jam Mulai</Label>
          <Input
            id="sf-start"
            type="time"
            value={values.startTime}
            onChange={e => onChange({ startTime: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-end">Jam Selesai</Label>
          <Input
            id="sf-end"
            type="time"
            value={values.endTime}
            onChange={e => onChange({ endTime: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sf-topic">Materi / Topik</Label>
        <Textarea
          id="sf-topic"
          rows={2}
          placeholder="Isi materi perkuliahan..."
          value={values.topic}
          onChange={e => onChange({ topic: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Metode mengajar</Label>
        {daringQuota && (
          <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
            daringQuota.remaining === 0 ? "bg-red-50 border-red-200 text-red-700" :
            daringQuota.remaining <= 1 ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
            "bg-blue-50 border-blue-200 text-blue-700"
          }`}>
            <Wifi className="h-4 w-4 shrink-0" />
            <span>Sisa kuota daring: {daringQuota.remaining}/{MAX_DARING}</span>
          </div>
        )}
        <Select value={values.method} onValueChange={v => onChange({ method: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih metode mengajar..." />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectGroup>
              <SelectLabel>Luring</SelectLabel>
              <SelectItem value="TATAP_MUKA">Tatap Muka</SelectItem>
              <SelectItem value="PRAKTIKUM">Praktikum</SelectItem>
              <SelectItem value="SEMINAR">Seminar</SelectItem>
              <SelectItem value="FIELD_STUDY">Studi Lapangan</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Daring</SelectLabel>
              <SelectItem value="ZOOM" disabled={!!daringQuota && !daringQuota.isAvailable && values.method !== "ZOOM"}>Zoom Meeting</SelectItem>
              <SelectItem value="GOOGLE_MEET" disabled={!!daringQuota && !daringQuota.isAvailable && values.method !== "GOOGLE_MEET"}>Google Meet</SelectItem>
              <SelectItem value="MS_TEAMS" disabled={!!daringQuota && !daringQuota.isAvailable && values.method !== "MS_TEAMS"}>Microsoft Teams</SelectItem>
              <SelectItem value="LMS" disabled={!!daringQuota && !daringQuota.isAvailable && values.method !== "LMS"}>LMS / Moodle</SelectItem>
              <SelectItem value="PLATFORM_LAIN" disabled={!!daringQuota && !daringQuota.isAvailable && values.method !== "PLATFORM_LAIN"}>Platform Lain</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {!isDaring && values.method && (
        <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-green-600" />
              Validasi GPS
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDetectGps}
              disabled={gpsStatus === "loading"}
            >
              {gpsStatus === "loading"
                ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Mendeteksi...</>
                : <><Crosshair className="h-3.5 w-3.5 mr-2" />Deteksi Lokasi</>
              }
            </Button>
          </div>
          {values.latitude && values.longitude && (
            <p className="text-xs text-muted-foreground">
              {values.latitude}, {values.longitude}{values.gpsAccuracy ? ` · akurasi ${values.gpsAccuracy}m` : ""}
            </p>
          )}
          {gpsStatus === "valid" && values.gpsDistance !== null && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Lokasi valid — {values.gpsDistance}m dari kampus ✓</AlertDescription>
            </Alert>
          )}
          {gpsStatus === "invalid" && values.gpsDistance !== null && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Di luar area kampus — {values.gpsDistance}m &gt; 300m ✗</AlertDescription>
            </Alert>
          )}
          {gpsStatus === "error" && (
            <p className="text-sm text-destructive">Gagal validasi GPS. Periksa izin lokasi dan coba lagi.</p>
          )}
        </div>
      )}

      {isDaring && values.method && (
        <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4 text-purple-600" />
            URL Platform
          </span>
          <Input
            type="url"
            value={values.platformUrl}
            onChange={e => onChange({ platformUrl: e.target.value })}
            onBlur={handleUrlBlur}
            placeholder="https://zoom.us/j/... atau https://meet.google.com/..."
            className={urlError ? "border-destructive" : ""}
          />
          {urlError && <p className="text-sm text-destructive">{urlError}</p>}
          {values.platformUrl && !urlError && isValidUrl(values.platformUrl) && (
            <p className="text-sm text-green-600">URL valid ✓</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sf-present">Hadir</Label>
          <Input
            id="sf-present"
            type="number"
            min={0}
            value={values.studentPresent || ""}
            onChange={e => onChange({ studentPresent: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-absent">Tidak Hadir</Label>
          <Input
            id="sf-absent"
            type="number"
            min={0}
            value={values.studentAbsent || ""}
            onChange={e => onChange({ studentAbsent: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Total</Label>
          <div className="flex h-10 items-center px-3 rounded-md border bg-muted text-sm font-medium">
            {totalStudents}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sf-notes">Catatan (opsional)</Label>
        <Textarea
          id="sf-notes"
          rows={2}
          placeholder="Catatan tambahan..."
          value={values.notes}
          onChange={e => onChange({ notes: e.target.value })}
        />
      </div>
    </div>
  )
}
