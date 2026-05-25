"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Calendar,
  BookMarked,
  MapPin,
  FileText,
  Bell,
  Menu,
  X,
  LogOut,
  User,
  ClipboardList,
  BarChart3,
  Download,
  CheckCheck,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Role } from "@prisma/client"

interface UserData {
  id: string
  name?: string | null
  email?: string | null
  role: Role
  prodiId?: string | null
  image?: string | null
}

interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

const roleMenus: Record<string, { label: string; href: string; icon: React.ElementType; badge?: number }[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Fakultas", href: "/dashboard/admin/fakultas", icon: Building2 },
    { label: "Prodi", href: "/dashboard/admin/prodi", icon: GraduationCap },
    { label: "User", href: "/dashboard/admin/users", icon: Users },
    { label: "Semester", href: "/dashboard/admin/semester", icon: Calendar },
    { label: "Mata Kuliah", href: "/dashboard/admin/courses", icon: BookMarked },
    { label: "Penugasan", href: "/dashboard/admin/teaching-loads", icon: ClipboardList },
    { label: "Koordinat Kampus", href: "/dashboard/admin/campus", icon: MapPin },
    { label: "Laporan", href: "/dashboard/admin/reports", icon: FileText },
  ],
  DOSEN: [
    { label: "Dashboard", href: "/dashboard/dosen", icon: LayoutDashboard },
    { label: "MK Saya", href: "/dashboard/dosen/courses", icon: BookOpen, badge: 0 },
    { label: "Laporan", href: "/dashboard/dosen/reports", icon: Download },
  ],
  GKM: [
    { label: "Dashboard", href: "/dashboard/gkm", icon: LayoutDashboard },
    { label: "Monitoring", href: "/dashboard/gkm/monitoring", icon: BarChart3 },
    { label: "Laporan", href: "/dashboard/gkm/reports", icon: FileText },
  ],
  DEKANAT: [
    { label: "Dashboard", href: "/dashboard/dekanat", icon: LayoutDashboard },
    { label: "Monitoring", href: "/dashboard/dekanat/monitoring", icon: BarChart3 },
    { label: "Laporan", href: "/dashboard/dekanat/reports", icon: FileText },
  ],
}

export function DashboardLayoutClient({
  user: initialUser,
  children,
  draftCount = 0,
}: {
  user: UserData
  children: React.ReactNode
  draftCount?: number
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user ?? initialUser
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const menus = (roleMenus[user.role] || roleMenus.DOSEN).map((item) =>
    item.label === "MK Saya" ? { ...item, badge: draftCount } : item
  )

  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-800",
    DOSEN: "bg-blue-100 text-blue-800",
    GKM: "bg-green-100 text-green-800",
    DEKANAT: "bg-purple-100 text-purple-800",
  }

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count")
      const data = await res.json()
      if (data.success) setUnreadCount(data.data.count)
    } catch {}
  }, [])

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await fetch("/api/notifications?limit=10")
      const data = await res.json()
      if (data.success) setNotifications(data.data)
    } catch {}
    setNotifLoading(false)
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  useEffect(() => {
    if (notifOpen) fetchNotifications()
  }, [notifOpen, fetchNotifications])

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PUT" })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {}
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications/read-all", { method: "PUT" })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {}
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r transition-transform lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navigasi utama"
      >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link href="/dashboard" className="font-bold text-lg tracking-tight flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
            e-Kendali Dosen
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-md p-1 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tutup menu navigasi"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {menus.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground border-l-2 border-l-primary-foreground/50"
                    : "text-gray-600 hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="flex items-center gap-2 min-w-0">
                  <div className="min-w-0">
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {(item as any).badge > 0 && (
                    <Badge className="ml-auto h-5 min-w-5 px-1.5 flex items-center justify-center text-xs">
                      {(item as any).badge}
                    </Badge>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Link
            href="/dashboard/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <User className="h-4 w-4 shrink-0" aria-hidden="true" />
            Profil
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden rounded-md p-1 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Buka menu navigasi"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex-1" />

          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Notifikasi"
              aria-expanded={notifOpen}
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <>
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                  <span className="sr-only">{unreadCount} notifikasi belum dibaca</span>
                </>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border rounded-lg shadow-lg shadow-black/5 z-50">
                <div className="p-3 border-b flex items-center justify-between">
                  <p className="font-semibold text-sm">Notifikasi</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      <CheckCheck className="h-3 w-3" aria-hidden="true" />
                      Baca semua
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifLoading ? (
                    <div className="p-6 text-center text-sm text-muted-foreground" aria-live="polite">
                      Memuat...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Tidak ada notifikasi
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={cn(
                          "w-full text-left p-3 border-b last:border-0 hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                          !n.isRead && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              {new Date(n.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                            </p>
                          </div>
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" aria-label="Belum dibaca" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium px-2 py-1 rounded-full", roleColors[user.role])}>
              {user.role}
            </span>
            <span className="text-sm font-medium hidden sm:block">{user.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label="Keluar"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 animate-fade-in-up" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
