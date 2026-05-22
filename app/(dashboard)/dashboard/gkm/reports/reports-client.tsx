"use client"

import { useState, useCallback } from "react"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Loader2, Users, BookOpen, CheckCircle2, Clock } from "lucide-react"

interface Semester { id: string; name: string; year: string; term: string; isActive: boolean }
interface Course { code: string; name: string; sks: number; published: number; target: number; progressPercent: number; daring: number; luring: number; avgAttendance: number }
interface BkdDosen { id: string; name: string; nidn: string | null; prodi: string; totalSks: number; totalMk: number; totalPublished: number; totalTarget: number; progressPercent: number; daringCount: number; luringCount: number; avgAttendance: number; courses: Course[] }
interface BkdData { semester: { id: string; name: string; year: string } | null; reportDate: string; dosen: BkdDosen[] }

interface Props { prodiName: string; prodiId: string; semesters: Semester[]; activeSemesterId?: string }

export function GKMLaporanClient({ prodiName, prodiId, semesters, activeSemesterId }: Props) {
  const [semesterId, setSemesterId] = useState(activeSemesterId || "")
  const [data, setData] = useState<BkdData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedDosen, setExpandedDosen] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (semesterId) params.set("semesterId", semesterId)
      params.set("prodiId", prodiId)
      const res = await fetch(`/api/reports/bkd?${params.toString()}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {}
    setLoading(false)
  }, [semesterId, prodiId])

  const exportUrl = (type: "excel" | "pdf") => {
    const params = new URLSearchParams()
    if (semesterId) params.set("semesterId", semesterId)
    params.set("prodiId", prodiId)
    return `/api/reports/bkd/export-${type}?${params.toString()}`
  }

  const stats = data ? {
    totalDosen: data.dosen.length,
    totalMk: data.dosen.reduce((s, d) => s + d.totalMk, 0),
    totalPublished: data.dosen.reduce((s, d) => s + d.totalPublished, 0),
    totalTarget: data.dosen.reduce((s, d) => s + d.totalTarget, 0),
  } : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan BKD &mdash; {prodiName}</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Semester</Label>
          <Select value={semesterId} onValueChange={setSemesterId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Pilih" /></SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name} {s.year} {s.isActive ? "(Aktif)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={fetchData} disabled={loading || !semesterId}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Tampilkan
        </Button>
        {data && (
          <>
            <Button variant="outline" asChild>
              <a href={exportUrl("excel")}><Download className="h-4 w-4 mr-2" />Excel</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={exportUrl("pdf")}><FileText className="h-4 w-4 mr-2" />PDF</a>
            </Button>
          </>
        )}
      </div>

      {loading && <p className="text-muted-foreground">Memuat...</p>}

      {data && stats && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Dosen</p>
              <p className="text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5" />{stats.totalDosen}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total MK</p>
              <p className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" />{stats.totalMk}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />{stats.totalPublished}/{stats.totalTarget}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Rata-rata Progress</p>
              <p className="text-2xl font-bold flex items-center gap-2"><Clock className="h-5 w-5" />{stats.totalTarget > 0 ? Math.round((stats.totalPublished / stats.totalTarget) * 100) : 0}%</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Daftar Dosen</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dosen</TableHead><TableHead>MK</TableHead><TableHead>SKS</TableHead><TableHead>Progress</TableHead><TableHead>Daring/Luring</TableHead><TableHead>Hadir%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dosen.map((d) => (
                    <><TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedDosen(expandedDosen === d.id ? null : d.id)}>
                      <TableCell className="font-medium">{d.name}<br /><span className="text-xs text-muted-foreground">{d.nidn}</span></TableCell>
                      <TableCell>{d.totalMk}</TableCell><TableCell>{d.totalSks}</TableCell>
                      <TableCell><Badge variant={d.progressPercent >= 100 ? "default" : "secondary"}>{d.progressPercent}%</Badge></TableCell>
                      <TableCell>{d.daringCount}/{d.luringCount}</TableCell><TableCell>{d.avgAttendance}%</TableCell>
                    </TableRow>
                    {expandedDosen === d.id && (
                      <TableRow key={`${d.id}-detail`}>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead>MK</TableHead><TableHead>SKS</TableHead><TableHead>Pub</TableHead><TableHead>Target</TableHead><TableHead>%</TableHead><TableHead>Daring</TableHead><TableHead>Hadir%</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {d.courses.map((c, i) => (
                                <TableRow key={i}>
                                  <TableCell><span className="font-medium">{c.code}</span><br /><span className="text-xs text-muted-foreground">{c.name}</span></TableCell>
                                  <TableCell>{c.sks}</TableCell><TableCell>{c.published}</TableCell><TableCell>{c.target}</TableCell>
                                  <TableCell><Badge variant={c.published >= c.target ? "default" : "secondary"}>{c.progressPercent}%</Badge></TableCell>
                                  <TableCell>{c.daring}</TableCell><TableCell>{c.avgAttendance}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}</>
                  ))}
                  {data.dosen.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
