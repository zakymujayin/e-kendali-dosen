"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
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
  ChevronDown,
  ClipboardList,
  BarChart3,
  Download,
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

const roleMenus: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
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
    { label: "MK Saya", href: "/dashboard/dosen/courses", icon: BookOpen },
    { label: "BAP", href: "/dashboard/dosen/bap", icon: FileText },
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
  user,
  children,
}: {
  user: UserData
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const menus = roleMenus[user.role] || roleMenus.DOSEN

  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-800",
    DOSEN: "bg-blue-100 text-blue-800",
    GKM: "bg-green-100 text-green-800",
    DEKANAT: "bg-purple-100 text-purple-800",
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r transition-transform lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link href="/dashboard" className="font-bold text-lg">
            BKD
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
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
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Link
            href="/dashboard/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          >
            <User className="h-4 w-4" />
            Profil
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100"
            >
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                0
              </Badge>
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg">
                <div className="p-3 border-b">
                  <p className="font-semibold text-sm">Notifikasi</p>
                </div>
                <div className="p-6 text-center text-sm text-gray-500">
                  Tidak ada notifikasi
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
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
