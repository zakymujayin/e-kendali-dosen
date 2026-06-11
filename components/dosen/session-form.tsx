"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { SessionFormFields, SessionFieldValues, defaultSessionFieldValues } from "@/components/dosen/session-form-fields"
import { isDaringMethod } from "@/lib/constants"
import { isValidUrl } from "@/lib/validators"
import { Loader2, Send, Save } from "lucide-react"

interface SessionFormProps {
  teachingLoadId: string
  courseId: string
  courseName: string
  courseTotalMeeting: number
  defaultDate?: string
  defaultStartTime?: string
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
  defaultDate,
  defaultStartTime,
  existingSession,
}: SessionFormProps) {
  const router = useRouter()
  const isEdit = !!existingSession

  const [meetingNumber, setMeetingNumber] = useState(existingSession?.meetingNumber || 1)
  const [sessionType] = useState(existingSession?.sessionType || "NORMAL")
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const [values, setValues] = useState<SessionFieldValues>({
    ...defaultSessionFieldValues,
    date: existingSession?.date?.split("T")[0] || defaultDate || defaultSessionFieldValues.date,
    startTime: existingSession?.startTime || defaultStartTime || "",
    endTime: existingSession?.endTime || "",
    topic: existingSession?.topic || "",
    method: existingSession?.method || "",
    studentPresent: existingSession?.studentPresent ?? 0,
    studentAbsent: existingSession?.studentAbsent ?? 0,
    platformUrl: existingSession?.platformUrl || "",
    notes: existingSession?.notes || "",
    latitude: existingSession?.latitude?.toString() || "",
    longitude: existingSession?.longitude?.toString() || "",
    gpsAccuracy: existingSession?.gpsAccuracy?.toString() || "",
    gpsDistance: null,
    gpsValid: existingSession?.latitude != null ? true : null,
  })

  useEffect(() => {
    if (!isEdit) {
      fetch(`/api/sessions?teachingLoadId=${teachingLoadId}`)
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data?.length > 0) {
            const maxMeeting = Math.max(...json.data.map((s: { meetingNumber: number }) => s.meetingNumber))
            setMeetingNumber(maxMeeting + 1)
          }
        })
        .catch(() => {})
    }
  }, [isEdit, teachingLoadId])

  async function save(doPublish: boolean) {
    const { date, startTime, endTime, topic, method, latitude, longitude, platformUrl } = values

    if (!date || !startTime || !endTime || !topic || !method || !meetingNumber) {
      toast.error("Lengkapi semua field wajib")
      return
    }

    const isDaring = isDaringMethod(method)

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

    if (doPublish) setPublishing(true)
    else setSaving(true)

    const body: Record<string, unknown> = {
      teachingLoadId,
      meetingNumber,
      date,
      startTime,
      endTime,
      topic,
      method,
      sessionType,
      studentPresent: values.studentPresent,
      studentAbsent: values.studentAbsent,
      notes: values.notes || null,
    }

    if (!isDaring) {
      body.latitude = parseFloat(latitude) || null
      body.longitude = parseFloat(longitude) || null
      body.gpsAccuracy = parseFloat(values.gpsAccuracy) || null
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
      setSaving(false)
      setPublishing(false)
      return
    }

    const newId = data.data?.id
    if (photoFile && newId) {
      const fd = new FormData()
      fd.append("file", photoFile)
      fd.append("sessionId", newId)
      try { await fetch("/api/documents", { method: "POST", body: fd }) }
      catch { toast.error("Foto gagal diunggah, sesi tetap tersimpan") }
      setPhotoFile(null)
    }

    if (doPublish && data.data?.id) {
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

    setSaving(false)
    setPublishing(false)
    router.push(`/dashboard/dosen/courses/${courseId}`)
    router.refresh()
  }

  const handleChange = useCallback(
    (patch: Partial<SessionFieldValues>) => setValues(prev => ({ ...prev, ...patch })),
    []
  )

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {isEdit ? "Edit Sesi" : "Tambah Sesi"} &mdash; {courseName}
          </CardTitle>
          {!isEdit && (
            <p className="text-sm text-muted-foreground">
              Pertemuan ke-{meetingNumber} dari {courseTotalMeeting}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <SessionFormFields
            values={values}
            onChange={handleChange}
            teachingLoadId={teachingLoadId}
            photoFile={photoFile}
            onPhotoChange={setPhotoFile}
          />
          <div className="flex gap-2 justify-end p-4 border-t bg-background sticky bottom-16 lg:bottom-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => save(false)}
              disabled={saving || publishing}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Simpan Draft
            </Button>
            <Button
              type="button"
              onClick={() => save(true)}
              disabled={saving || publishing}
            >
              {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Simpan & Publish
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
