import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { SkipLink } from "@/components/ui/skip-link"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "e-Kendali Dosen",
  description: "Sistem pencatatan realisasi perkuliahan berbasis web",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>",
  },
}

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <SkipLink />
        <Providers>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
