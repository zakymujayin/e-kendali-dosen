"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import { ROLE_LABELS } from "@/lib/constants"

interface Props {
  mode: "create" | "edit"
  userId?: string
  faculties: { id: string; name: string }[]
  prodiList: { id: string; name: string; facultyId: string }[]
}

export function UserForm({ mode, userId, faculties, prodiList }: Props) {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(mode === "edit")
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("DOSEN")
  const [nidn, setNidn] = useState("")
  const [nip, setNip] = useState("")
  const [phone, setPhone] = useState("")
  const [facultyId, setFacultyId] = useState("")
  const [prodiId, setProdiId] = useState("")

  const filteredProdi = prodiList.filter((p) => !facultyId || p.facultyId === facultyId)

  useEffect(() => {
    if (mode === "edit" && userId) {
      fetch(`/api/users/${userId}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            const u = json.data
            setUsername(u.username)
            setName(u.name)
            setEmail(u.email)
            setRole(u.role)
            setNidn(u.nidn || "")
            setNip(u.nip || "")
            setPhone(u.phone || "")
            setProdiId(u.prodiId || "")
            if (u.prodiId) {
              const prodi = prodiList.find((p) => p.id === u.prodiId)
              if (prodi) setFacultyId(prodi.facultyId)
            }
          }
        })
        .finally(() => setInitialLoading(false))
    }
  }, [mode, userId, prodiList])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const url = mode === "create" ? "/api/users" : `/api/users/${userId}`
    const method = mode === "create" ? "POST" : "PUT"
    const body: Record<string, unknown> = { username, name, email, role, nidn, nip, phone, prodiId: prodiId || null }
    if (password) body.password = password

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (data.success) {
      if (session?.user?.id === userId) {
        await update({ name })
      }
      toast.success(data.message)
      router.push("/dashboard/admin/users")
      router.refresh()
    } else {
      toast.error(data.message || "Gagal menyimpan user")
    }
    setLoading(false)
  }

  if (initialLoading) {
    return <div className="flex justify-center py-12 text-muted-foreground">Memuat...</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <h1 className="text-2xl font-bold">{mode === "create" ? "Tambah User" : "Edit User"}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Data User</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {mode === "edit" && <span className="text-muted-foreground text-xs">(kosongkan jika tidak diubah)</span>}
                </Label>
                <Input
                  id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={mode === "create"} minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nidn">NIDN</Label>
                <Input id="nidn" value={nidn} onChange={(e) => setNidn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nip">NIP</Label>
                <Input id="nip" value={nip} onChange={(e) => setNip(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facultyId">Fakultas</Label>
                <Select value={facultyId} onValueChange={(v) => { setFacultyId(v); setProdiId("") }}>
                  <SelectTrigger id="facultyId"><SelectValue placeholder="Pilih fakultas" /></SelectTrigger>
                  <SelectContent>
                    {faculties.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prodiId">Prodi</Label>
                <Select value={prodiId} onValueChange={setProdiId} disabled={!facultyId}>
                  <SelectTrigger id="prodiId"><SelectValue placeholder="Pilih prodi" /></SelectTrigger>
                  <SelectContent>
                    {filteredProdi.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" aria-hidden="true" /> {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
