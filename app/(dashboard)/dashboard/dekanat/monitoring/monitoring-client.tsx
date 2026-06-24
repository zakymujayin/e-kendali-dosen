"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Building2, Clock } from "lucide-react"
import { METHOD_LABELS } from "@/lib/constants"

interface ProdiItem {
  id: string
  name: string
}

interface DosenItem {
  id: string
  name: string
  nidn: string | null
  prodiId: string | null
}

interface SessionItem {
  id: string
  meetingNumber: number
  date: string
  startTime: string
  endTime: string
  topic: string
  method: string
  status: string
  teachingLoad: {
    user: { id: string; name: string; nidn: string | null }
    course: { id: string; name: string; code: string; prodi?: { id: string; name: string } | null }
  }
}

interface Props {
  prodiList: ProdiItem[]
  allDosen: DosenItem[]
}

export function MonitoringClient({ prodiList, allDosen }: Props) {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedProdi, setSelectedProdi] = useState("all")
  const [selectedDosen, setSelectedDosen] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const filteredDosen = selectedProdi && selectedProdi !== "all"
    ? allDosen.filter((d) => d.prodiId === selectedProdi)
    : allDosen

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (selectedProdi && selectedProdi !== "all") params.set("prodiId", selectedProdi)
      if (selectedDosen && selectedDosen !== "all") params.set("userId", selectedDosen)
      params.set("limit", "200")

      const res = await fetch(`/api/sessions?${params.toString()}`)
      const json = await res.json()
      if (json.success) setSessions(json.data)
    } catch { setError("Gagal memuat data monitoring") }
    setLoading(false)
  }, [selectedProdi, selectedDosen])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (dateFrom && s.date < dateFrom) return false
      if (dateTo && s.date > dateTo) return false
      return true
    })
  }, [sessions, dateFrom, dateTo])

  const stats = {
    total: filteredSessions.length,
    published: filteredSessions.filter((s) => s.status === "PUBLISHED").length,
    draft: filteredSessions.filter((s) => s.status === "DRAFT").length,
    prodiCount: new Set(filteredSessions.map((s) => s.teachingLoad.course.prodi?.name || "")).size,
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold tracking-tight">Monitoring Perkuliahan &mdash; Dekanat</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sesi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" /><span className="sr-only">Published</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-500" /><span className="sr-only">Draft</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prodi</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.prodiCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Prodi</Label>
          <Select value={selectedProdi} onValueChange={(v) => { setSelectedProdi(v); setSelectedDosen("all") }}>
            <SelectTrigger className="w-[200px]" aria-label="Filter prodi"><SelectValue placeholder="Semua Prodi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Prodi</SelectItem>
              {prodiList.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dosen</Label>
          <Select value={selectedDosen} onValueChange={setSelectedDosen}>
            <SelectTrigger className="w-[200px]" aria-label="Filter dosen"><SelectValue placeholder="Semua Dosen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Dosen</SelectItem>
              {filteredDosen.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dari Tanggal</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sampai Tanggal</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-base">Daftar Sesi Perkuliahan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodi</TableHead>
                <TableHead>Dosen</TableHead>
                <TableHead>MK</TableHead>
                <TableHead>TM</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground" aria-live="polite">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Belum ada sesi
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.teachingLoad.course.prodi?.name || "-"}</TableCell>
                    <TableCell className="font-medium">{s.teachingLoad.user.name}</TableCell>
                    <TableCell>{s.teachingLoad.course.name}</TableCell>
                    <TableCell>{s.meetingNumber}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(s.date), "dd MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{s.startTime}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{METHOD_LABELS[s.method] || s.method}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "PUBLISHED" ? "default" : "secondary"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
