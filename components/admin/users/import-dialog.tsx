"use client"

import { useState, useRef } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload")
  const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setStep("preview")
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const buffer = ev.target?.result as ArrayBuffer
      try {
        const { parseExcel } = await import("@/lib/excel")
        const rows = await parseExcel<Record<string, unknown>>(buffer)
        setPreview(rows.slice(0, 5))
      } catch {
        setPreview([])
      }
    }
    reader.readAsArrayBuffer(f)
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/users/import", { method: "POST", body: formData })
    const json = await res.json()
    setResult(json.data)
    setStep("result")
    setLoading(false)
  }

  function handleClose() {
    if (result?.created) onSuccess()
    onOpenChange(false)
    setTimeout(() => {
      setFile(null)
      setPreview([])
      setStep("upload")
      setResult(null)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import User dari Excel</DialogTitle>
          <DialogDescription>Upload file Excel dengan data user</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Klik untuk upload file Excel</p>
              <p className="text-xs text-muted-foreground mt-1">Format: .xlsx</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Download template terlebih dahulu jika belum punya format yang sesuai
            </p>
            <input ref={inputRef} type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" />
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium">{file?.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">Pratinjau (5 baris pertama):</p>
              <div className="rounded-md border bg-card max-h-48 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.length > 0 && Object.keys(preview[0]).map((key) => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j}>{String(val ?? "")}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>Ganti File</Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? "Mengimpor..." : "Konfirmasi Import"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm">Berhasil: <strong>{result.created}</strong> user</p>
              <p className="text-sm">Gagal: <strong>{result.failed}</strong> user</p>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border p-3">
                <p className="text-sm font-medium mb-1">Detail Error:</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">{err}</p>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Selesai</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
