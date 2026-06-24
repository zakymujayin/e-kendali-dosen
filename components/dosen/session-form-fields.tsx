"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Globe, Wifi, AlertCircle } from "lucide-react"
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
  photoFile?: File | null
  onPhotoChange?: (file: File | null) => void
}

export function SessionFormFields({
  values,
  onChange,
  teachingLoadId,
  photoFile,
  onPhotoChange,
}: SessionFormFieldsProps) {
  const [daringQuota, setDaringQuota] = useState<{ used: number; remaining: number; isAvailable: boolean } | null>(null)
  const [urlError, setUrlError] = useState("")

  const isDaring = isDaringMethod(values.method)
  const totalStudents = values.studentPresent + values.studentAbsent

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
            daringQuota.used >= MAX_DARING
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : daringQuota.remaining <= 1
              ? "bg-yellow-50 border-yellow-200 text-yellow-700"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}>
            {daringQuota.used >= MAX_DARING
              ? <AlertCircle className="h-4 w-4 shrink-0" />
              : <Wifi className="h-4 w-4 shrink-0" />}
            <span>
              {daringQuota.used >= MAX_DARING
                ? `Daring sudah ${daringQuota.used}× — melebihi kuota ${MAX_DARING}. Tetap bisa disimpan.`
                : `Sisa kuota daring: ${daringQuota.remaining}/${MAX_DARING}`}
            </span>
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
              <SelectItem value="ZOOM">Zoom Meeting</SelectItem>
              <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
              <SelectItem value="MS_TEAMS">Microsoft Teams</SelectItem>
              <SelectItem value="LMS">LMS / Moodle</SelectItem>
              <SelectItem value="PLATFORM_LAIN">Platform Lain</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sf-present">Hadir</Label>
          <Input
            id="sf-present"
            type="number"
            min={0}
            value={values.studentPresent ?? ""}
            onChange={e => onChange({ studentPresent: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-absent">Tidak Hadir</Label>
          <Input
            id="sf-absent"
            type="number"
            min={0}
            value={values.studentAbsent ?? ""}
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

      {onPhotoChange && (
        <div className="space-y-2">
          <Label htmlFor="sf-photo">Foto (opsional)</Label>
          <Input
            id="sf-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => onPhotoChange(e.target.files?.[0] ?? null)}
          />
          {photoFile && (
            <p className="text-xs text-muted-foreground">Terlampir: {photoFile.name}</p>
          )}
        </div>
      )}

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
