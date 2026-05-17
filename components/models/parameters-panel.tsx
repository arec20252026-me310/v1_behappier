"use client"

import type { FitResult } from "@/lib/model-fitting"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Download, Save } from "lucide-react"

interface ParametersPanelProps {
  fitResult: FitResult | null
  onSave: () => void
  onExportJson: () => void
  isSaving: boolean
}

const MODEL_LABELS: Record<string, string> = {
  linear: "Linear Regression",
  polynomial: "Polynomial",
  exponential: "Exponential",
  moving_average: "Moving Average",
}

function formatSigFigs(value: number, sigFigs = 6): string {
  if (!isFinite(value)) return String(value)
  if (value === 0) return "0"
  return Number(value.toPrecision(sigFigs)).toString()
}

function flattenParameters(params: Record<string, unknown>): { name: string; value: string }[] {
  const rows: { name: string; value: string }[] = []
  for (const [key, val] of Object.entries(params)) {
    if (key === "weights" || key === "weightShapes" || key === "architecture" || key === "config" || key === "normalization") {
      // Skip NN internals — too large to display in table
      rows.push({ name: key, value: typeof val === "string" ? val : "[serialized]" })
    } else if (Array.isArray(val)) {
      const arr = val as number[]
      if (arr.length <= 8) {
        arr.forEach((v, i) => {
          rows.push({ name: `${key}[${i}]`, value: typeof v === "number" ? formatSigFigs(v) : String(v) })
        })
      } else {
        rows.push({ name: key, value: `[${arr.length} values]` })
      }
    } else if (typeof val === "number") {
      rows.push({ name: key, value: formatSigFigs(val) })
    } else {
      rows.push({ name: key, value: String(val) })
    }
  }
  return rows
}

export function ParametersPanel({ fitResult, onSave, onExportJson, isSaving }: ParametersPanelProps) {
  if (!fitResult) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Fit a model to see parameters and metrics here.
      </div>
    )
  }

  const paramRows = flattenParameters(fitResult.parameters)
  const { r2, rmse, mse } = fitResult.metrics

  return (
    <div className="space-y-4">
      {/* Model badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{MODEL_LABELS[fitResult.modelType] ?? fitResult.modelType}</Badge>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "R²", value: formatSigFigs(r2) },
          { label: "RMSE", value: formatSigFigs(rmse) },
          { label: "MSE", value: formatSigFigs(mse) },
        ].map((m) => (
          <div key={m.label} className="bg-muted/40 rounded-md px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">{m.label}</p>
            <p className="text-sm font-mono font-medium text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Parameters table */}
      <div className="border border-border rounded-md overflow-hidden">
        <table className="text-sm w-full border-collapse">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Parameter</th>
              <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {paramRows.map((row, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{row.name}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-foreground">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExportJson} className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Export JSON
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving} className="flex-1">
          {isSaving ? (
            <Spinner className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save to Database
        </Button>
      </div>
    </div>
  )
}
