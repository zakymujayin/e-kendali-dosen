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
import { Users, BookOpen, CheckCircle2, Clock } from "lucide-react"
import { METHOD_LABELS } from "@/lib/constants"

interface DosenItem {
  id: string
  name: string
  nidn: string | null
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
    course: { id: string; name: string; code: string }
  }
}

interface Props {
  prodiName: string
  dosenList: DosenItem[]
  semesterId?: string
}

export function MonitoringClient({ prodiName, dosenList, semesterId }: Props) {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDosen, setSelectedDosen] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedDosen) params.set("userId", selectedDosen)
      params.set("limit", "200")

      const res = await fetch(`/api/sessions?${params.toString()}`)
      const json = await res.json()
      if (json.success) setSessions(json.data)
    } catch {}
    setLoading(false)
  }, [selectedDosen])

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
    dosenCount: new Set(filteredSessions.map((s) => s.teachingLoad.user.id)).size,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Monitoring Perkuliahan &mdash; {prodiName}</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sesi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <BookOpen className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dosen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dosenCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Dosen</Label>
          <Select value={selectedDosen} onValueChange={setSelectedDosen}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Semua Dosen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Dosen</SelectItem>
              {dosenList.map((d) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Sesi Perkuliahan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dosen</TableHead>
                <TableHead>MK</TableHead>
                <TableHead>TM</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Topik</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                    <TableCell className="font-medium">{s.teachingLoad.user.name}</TableCell>
                    <TableCell>{s.teachingLoad.course.name}</TableCell>
                    <TableCell>{s.meetingNumber}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(s.date), "dd MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{s.startTime}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{s.topic}</TableCell>
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
