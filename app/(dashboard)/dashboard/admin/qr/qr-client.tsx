"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, Download } from "lucide-react"

interface Props {
  scanUrl: string
}

export function QrGeneratorClient({ scanUrl }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState("")

  useEffect(() => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(scanUrl, {
        width: 400,
        margin: 2,
        color: { dark: "#1e293b", light: "#ffffff" },
      }).then(setQrDataUrl)
    })
  }, [scanUrl])

  function handlePrint() {
    const win = window.open("")
    if (!win) return
    win.document.write(`
      <html>
      <head><title>QR Code e-Kendali Dosen</title></head>
      <body style="text-align:center;padding:40px;font-family:sans-serif;">
        <h2>🎓 e-Kendali Dosen</h2>
        <p style="color:#666;margin-bottom:24px;">Scan untuk mencatat perkuliahan hari ini</p>
        <img src="${qrDataUrl}" style="width:300px;height:300px;" />
        <p style="color:#999;font-size:12px;margin-top:24px;">${scanUrl}</p>
        <script>window.print();<\/script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="max-w-md space-y-6">
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          {qrDataUrl ? (
            <>
              <Image src={qrDataUrl} alt="QR Code Scan" width={192} height={192} className="mx-auto" />
              <p className="text-sm text-muted-foreground break-all">{scanUrl}</p>
            </>
          ) : (
            <div className="w-48 h-48 mx-auto bg-muted animate-pulse rounded" />
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Cetak Poster
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <a href={qrDataUrl} download="qr-e-kendali.png">
            <Download className="h-4 w-4 mr-2" /> Download PNG
          </a>
        </Button>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="py-4 text-sm text-muted-foreground space-y-1">
          <p>📌 Tempel QR ini di setiap ruang kelas.</p>
          <p>📱 Dosen scan → langsung ke form sesi hari ini.</p>
          <p>🔄 Satu QR untuk semua dosen dan semua kelas.</p>
        </CardContent>
      </Card>
    </div>
  )
}
