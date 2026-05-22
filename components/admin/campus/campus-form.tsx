"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Crosshair, Save, MapPin } from "lucide-react"

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
  faculty?: { id: string; name: string }
}

interface Props {
  location: CampusLocation | null
  faculties: { id: string; name: string }[]
}

export function CampusForm({ location, faculties }: Props) {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  const [facultyId, setFacultyId] = useState(location?.facultyId || "")
  const [latitude, setLatitude] = useState(location?.latitude || -6.2)
  const [longitude, setLongitude] = useState(location?.longitude || 106.8)
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
      }
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!facultyId) {
      toast.error("Pilih fakultas")
      return
    }
    setLoading(true)

    const method = location ? "PUT" : "POST"
    const res = await fetch("/api/campus/location", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facultyId, latitude, longitude, radiusMeters: radius, label }),
    })
    const data = await res.json()

    if (data.success) {
      toast.success(data.message)
      router.refresh()
    } else {
      toast.error(data.message || "Gagal menyimpan")
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {location ? "Edit Koordinat Kampus" : "Atur Koordinat Kampus"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fakultas</Label>
              <Select value={facultyId} onValueChange={setFacultyId} disabled={!!location}>
                <SelectTrigger><SelectValue placeholder="Pilih fakultas" /></SelectTrigger>
                <SelectContent>
                  {faculties.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label (opsional)</Label>
              <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Mis: Kampus Utama" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius">Radius (meter)</Label>
              <Input id="radius" type="number" min={50} max={1000} value={radius} onChange={(e) => setRadius(Number(e.target.value))} required />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={handleGetGps} disabled={gettingGps}>
                <Crosshair className="h-4 w-4 mr-2" />
                {gettingGps ? "Mendeteksi..." : "Gunakan Lokasi Saya"}
              </Button>
            </div>
          </div>

          <div ref={mapRef} className="h-80 w-full rounded-md border z-0" />

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" /> {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
