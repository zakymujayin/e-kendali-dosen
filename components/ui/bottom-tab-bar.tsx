"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { QrCode, LayoutDashboard, BookOpen } from "lucide-react"

const tabs = [
  { label: "Scan", href: "/scan", icon: QrCode },
  { label: "Beranda", href: "/dashboard/dosen", icon: LayoutDashboard },
  { label: "MK Saya", href: "/dashboard/dosen/courses", icon: BookOpen },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t bg-background lg:hidden">
      <div className="mx-auto flex h-full max-w-lg items-center">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && <span className="h-1 w-1 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
