"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import {
  SessionFormFields,
  SessionFieldValues,
  defaultSessionFieldValues,
} from "@/components/dosen/session-form-fields"
import { isDaringMethod, METHOD_LABELS, MAX_DARING } from "@/lib/constants"
import {
  Printer, Loader2, CheckCircle2, Globe, Send, Save,
  ChevronLeft, ChevronRight, Calendar, AlertCircle,
} from "lucide-react"

interface Pertemuan {
  no: number
  tanggal: string
  hari: string
  startTime: string
  endTime: string
  ruang: string
  materi: string
  method: string
  hadir: number
  tidakHadir: number
  status: string
  sessionId: string | null
  platformUrl: string
  latitude: number | null
  longitude: number | null
  gpsDistance: number | null
  gpsValid: boolean | null
}

interface Props {
  courseId: string
  teachingLoadId: string
  totalMeeting: number
  prodi: string
  courseName: string
  courseCode: string
  sks: number
  kelas: string | null
  semester: string
  jadwalInfo: string
  initialPertemuan: Pertemuan[]
  isOwner: boolean
}

type MeetingStatus = "published" | "draft" | "overdue" | "today" | "future" | "empty"

function getMeetingStatus(p: Pertemuan): MeetingStatus {
  if (p.status === "PUBLISHED") return "published"
  if (p.status === "DRAFT") return "draft"
  if (!p.tanggal) return "empty"
  const today = new Date().toISOString().split("T")[0]
  if (p.tanggal < today) return "overdue"
  if (p.tanggal === today) return "today"
  return "future"
}

