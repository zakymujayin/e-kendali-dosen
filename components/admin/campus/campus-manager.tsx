"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Card, CardContent,
} from "@/components/ui/card"
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Crosshair, Save, Plus, Pencil, Trash2, MapPin } from "lucide-react"
import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

interface CampusLocation {
  id: string
  facultyId: string
  latitude: number
  longitude: number
  radiusMeters: number
  label: string | null
  isActive: boolean
  faculty?: { id: string; name: string }
}

interface Props {
  locations: CampusLocation[]
  faculties: { id: string; name: string }[]
}

function LocationEditor({
  location,
  facultyId,
  faculties,
  onClose,
}: {
  location?: CampusLocation | null
  facultyId?: string
  faculties: { id: string; name: string }[]
  onClose: () => void
}) {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  const [selectedFacultyId, setSelectedFacultyId] = useState(location?.facultyId || facultyId || "")
  const [latitude, setLatitude] = useState(location?.latitude || -6.179804987824055)
  const [longitude, setLongitude] = useState(location?.longitude || 106.15377364402957)
  const [radius, setRadius] = useState(location?.radiusMeters || 300)
  const [label, setLabel] = useState(location?.label || "")
  const [loading, setLoading] = useState(false)
  const [gettingGps, setGettingGps] = useState(false)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView([latitude, longitude], 15)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map)

    const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map)
    const circle = L.circle([latitude, longitude], { radius, color: "blue" }).addTo(map)

    marker.on("dragend", () => {
      const pos = marker.getLatLng()
      setLatitude(Number(pos.lat.toFixed(6)))
      setLongitude(Number(pos.lng.toFixed(6)))
    })

    mapInstanceRef.current = map
    markerRef.current = marker
    circleRef.current = circle

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!markerRef.current || !circleRef.current) return
    const pos: [number, number] = [latitude, longitude]
    markerRef.current.setLatLng(pos)
    circleRef.current.setLatLng(pos)
    circleRef.current.setRadius(radius)
    mapInstanceRef.current?.setView(pos, mapInstanceRef.current.getZoom())
  }, [latitude, longitude, radius])

  function handleGetGps() {
    if (!navigator.geolocation) {
      toast.error("GPS tidak didukung browser ini")
      return
    }
    setGettingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)))
        setLongitude(Number(pos.coords.longitude.toFixed(6)))
        setGettingGps(false)
        toast.success("Lokasi terdeteksi")
      },
      () => {
        toast.error("Gagal mendapatkan lokasi")
        setGettingGps(false)
      },
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFacultyId) {
      toast.error("Pilih fakultas")
      return
    }
    setLoading(true)

    const url = location
      ? `/api/campus/location/${location.id}`
      : "/api/campus/location"
    const method = location ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facultyId: selectedFacultyId,
        latitude,
        longitude,
        radiusMeters: radius,
        label: label || null,
      }),
    })
    const data = await res.json()

    if (data.success) {
      toast.success(data.message)
      router.refresh()
      onClose()
    } else {
      toast.error(data.message || "Gagal menyimpan")
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-facultyId">Fakultas</Label>
          <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId} disabled={!!location}>
            <SelectTrigger id="edit-facultyId"><SelectValue placeholder="Pilih fakultas" /></SelectTrigger>
            <SelectContent>
              {faculties.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-label">Label (opsional)</Label>
          <Input id="edit-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Mis: Kampus Utama" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-latitude">Latitude</Label>
          <Input id="edit-latitude" type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(Number(e.target.value))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-longitude">Longitude</Label>
          <Input id="edit-longitude" type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(Number(e.target.value))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-radius">Radius (meter)</Label>
          <Input id="edit-radius" type="number" min={50} max={1000} value={radius} onChange={(e) => setRadius(Number(e.target.value))} required />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={handleGetGps} disabled={gettingGps}>
            <Crosshair className="h-4 w-4 mr-2" aria-hidden="true" />
            {gettingGps ? "Mendeteksi..." : "Gunakan Lokasi Saya"}
          </Button>
        </div>
      </div>

      <div ref={mapRef} className="h-64 w-full rounded-md border z-0" />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" aria-hidden="true" />
          {loading ? "Menyimpan..." : location ? "Update" : "Simpan"}
        </Button>
      </div>
    </form>
  )
}

export function CampusManager({ locations, faculties }: Props) {
  const router = useRouter()
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("__all__")
  const [editTarget, setEditTarget] = useState<CampusLocation | null | "new">(null)
  const [deleteTarget, setDeleteTarget] = useState<CampusLocation | null>(null)

  const filteredLocations = locations.filter((l) =>
    selectedFacultyId === "__all__" || l.facultyId === selectedFacultyId
  )

  async function handleDelete(loc: CampusLocation) {
    setDeleteTarget(loc)
  }

  async function doDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/campus/location/${deleteTarget.id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      toast.success("Lokasi berhasil dihapus")
      router.refresh()
    } else {
      toast.error(data.message || "Gagal menghapus")
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4 flex-wrap">
        <div className="w-72 space-y-2">
          <Label htmlFor="faculty-filter">Filter Fakultas</Label>
          <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
            <SelectTrigger id="faculty-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua fakultas</SelectItem>
              {faculties.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditTarget("new")} disabled={!selectedFacultyId}>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Tambah Lokasi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editTarget && editTarget !== "new" ? "Edit Lokasi" : "Tambah Lokasi Baru"}</DialogTitle>
            </DialogHeader>
            {editTarget !== null && (
              <LocationEditor
                location={editTarget !== "new" ? editTarget : null}
                facultyId={selectedFacultyId}
                faculties={faculties}
                onClose={() => setEditTarget(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {filteredLocations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {selectedFacultyId
              ? "Belum ada lokasi untuk fakultas ini. Klik Tambah Lokasi untuk menambahkan."
              : "Pilih fakultas untuk melihat atau menambahkan lokasi."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredLocations.map((loc) => (
            <Card key={loc.id} className={loc.isActive ? "" : "opacity-60"}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      <span className="font-medium">{loc.label || "Tanpa Label"}</span>
                      {!loc.isActive && <span className="text-xs text-muted-foreground">(nonaktif)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-x-4">
                      <span>Lat: {loc.latitude}</span>
                      <span>Lng: {loc.longitude}</span>
                      <span>Radius: {loc.radiusMeters}m</span>
                    </div>
                    {loc.faculty && (
                      <p className="text-xs text-muted-foreground mt-0.5">{loc.faculty.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setEditTarget(loc)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(loc)}>
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      <span className="sr-only">Hapus</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Hapus Lokasi Kampus"
        description={`Anda yakin ingin menghapus lokasi "${deleteTarget?.label || "Tanpa Label"}"?`}
        onConfirm={doDelete}
      />
    </div>
  )
}
