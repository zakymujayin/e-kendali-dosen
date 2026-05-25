"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileSpreadsheet, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, XCircle } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type Step = "upload" | "dosen" | "course" | "tl" | "result"

interface StepState {
  semesterId: string
  semesters: Array<{ id: string; name: string; year: string; isActive: boolean }>
  totalRows: number
  usersCreated: number
  usersSkipped: number
  coursesCreated: number
  coursesSkipped: number
  teachingLoadsCreated: number
  errors: string[]
}

export function ImportJadwalDialog({ open, onOpenChange, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<StepState>({
    semesterId: "", semesters: [],
    totalRows: 0,
    usersCreated: 0, usersSkipped: 0,
    coursesCreated: 0, coursesSkipped: 0,
    teachingLoadsCreated: 0, errors: [],
  })
  const [loading, setLoading] = useState(false)
  const [dosenMatches, setDosenMatches] = useState<any[]>([])
  const [courseMatches, setCourseMatches] = useState<any[]>([])
  const [tlCount, setTlCount] = useState(0)

  function handleClose() {
    if (step === "result" && (state.usersCreated > 0 || state.coursesCreated > 0 || state.teachingLoadsCreated > 0)) {
      onSuccess()
    }
    onOpenChange(false)
    setTimeout(() => {
      setStep("upload")
      setFile(null)
      setState({
        semesterId: "", semesters: [],
        totalRows: 0,
        usersCreated: 0, usersSkipped: 0,
        coursesCreated: 0, coursesSkipped: 0,
        teachingLoadsCreated: 0, errors: [],
      })
      setDosenMatches([])
      setCourseMatches([])
      setTlCount(0)
    }, 300)
  }

  const stepLabels = ["Upload", "Dosen", "MK", "TL", "Hasil"]
  const stepIndex = ["upload", "dosen", "course", "tl", "result"].indexOf(step)

  async function handlePreview() {
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    formData.append("preview", "true")
    formData.append("semesterId", state.semesterId)

    try {
      const res = await fetch("/api/teaching-loads/import-jadwal", { method: "POST", body: formData })
      const json = await res.json()
      if (json.success) {
        setDosenMatches(json.data.dosenMatches || [])
        setCourseMatches(json.data.courseMatches || [])
        setTlCount(json.data.tlCount || 0)
        setState((s) => ({
          ...s,
          totalRows: json.data.totalRows || 0,
          semesters: json.data.semesters || s.semesters,
        }))
        setStep("dosen")
      } else {
        toast.error(json.message || "Gagal membaca file")
      }
    } catch {
      toast.error("Gagal membaca file")
    }
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("semesterId", state.semesterId)

    const mapping: Record<string, string> = {}
    for (const m of dosenMatches) {
      if (m.matchedUser) {
        mapping[m.dosen.namaNormalized] = m.matchedUser.id
      }
    }
    formData.append("userMapping", JSON.stringify(mapping))

    const res = await fetch("/api/teaching-loads/import-jadwal", { method: "POST", body: formData })
    const json = await res.json()
    setLoading(false)

    if (json.success) {
      setState((s) => ({
        ...s,
        totalRows: json.data.totalRows,
        usersCreated: json.data.usersCreated,
        usersSkipped: json.data.usersSkipped,
        coursesCreated: json.data.coursesCreated,
        coursesSkipped: json.data.coursesSkipped,
        teachingLoadsCreated: json.data.teachingLoadsCreated,
        errors: json.data.errors || [],
      }))
      setStep("result")
    } else {
      toast.error(json.message || "Gagal mengimpor")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1 text-sm">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0
                ${i <= stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={i === stepIndex ? "font-medium" : "text-muted-foreground"}>{label}</span>
              {i < stepLabels.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        <DialogHeader>
          <DialogTitle>Import Jadwal Kelas</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload file Excel jadwal dari akademik"}
            {step === "dosen" && "Review dan perbaiki mapping dosen"}
            {step === "course" && "Review mata kuliah yang akan diimpor"}
            {step === "tl" && "Ringkasan teaching loads sebelum impor"}
            {step === "result" && "Hasil impor"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Pilih Semester</p>
              <Select
                value={state.semesterId}
                onValueChange={(v) => setState((s) => ({ ...s, semesterId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih semester..." />
                </SelectTrigger>
                <SelectContent>
                  {state.semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.year} {s.isActive ? "(Aktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Klik untuk upload file Excel</p>
              <p className="text-xs text-muted-foreground mt-1">Format: .xlsm / .xlsx</p>
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium">{file.name}</span>
                <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".xlsm,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setFile(f)
              }}
            />

            <DialogFooter>
              <Button disabled={!state.semesterId || !file} onClick={handlePreview}>
                Lanjut <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "dosen" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {dosenMatches.length} dosen unik ditemukan. Periksa status pencocokan.
            </p>
            <div className="rounded-md border max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama di Excel</TableHead>
                    <TableHead>NIDN</TableHead>
                    <TableHead>Hasil</TableHead>
                    <TableHead>Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dosenMatches.map((m: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{m.dosen.namaExcel}</TableCell>
                      <TableCell>{m.dosen.nidn || "-"}</TableCell>
                      <TableCell>
                        {m.status === "matched" && (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle2 className="w-4 h-4" /> {m.matchedUser?.name}
                          </span>
                        )}
                        {m.status === "fuzzy" && (
                          <span className="flex items-center gap-1 text-amber-600 text-sm">
                            <AlertCircle className="w-4 h-4" /> {m.candidates?.[0]?.name || "Mirip"}
                          </span>
                        )}
                        {m.status === "not_found" && (
                          <span className="flex items-center gap-1 text-red-600 text-sm">
                            <XCircle className="w-4 h-4" /> Tidak ditemukan
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.status === "fuzzy" && (
                          <Select
                            value={m.matchedUser?.id || ""}
                            onValueChange={(userId) => {
                              const updated = [...dosenMatches]
                              const user = m.candidates.find((c: any) => c.id === userId)
                              updated[i] = { ...m, matchedUser: user || null, status: "matched" }
                              setDosenMatches(updated)
                            }}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Pilih user..." />
                            </SelectTrigger>
                            <SelectContent>
                              {m.candidates.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {m.status === "not_found" && (
                          <span className="text-xs text-muted-foreground">Akan dibuat otomatis</span>
                        )}
                        {m.status === "matched" && (
                          <span className="text-xs text-muted-foreground">Otomatis</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Kembali
              </Button>
              <Button onClick={() => setStep("course")}>
                Lanjut <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "course" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {courseMatches.length} MK unik.{" "}
              {courseMatches.filter((c: any) => c.status === "matched").length} sudah ada,{" "}
              {courseMatches.filter((c: any) => c.status === "new").length} baru akan dibuat.
            </p>
            <div className="rounded-md border max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode MK</TableHead>
                    <TableHead>Nama MK</TableHead>
                    <TableHead>SKS</TableHead>
                    <TableHead>Prodi</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseMatches.map((m: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{m.course.kodeMk}</TableCell>
                      <TableCell>{m.course.namaMk}</TableCell>
                      <TableCell>{m.course.sks}</TableCell>
                      <TableCell>{m.course.prodiCode}</TableCell>
                      <TableCell>
                        {m.status === "matched" ? (
                          <span className="text-green-600 text-sm flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Sudah ada
                          </span>
                        ) : (
                          <span className="text-amber-600 text-sm flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Baru
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("dosen")}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Kembali
              </Button>
              <Button onClick={() => setStep("tl")}>
                Lanjut <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "tl" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-1 bg-muted/50">
              <p className="text-sm">
                <strong>{tlCount}</strong> baris data jadwal akan diproses
              </p>
              <p className="text-sm">
                <strong>{dosenMatches.filter((m: any) => m.matchedUser).length}</strong> dosen terlink
              </p>
              <p className="text-sm">
                <strong>{courseMatches.filter((c: any) => c.matchedCourse).length}</strong> MK terlink
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("course")}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Kembali
              </Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? "Mengimpor..." : "Import Semua"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm">Total baris data: <strong>{state.totalRows}</strong></p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="border rounded p-2 text-center">
                  <p className="text-2xl font-bold text-green-600">{state.usersCreated}</p>
                  <p className="text-xs text-muted-foreground">Dosen baru</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-2xl font-bold text-amber-600">{state.coursesCreated}</p>
                  <p className="text-xs text-muted-foreground">MK baru</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{state.teachingLoadsCreated}</p>
                  <p className="text-xs text-muted-foreground">Teaching Load</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-2xl font-bold text-blue-600">{state.usersSkipped + state.coursesSkipped}</p>
                  <p className="text-xs text-muted-foreground">Sudah ada</p>
                </div>
              </div>
            </div>
            {state.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border p-3">
                <p className="text-sm font-medium mb-1">Detail Error:</p>
                {state.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">{err}</p>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Selesai</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
