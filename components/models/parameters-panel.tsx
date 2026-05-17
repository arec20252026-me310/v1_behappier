"use client"

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
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
  mlp: "MLP",
  cnn: "CNN",
  rnn: "RNN",
  lstm: "LSTM",
}

function formatSigFigs(value: number, sigFigs = 6): string {
  if (!isFinite(value)) return String(value)
  if (value === 0) return "0"
  return Number(value.toPrecision(sigFigs)).toString()
}

function flattenParameters(params: Record<string, unknown>): { name: string; value: string }[] {
  const rows: { name: string; value: string }[] = []
  for (const [key, val] of Object.entries(params)) {
    if (key === "weights" || key === "weightShapes" || key === "config" || key === "normalization") {
      continue // skip bulky NN internals entirely
    }
    if (key === "architecture") {
      rows.push({ name: "architecture", value: typeof val === "string" ? val : "[serialized]" })
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
  const trainingLoss = fitResult.trainingLoss ?? []
  const lossData = trainingLoss.map((loss, i) => ({ epoch: i + 1, loss }))

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

      {/* Training loss curve */}
      {lossData.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Training Loss</p>
          <div style={{ height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lossData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <XAxis
                  dataKey="epoch"
                  tick={{ fill: "#6b7280", fontSize: 9 }}
                  axisLine={{ stroke: "#374151" }}
                  tickLine={false}
                  tickCount={5}
                  label={{ value: "Epoch", position: "insideBottom", offset: -2, fill: "#6b7280", fontSize: 9 }}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 9 }}
                  axisLine={{ stroke: "#374151" }}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v: number) => v.toExponential(1)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const { epoch, loss } = payload[0].payload as { epoch: number; loss: number }
                    return (
                      <div style={{
                        background: "oklch(0.17 0.01 260)",
                        border: "1px solid oklch(0.28 0.01 260)",
                        borderRadius: "0.375rem",
                        padding: "4px 8px",
                        fontSize: 10,
                        color: "oklch(0.95 0 0)",
                      }}>
                        Epoch {epoch}: {loss.toExponential(3)}
                      </div>
                    )
                  }}
                />
                <Line
                  dataKey="loss"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
