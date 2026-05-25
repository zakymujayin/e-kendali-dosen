"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"

import { Download, FileText, Loader2 } from "lucide-react"

interface Semester { id: string; name: string; year: string; term: string; isActive: boolean }
interface Course { code: string; name: string; sks: number; published: number; target: number; progressPercent: number; daring: number; luring: number; avgAttendance: number }
interface BkdDosen { id: string; name: string; nidn: string | null; prodi: string; totalSks: number; totalMk: number; totalPublished: number; totalTarget: number; progressPercent: number; daringCount: number; luringCount: number; avgAttendance: number; courses: Course[] }
interface BkdData { semester: { id: string; name: string; year: string } | null; reportDate: string; dosen: BkdDosen[] }

interface Props { semesters: Semester[]; activeSemesterId?: string; userId: string }

export function DosenReportsClient({ semesters, activeSemesterId, userId }: Props) {
  const [semesterId, setSemesterId] = useState(activeSemesterId || "")
  const [data, setData] = useState<BkdData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (semesterId) params.set("semesterId", semesterId)
      params.set("userId", userId)
      const res = await fetch(`/api/reports/bkd?${params.toString()}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {}
    setLoading(false)
  }, [semesterId, userId])

  const exportUrl = (type: "excel" | "pdf") => {
    const params = new URLSearchParams()
    if (semesterId) params.set("semesterId", semesterId)
    params.set("userId", userId)
    return `/api/reports/bkd/export-${type}?${params.toString()}`
  }

  const dosen = data?.dosen?.[0]

  useEffect(() => {
    if (semesterId) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Laporan e-Kendali Dosen</h1>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Semester</Label>
          <Select value={semesterId} onValueChange={setSemesterId}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name} {s.year} {s.isActive ? "(Aktif)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={fetchData} disabled={loading || !semesterId} aria-label="Tampilkan data">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> : null}
          Tampilkan
        </Button>
        {data && (
          <>
            <Button variant="outline" asChild aria-label="Export Excel">
              <a href={exportUrl("excel")}><Download className="h-4 w-4 mr-2" aria-hidden="true" />Excel</a>
            </Button>
            <Button variant="outline" asChild aria-label="Export PDF">
              <a href={exportUrl("pdf")}><FileText className="h-4 w-4 mr-2" aria-hidden="true" />PDF</a>
            </Button>
          </>
        )}
      </div>

      {loading && <p className="text-muted-foreground" aria-live="polite">Memuat...</p>}

      {data && dosen && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow border-l-4 border-teal-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold">{dosen.totalSks}</CardTitle>
                <CardDescription>Total SKS</CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:shadow-md transition-shadow border-l-4 border-indigo-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold">{dosen.totalPublished}/{dosen.totalTarget}</CardTitle>
                <CardDescription>Progress</CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:shadow-md transition-shadow border-l-4 border-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold">{dosen.daringCount} / {dosen.luringCount}</CardTitle>
                <CardDescription>Daring / Luring</CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:shadow-md transition-shadow border-l-4 border-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold">{dosen.avgAttendance}%</CardTitle>
                <CardDescription>Rata-rata Hadir</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Detail per MK</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MK</TableHead><TableHead className="hidden md:table-cell">SKS</TableHead><TableHead>Published</TableHead><TableHead>Target</TableHead><TableHead>Progress</TableHead><TableHead className="hidden md:table-cell">Daring</TableHead><TableHead className="hidden md:table-cell">Luring</TableHead><TableHead>Hadir%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dosen.courses.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell><span className="font-medium">{c.code}</span><br /><span className="text-xs text-muted-foreground">{c.name}</span></TableCell>
                      <TableCell className="hidden md:table-cell">{c.sks}</TableCell><TableCell>{c.published}</TableCell><TableCell>{c.target}</TableCell>
                       <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={c.progressPercent}
                              className={`w-24 h-2.5 ${
                                c.progressPercent >= 80 ? "[&>div]:bg-green-500" :
                                c.progressPercent >= 50 ? "[&>div]:bg-yellow-500" :
                                "[&>div]:bg-red-500"
                              }`}
                            />
                            <span className="text-sm font-medium">{c.progressPercent}%</span>
                          </div>
                        </TableCell>
                      <TableCell className="hidden md:table-cell">{c.daring}</TableCell><TableCell className="hidden md:table-cell">{c.luring}</TableCell><TableCell>{c.avgAttendance}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {data && !dosen && <p className="text-muted-foreground" role="alert">Belum ada data untuk semester ini.</p>}
    </div>
  )
}
