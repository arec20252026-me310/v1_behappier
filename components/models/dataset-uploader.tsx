"use client"

import React, { useRef, useState } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ParsedDataset {
  filename: string
  columns: string[]
  rows: Record<string, string | number>[]
}

interface DatasetUploaderProps {
  onDataParsed: (dataset: ParsedDataset) => void
}

export function DatasetUploader({ onDataParsed }: DatasetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedDataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFile(file: File) {
    setError(null)
    const ext = file.name.split(".").pop()?.toLowerCase()

    if (ext === "csv") {
      Papa.parse<Record<string, string | number>>(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length > 0 && result.data.length === 0) {
            setError(`Parse error: ${result.errors[0].message}`)
            return
          }
          const columns = result.meta.fields ?? []
          const dataset: ParsedDataset = { filename: file.name, columns, rows: result.data }
          setParsed(dataset)
          onDataParsed(dataset)
        },
        error: (err) => setError(err.message),
      })
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const wb = XLSX.read(data, { type: "array" })
          const sheetName = wb.SheetNames[0]
          const ws = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, {
            defval: "",
            raw: false,
          })
          const columns = rows.length > 0 ? Object.keys(rows[0]) : []
          const dataset: ParsedDataset = { filename: file.name, columns, rows }
          setParsed(dataset)
          onDataParsed(dataset)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse Excel file")
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      setError("Unsupported file type. Please upload a .csv, .xlsx, or .xls file.")
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-uploaded
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function clearDataset() {
    setParsed(null)
    setError(null)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleInputChange}
        />
        <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          Drag and drop a file here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mb-3">Supports .csv, .xlsx, .xls</p>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Choose File
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Preview */}
      {parsed && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground truncate">{parsed.filename}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {parsed.rows.length.toLocaleString()} rows · {parsed.columns.length} columns
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clearDataset}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Column pills */}
          <div className="flex flex-wrap gap-1.5">
            {parsed.columns.map((col) => (
              <span
                key={col}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground border border-border"
              >
                {col}
              </span>
            ))}
          </div>

          {/* Mini preview table */}
          {parsed.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr>
                    {parsed.columns.slice(0, 6).map((col) => (
                      <th
                        key={col}
                        className="text-left px-2 py-1 border-b border-border text-muted-foreground font-medium whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                    {parsed.columns.length > 6 && (
                      <th className="text-left px-2 py-1 border-b border-border text-muted-foreground font-medium">
                        +{parsed.columns.length - 6} more
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      {parsed.columns.slice(0, 6).map((col) => (
                        <td key={col} className="px-2 py-1 text-foreground/80 whitespace-nowrap max-w-[120px] truncate">
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                      {parsed.columns.length > 6 && <td className="px-2 py-1 text-muted-foreground">…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 5 && (
                <p className="text-xs text-muted-foreground mt-1 px-2">
                  Showing 5 of {parsed.rows.length.toLocaleString()} rows
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
