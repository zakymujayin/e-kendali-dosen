"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  prodi?: { id: string; name: string; gkmUsers: { id: string; name: string }[] } | null
  users: { id: string; name: string; nidn: string | null; prodiId: string | null }[]
  onSuccess: () => void
}

export function AssignGkmDialog({ open, onOpenChange, prodi, users, onSuccess }: Props) {
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)

  const currentGkm = prodi?.gkmUsers?.[0]
  const filteredUsers = users.filter((u) => u.prodiId === prodi?.id || !u.prodiId)

  useEffect(() => {
    if (open && currentGkm) {
      setUserId(currentGkm.id)
    } else if (open) {
      setUserId("")
    }
  }, [open, currentGkm])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`/api/prodi/${prodi!.id}/assign-gkm`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId || null }),
    })
    const data = await res.json()

    if (data.success) {
      toast.success(data.message)
      onSuccess()
    } else {
      toast.error(data.message || "Gagal menetapkan GKM")
    }
    setLoading(false)
  }

  async function handleRemove() {
    setLoading(true)
    const res = await fetch(`/api/prodi/${prodi!.id}/assign-gkm`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: null }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success("GKM berhasil dihapus")
      onSuccess()
    } else {
      toast.error(data.message || "Gagal menghapus GKM")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atur GKM — {prodi?.name}</DialogTitle>
          <DialogDescription>Pilih dosen sebagai GKM untuk prodi ini</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="gkm-select">Pilih Dosen (GKM)</label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="gkm-select"><SelectValue placeholder="Pilih dosen..." /></SelectTrigger>
              <SelectContent>
                {filteredUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} {u.nidn ? `(${u.nidn})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentGkm && (
            <p className="text-xs text-muted-foreground">
              GKM saat ini: {currentGkm.name}
            </p>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div>
              {currentGkm && (
                <Button type="button" variant="destructive" size="sm" onClick={handleRemove} disabled={loading}>
                  Hapus GKM
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