const STATUS_CONFIG: Record<MeetingStatus, { label: string; badgeClass: string; borderClass: string }> = {
  published: { label: "Terisi", badgeClass: "bg-green-100 text-green-800 border-green-200", borderClass: "border-l-green-500" },
  draft:     { label: "Draft",  badgeClass: "bg-amber-100 text-amber-800 border-amber-200",  borderClass: "border-l-amber-500" },
  overdue:   { label: "Telat",  badgeClass: "bg-red-100 text-red-800 border-red-200",        borderClass: "border-l-red-500" },
  today:     { label: "Hari ini", badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200", borderClass: "border-l-yellow-500" },
  future:    { label: "",       badgeClass: "",                                               borderClass: "border-l-border" },
  empty:     { label: "Kosong", badgeClass: "bg-muted text-muted-foreground",                 borderClass: "border-l-border" },
}

function toFormValues(p: Pertemuan): SessionFieldValues {
  return {
    date: p.tanggal || new Date().toISOString().split("T")[0],
    startTime: p.startTime,
    endTime: p.endTime,
    topic: p.materi,
    method: p.method,
    studentPresent: p.hadir,
    studentAbsent: p.tidakHadir,
    platformUrl: p.platformUrl,
    notes: "",
    latitude: p.latitude?.toString() || "",
    longitude: p.longitude?.toString() || "",
    gpsAccuracy: "",
    gpsDistance: p.gpsDistance,
    gpsValid: p.gpsValid,
  }
}

function isComplete(p: Pertemuan) {
  return !!(p.tanggal && p.materi && p.method)
}

export function DaftarHadirTable({
  courseId, teachingLoadId, totalMeeting, courseName, courseCode, sks, kelas,
  semester, jadwalInfo, initialPertemuan, isOwner,
}: Props) {
  const router = useRouter()
  const [, rr] = useState(0)
  const rerender = () => rr(n => n + 1)

  const dataRef = useRef<Pertemuan[]>(
    Array.from({ length: totalMeeting }, (_, i) =>
      initialPertemuan.find(p => p.no === i + 1) || {
        no: i + 1, tanggal: "", hari: "", startTime: "", endTime: "", ruang: "",
        materi: "", method: "", hadir: 0, tidakHadir: 0, status: "", sessionId: null,
        platformUrl: "", latitude: null, longitude: null, gpsDistance: null, gpsValid: null,
      }
    )
  )

  const [selected, setSelected] = useState<number | null>(null)
  const [formValues, setFormValues] = useState<SessionFieldValues>(defaultSessionFieldValues)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const data = dataRef.current
  const terisi = data.filter(p => p.tanggal && p.materi).length
  const overdue = data.filter(p => getMeetingStatus(p) === "overdue").length

  function upd(no: number, patch: Partial<Pertemuan>) {
    dataRef.current = dataRef.current.map(p => p.no === no ? { ...p, ...patch } : p)
    rerender()
  }

  function openSheet(no: number) {
    const p = data.find(x => x.no === no)!
    setSelected(no)
    setFormValues(toFormValues(p))
    setSheetOpen(true)
  }

  function navigate(dir: number) {
    if (!selected) return
    const next = selected + dir
    if (next >= 1 && next <= totalMeeting) openSheet(next)
  }

  function buildBody(p: Pertemuan) {
    return {
      meetingNumber: p.no,
      date: p.tanggal,
      topic: p.materi,
      method: p.method || "TATAP_MUKA",
      studentPresent: p.hadir,
      studentAbsent: p.tidakHadir,
      startTime: p.startTime || "08:00",
      endTime: p.endTime || "10:00",
      platformUrl: p.platformUrl || undefined,
      latitude: p.latitude,
      longitude: p.longitude,
      distanceMeters: p.gpsDistance,
      isGpsValid: p.gpsValid,
    }
  }

  function applyFormToRef(no: number, fv: SessionFieldValues) {
    upd(no, {
      tanggal: fv.date,
      startTime: fv.startTime,
      endTime: fv.endTime,
      materi: fv.topic,
      method: fv.method,
      hadir: fv.studentPresent,
      tidakHadir: fv.studentAbsent,
      platformUrl: fv.platformUrl,
      latitude: fv.latitude ? parseFloat(fv.latitude) : null,
      longitude: fv.longitude ? parseFloat(fv.longitude) : null,
      gpsDistance: fv.gpsDistance,
      gpsValid: fv.gpsValid,
    })
  }

  async function simpan(doPublish: boolean) {
    if (!selected) return
    applyFormToRef(selected, formValues)
    const p = dataRef.current.find(x => x.no === selected)!
    if (!isComplete(p)) { toast.error("Lengkapi tanggal, materi, dan metode"); return }

    if (isDaringMethod(p.method) && !p.platformUrl) {
      toast.error("URL platform wajib untuk sesi daring")
      return
    }

    if (isDaringMethod(p.method) && !p.sessionId) {
      try {
        const qr = await fetch(`/api/teaching-loads/${teachingLoadId}/daring-quota`)
        const qj = await qr.json()
        if (qj.success && qj.data && !qj.data.isAvailable) {
          toast.error(`Kuota daring habis (maks. ${MAX_DARING}×). Tidak dapat menyimpan sesi daring baru.`)
          return
        }
      } catch { /* lanjut jika gagal fetch quota */ }
    }

    setSaving(true)
    try {
      const r = await fetch(`/api/courses/${courseId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(p)),
      })
      const j = await r.json()
      if (!j.success) { toast.error(j.message || "Gagal menyimpan"); return }
      const sid = j.data.id
      upd(selected, { sessionId: sid, status: j.data.status })

      if (!doPublish) { toast.success("Tersimpan"); setSheetOpen(false); return }

      setPublishing(true)
      const pr = await fetch(`/api/sessions/${sid}/publish`, { method: "PUT" })
      const pj = await pr.json()
      if (pj.success) { upd(selected, { status: "PUBLISHED" }); toast.success("Tersimpan & dipublish") }
      else toast.error(pj.message || "Gagal publish")
      setSheetOpen(false)
    } catch { toast.error("Gagal") }
    finally { setSaving(false); setPublishing(false) }
  }

  async function handlePublishExisting() {
    if (!selected) return
    const p = data.find(x => x.no === selected)!
    if (!p.sessionId) return
    setPublishing(true)
    try {
      const r = await fetch(`/api/sessions/${p.sessionId}/publish`, { method: "PUT" })
      const j = await r.json()
      if (j.success) { upd(selected, { status: "PUBLISHED" }); toast.success("Dipublish"); setSheetOpen(false) }
      else toast.error(j.message || "Gagal")
    } catch { toast.error("Gagal") }
    finally { setPublishing(false) }
  }

  async function handleDelete() {
    if (!selected || !confirm("Hapus pertemuan ini?")) return
    const p = data.find(x => x.no === selected)!
    if (p.sessionId) {
      try {
        const r = await fetch(`/api/courses/${courseId}/sessions?meetingNumber=${selected}`, { method: "DELETE" })
        if (!r.ok) { toast.error("Gagal menghapus"); return }
      } catch { toast.error("Gagal menghapus"); return }
    }
    upd(selected, {
      tanggal: p.tanggal, hari: p.hari, startTime: p.startTime, endTime: p.endTime, ruang: p.ruang,
      materi: "", method: "", hadir: 0, tidakHadir: 0, status: "", sessionId: null,
      platformUrl: "", latitude: null, longitude: null, gpsDistance: null, gpsValid: null,
    })
    setSheetOpen(false)
    toast.success("Pertemuan dihapus")
  }

  async function handleCetak() {
    setDownloading(true)
    try {
      const r = await fetch(`/api/courses/${courseId}/daftar-hadir?format=pdf`)
      if (!r.ok) {
        const ct = r.headers.get("content-type") || ""
        if (ct.includes("json")) { const j = await r.json(); toast.error((j as { message?: string }).message || "Gagal") }
        else toast.error(`Gagal (${r.status})`)
        return
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `Jurnal_${courseCode}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error("Gagal download") }
    finally { setDownloading(false) }
  }

  const handleFormChange = useCallback(
    (patch: Partial<SessionFieldValues>) => setFormValues(prev => ({ ...prev, ...patch })),
    []
  )

  const activePertemuan = selected ? data.find(p => p.no === selected) : null
  const activeSt = activePertemuan ? getMeetingStatus(activePertemuan) : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold leading-tight">{courseName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {courseCode} · {sks} SKS · {semester}{kelas ? ` · Kelas ${kelas}` : ""}
          </p>
          {jadwalInfo && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" /> {jadwalInfo}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-sm text-muted-foreground">{terisi}/{totalMeeting} terisi</div>
          <Progress value={Math.round((terisi / totalMeeting) * 100)} className="w-24 h-2" />
          <Button onClick={handleCetak} disabled={downloading} variant="outline" size="sm">
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Cetak
          </Button>
        </div>
      </div>

      {/* Alert overdue */}
      {overdue > 0 && isOwner && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{overdue} pertemuan sudah lewat batas waktu, segera isi.</AlertDescription>
        </Alert>
      )}

      {/* Selesai semua */}
      {terisi === totalMeeting && isOwner && (
        <Alert className="border-green-300 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Semua pertemuan terisi. Cetak PDF untuk ditandatangani Kaprodi.</AlertDescription>
        </Alert>
      )}

      {/* Grid overview pertemuan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {data.map(p => {
          const st = getMeetingStatus(p)
          const cfg = STATUS_CONFIG[st]
          return (
            <button
              key={p.no}
              onClick={() => openSheet(p.no)}
              className={`text-left rounded-lg border-l-4 border border-border bg-card p-3 hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-ring ${cfg.borderClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-muted-foreground">#{p.no}</span>
                {cfg.label && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${cfg.badgeClass}`}>
                    {cfg.label}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-tight truncate">
                {p.materi || <span className="text-muted-foreground italic">Belum diisi</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {p.tanggal || "—"}{p.method ? ` · ${METHOD_LABELS[p.method] || p.method}` : ""}
              </p>
            </button>
          )
        })}
      </div>

      {/* Sheet editor */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right">
          {activePertemuan && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between pr-8">
                  <div>
                    <SheetTitle>Pertemuan #{selected} / {totalMeeting}</SheetTitle>
                    <SheetDescription>
                      {activePertemuan.tanggal || "Belum ada tanggal"}
                      {activePertemuan.startTime && ` · ${activePertemuan.startTime}–${activePertemuan.endTime}`}
                    </SheetDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(-1)}
                      disabled={!selected || selected <= 1}
                      className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      aria-label="Pertemuan sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(1)}
                      disabled={!selected || selected >= totalMeeting}
                      className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      aria-label="Pertemuan selanjutnya"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {activePertemuan.status && (
                  <Badge
                    className={`w-fit text-xs ${activeSt ? STATUS_CONFIG[activeSt].badgeClass : ""}`}
                    variant="outline"
                  >
                    {activeSt ? STATUS_CONFIG[activeSt].label : ""}
                  </Badge>
                )}
              </SheetHeader>

              {/* Published — read only */}
              {activePertemuan.status === "PUBLISHED" ? (
                <div className="p-6 pt-4 space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <p className="font-medium">{activePertemuan.materi || "—"}</p>
                    <p className="text-sm text-muted-foreground">
                      {METHOD_LABELS[activePertemuan.method] || activePertemuan.method} ·
                      Hadir: {activePertemuan.hadir} · Tidak: {activePertemuan.tidakHadir}
                    </p>
                    {activePertemuan.platformUrl && (
                      <p className="text-xs text-blue-600 truncate flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {activePertemuan.platformUrl}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/dosen/courses/${courseId}/sessions/${activePertemuan.sessionId}`)}
                    className="text-sm text-primary hover:underline"
                  >
                    Lihat BAP & Detail →
                  </button>
                </div>
              ) : activePertemuan.status === "DRAFT" && !isOwner ? (
                <div className="p-6 pt-4 space-y-3">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="font-medium">{activePertemuan.materi}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {METHOD_LABELS[activePertemuan.method] || activePertemuan.method}
                    </p>
                  </div>
                </div>
              ) : isOwner ? (
                <>
                  <SessionFormFields
                    values={formValues}
                    onChange={handleFormChange}
                    teachingLoadId={teachingLoadId}
                  />
                  <SheetFooter>
                    <button
                      onClick={handleDelete}
                      className="mr-auto text-sm text-destructive hover:underline"
                    >
                      Hapus
                    </button>
                    {activePertemuan.status === "DRAFT" ? (
                      <Button
                        onClick={handlePublishExisting}
                        disabled={publishing}
                        className="bg-green-600 hover:bg-green-700 sm:w-auto w-full"
                      >
                        {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Publish
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => simpan(false)}
                          disabled={saving || publishing}
                          variant="outline"
                          className="sm:w-auto w-full"
                        >
                          {saving && !publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          Simpan Draft
                        </Button>
                        <Button
                          onClick={() => simpan(true)}
                          disabled={saving || publishing}
                          className="bg-green-600 hover:bg-green-700 sm:w-auto w-full"
                        >
                          {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                          Simpan & Publish
                        </Button>
                      </>
                    )}
                  </SheetFooter>
                </>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
