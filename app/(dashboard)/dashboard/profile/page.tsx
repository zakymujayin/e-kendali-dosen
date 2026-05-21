"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROLE_LABELS } from "@/lib/constants"

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const user = session?.user

  const [name, setName] = useState(user?.name || "")
  const [phone, setPhone] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      })

      if (!res.ok) throw new Error("Gagal update profil")
      await update()
      setMessage("Profil berhasil diupdate")
    } catch {
      setMessage("Gagal update profil")
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessage(data.message || "Gagal ganti password")
        return
      }

      setMessage("Password berhasil diubah")
      setCurrentPassword("")
      setNewPassword("")
    } catch {
      setMessage("Gagal ganti password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Profil</h1>

      {message && (
        <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <p className="text-sm mt-1">{user?.email}</p>
            </div>
            <div>
              <Label>Role</Label>
              <p className="text-sm mt-1">{user?.role ? ROLE_LABELS[user.role] : "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">No. Telepon</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Profil"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ganti Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Memproses..." : "Ganti Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
