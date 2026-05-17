"use client"

import { useState, useCallback } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { DatasetUploader, type ParsedDataset } from "./dataset-uploader"
import { ModelChart } from "./model-chart"
import { ParametersPanel } from "./parameters-panel"
import {
  fitLinear,
  fitPolynomial,
  fitExponential,
  fitMovingAverage,
  type ModelType,
  type FitResult,
} from "@/lib/model-fitting"
import { saveDataset, saveModelFit, deleteDataset } from "@/app/actions/models"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BrainCircuit,
  FileDown,
  Trash2,
  FolderOpen,
  TrendingUp,
  Database,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface BEStudy {
  study_id: string
  study_goal: string
  status: string
  created_at: string
}

interface SavedDataset {
  id: string
  name: string
  study_id: string | null
  columns: string[]
  data: Record<string, unknown>[]
  metadata: Record<string, unknown>
  created_at: string
}

interface ModelsManagerProps {
  studies: BEStudy[]
  datasets: SavedDataset[]
}

const MODEL_OPTIONS: { value: ModelType; label: string }[] = [
  { value: "linear", label: "Linear Regression" },
  { value: "polynomial", label: "Polynomial" },
  { value: "exponential", label: "Exponential" },
  { value: "moving_average", label: "Moving Average" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseToNumber(val: unknown): number {
  if (typeof val === "number") return val
  if (typeof val === "string") {
    // Try ISO date string → ms offset
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.getTime()
    const n = Number(val)
    if (!isNaN(n)) return n
  }
  return NaN
}

function extractNumericColumn(rows: Record<string, string | number>[], col: string): number[] {
  return rows.map((r) => parseToNumber(r[col]))
}

function toRelativeSeconds(xs: number[]): number[] {
  const valid = xs.filter((v) => isFinite(v))
  if (valid.length === 0) return xs
  const t0 = Math.min(...valid)
  // If values look like Unix ms timestamps (> 1e12), convert to relative seconds
  if (t0 > 1e12) return xs.map((x) => (x - t0) / 1000)
  // If already small numbers, return as-is (already seconds or indices)
  return xs
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ModelsManager({ studies, datasets: initialDatasets }: ModelsManagerProps) {
  const [savedDatasets, setSavedDatasets] = useState<SavedDataset[]>(initialDatasets)

  // Dataset state
  const [activeDataset, setActiveDataset] = useState<ParsedDataset | null>(null)
  const [savedDatasetId, setSavedDatasetId] = useState<string | null>(null)
  const [datasetName, setDatasetName] = useState("")

  // Config state
  const [selectedStudyId, setSelectedStudyId] = useState<string>("none")
  const [xColumn, setXColumn] = useState<string>("")
  const [yColumn, setYColumn] = useState<string>("")
  const [modelType, setModelType] = useState<ModelType>("linear")
  const [polyDegree, setPolyDegree] = useState<number>(2)
  const [maWindow, setMaWindow] = useState<number>(5)

  // Results state
  const [fitResult, setFitResult] = useState<FitResult | null>(null)
  const [xValues, setXValues] = useState<number[]>([])
  const [yValues, setYValues] = useState<number[]>([])
  const [isFitting, setIsFitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingDataset, setIsSavingDataset] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // ── Dataset parsed ──────────────────────────────────────────────────────────

  const handleDataParsed = useCallback((dataset: ParsedDataset) => {
    setActiveDataset(dataset)
    setFitResult(null)
    setXValues([])
    setYValues([])
    setSavedDatasetId(null)
    setDatasetName(dataset.filename.replace(/\.[^.]+$/, ""))
    // Auto-select first two columns
    if (dataset.columns.length >= 1) setXColumn(dataset.columns[0])
    if (dataset.columns.length >= 2) setYColumn(dataset.columns[1])
  }, [])

  // ── Load saved dataset ──────────────────────────────────────────────────────

  function loadSavedDataset(ds: SavedDataset) {
    const parsed: ParsedDataset = {
      filename: ds.name,
      columns: ds.columns,
      rows: ds.data as Record<string, string | number>[],
    }
    setActiveDataset(parsed)
    setSavedDatasetId(ds.id)
    setDatasetName(ds.name)
    setFitResult(null)
    setXValues([])
    setYValues([])
    if (ds.columns.length >= 1) setXColumn(ds.columns[0])
    if (ds.columns.length >= 2) setYColumn(ds.columns[1])
    if (ds.study_id) setSelectedStudyId(ds.study_id)
    setStatusMsg("Dataset loaded.")
    setTimeout(() => setStatusMsg(null), 2500)
  }

  // ── Fit model ───────────────────────────────────────────────────────────────

  function handleFitModel() {
    if (!activeDataset || !xColumn || !yColumn) return
    setIsFitting(true)
    setFitResult(null)

    try {
      const rawX = extractNumericColumn(activeDataset.rows, xColumn)
      const rawY = extractNumericColumn(activeDataset.rows, yColumn)

      // Filter valid pairs
      const validPairs = rawX
        .map((x, i) => ({ x, y: rawY[i] }))
        .filter((p) => isFinite(p.x) && isFinite(p.y))

      if (validPairs.length < 2) {
        setStatusMsg("Not enough valid numeric data points to fit a model.")
        setIsFitting(false)
        return
      }

      const xs = toRelativeSeconds(validPairs.map((p) => p.x))
      const ys = validPairs.map((p) => p.y)

      let result: FitResult
      switch (modelType) {
        case "linear":
          result = fitLinear(xs, ys)
          break
        case "polynomial":
          result = fitPolynomial(xs, ys, polyDegree)
          break
        case "exponential":
          result = fitExponential(xs, ys)
          break
        case "moving_average":
          result = fitMovingAverage(xs, ys, maWindow)
          break
        default:
          result = fitLinear(xs, ys)
      }

      setXValues(xs)
      setYValues(ys)
      setFitResult(result)
      setStatusMsg(null)
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Fitting failed")
    } finally {
      setIsFitting(false)
    }
  }

  // ── Save dataset to Supabase ─────────────────────────────────────────────────

  async function handleSaveDataset() {
    if (!activeDataset) return
    setIsSavingDataset(true)
    const { id, error } = await saveDataset(
      datasetName || activeDataset.filename,
      selectedStudyId === "none" ? null : selectedStudyId,
      activeDataset.columns,
      activeDataset.rows as Record<string, unknown>[],
      { source: activeDataset.filename, rowCount: activeDataset.rows.length }
    )
    setIsSavingDataset(false)
    if (error) {
      setStatusMsg(`Error: ${error}`)
    } else {
      setSavedDatasetId(id ?? null)
      setStatusMsg("Dataset saved.")
      // Refresh local list
      const newDs: SavedDataset = {
        id: id!,
        name: datasetName || activeDataset.filename,
        study_id: selectedStudyId === "none" ? null : selectedStudyId,
        columns: activeDataset.columns,
        data: activeDataset.rows as Record<string, unknown>[],
        metadata: { source: activeDataset.filename, rowCount: activeDataset.rows.length },
        created_at: new Date().toISOString(),
      }
      setSavedDatasets((prev) => [newDs, ...prev])
      setTimeout(() => setStatusMsg(null), 2500)
    }
  }

  // ── Save model fit ──────────────────────────────────────────────────────────

  async function handleSaveModelFit() {
    if (!fitResult || !savedDatasetId) {
      setStatusMsg("Please save the dataset first before saving a model fit.")
      return
    }
    setIsSaving(true)
    const config: Record<string, unknown> = { xColumn, yColumn }
    if (modelType === "polynomial") config.degree = polyDegree
    if (modelType === "moving_average") config.window = maWindow

    const { error } = await saveModelFit(
      savedDatasetId,
      selectedStudyId === "none" ? null : selectedStudyId,
      `${MODEL_OPTIONS.find((m) => m.value === modelType)?.label} fit`,
      modelType,
      config,
      fitResult.parameters as Record<string, unknown>,
      fitResult.metrics as Record<string, unknown>
    )
    setIsSaving(false)
    if (error) {
      setStatusMsg(`Error: ${error}`)
    } else {
      setStatusMsg("Model fit saved.")
      setTimeout(() => setStatusMsg(null), 2500)
    }
  }

  // ── Export JSON ─────────────────────────────────────────────────────────────

  function handleExportJson() {
    if (!fitResult) return
    const content = JSON.stringify(
      {
        modelType: fitResult.modelType,
        parameters: fitResult.parameters,
        metrics: fitResult.metrics,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    )
    downloadBlob(content, `model-fit-${fitResult.modelType}.json`, "application/json")
  }

  // ── Export dataset as CSV ────────────────────────────────────────────────────

  function handleExportCsv(ds: SavedDataset) {
    const csv = Papa.unparse(ds.data as object[])
    downloadBlob(csv, `${ds.name}.csv`, "text/csv")
  }

  // ── Export dataset as Excel ──────────────────────────────────────────────────

  function handleExportExcel(ds: SavedDataset) {
    const ws = XLSX.utils.json_to_sheet(ds.data as object[])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data")
    XLSX.writeFile(wb, `${ds.name}.xlsx`)
  }

  // ── Delete dataset ───────────────────────────────────────────────────────────

  async function handleDeleteDataset(id: string) {
    const { error } = await deleteDataset(id)
    if (error) {
      setStatusMsg(`Error: ${error}`)
    } else {
      setSavedDatasets((prev) => prev.filter((d) => d.id !== id))
      if (savedDatasetId === id) {
        setSavedDatasetId(null)
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const columns = activeDataset?.columns ?? []

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {statusMsg && (
        <div className="bg-primary/10 border border-primary/30 rounded-md px-4 py-2 text-sm text-primary">
          {statusMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column: upload + config ── */}
        <div className="space-y-4">
          {/* Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Dataset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DatasetUploader onDataParsed={handleDataParsed} />

              {activeDataset && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Dataset Name</Label>
                    <Input
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      placeholder="Name this dataset…"
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleSaveDataset}
                    disabled={isSavingDataset}
                  >
                    {isSavingDataset ? (
                      <Spinner className="h-4 w-4 mr-2" />
                    ) : (
                      <Database className="h-4 w-4 mr-2" />
                    )}
                    {savedDatasetId ? "Dataset Saved" : "Save Dataset"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configure */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Configure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Study pairing */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pair with Micro-Study</Label>
                <Select value={selectedStudyId} onValueChange={setSelectedStudyId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select study (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {studies.map((s) => (
                      <SelectItem key={s.study_id} value={s.study_id}>
                        <span className="truncate max-w-[240px]">
                          {s.study_goal.length > 40
                            ? s.study_goal.slice(0, 40) + "…"
                            : s.study_goal}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Column selects */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">X-Axis (time / index)</Label>
                  <Select
                    value={xColumn}
                    onValueChange={setXColumn}
                    disabled={columns.length === 0}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Y-Axis (value)</Label>
                  <Select
                    value={yColumn}
                    onValueChange={setYColumn}
                    disabled={columns.length === 0}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Model type */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Model Type</Label>
                <Select value={modelType} onValueChange={(v) => setModelType(v as ModelType)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Polynomial degree */}
              {modelType === "polynomial" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Polynomial Degree</Label>
                  <Select
                    value={String(polyDegree)}
                    onValueChange={(v) => setPolyDegree(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Degree {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Moving average window */}
              {modelType === "moving_average" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Window Size</Label>
                  <Input
                    type="number"
                    min={2}
                    max={200}
                    value={maWindow}
                    onChange={(e) => setMaWindow(Math.max(2, Number(e.target.value)))}
                    className="h-8 text-sm"
                  />
                </div>
              )}

              {/* Fit button */}
              <Button
                className="w-full"
                onClick={handleFitModel}
                disabled={!activeDataset || !xColumn || !yColumn || isFitting}
              >
                {isFitting ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <BrainCircuit className="h-4 w-4 mr-2" />
                )}
                Fit Model
              </Button>
            </CardContent>
          </Card>

          {/* Saved datasets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Saved Datasets
                {savedDatasets.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {savedDatasets.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedDatasets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No datasets saved yet.
                </p>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {savedDatasets.map((ds) => (
                      <div
                        key={ds.id}
                        className={cn(
                          "flex items-start gap-2 p-2.5 rounded-md border border-border bg-card hover:bg-muted/30 transition-colors",
                          savedDatasetId === ds.id && "border-primary/40 bg-primary/5"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ds.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ds.columns.length} cols · {(ds.data as unknown[]).length.toLocaleString()} rows
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Load"
                            onClick={() => loadSavedDataset(ds)}
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Export CSV"
                            onClick={() => handleExportCsv(ds)}
                          >
                            <FileDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Export Excel"
                            onClick={() => handleExportExcel(ds)}
                          >
                            <FileDown className="h-3.5 w-3.5 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            title="Delete"
                            onClick={() => handleDeleteDataset(ds.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: chart + parameters ── */}
        <div className="space-y-4">
          {/* Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelChart
                xValues={xValues}
                yValues={yValues}
                fitResult={fitResult}
                xLabel={xColumn || undefined}
                yLabel={yColumn || undefined}
              />
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Parameters &amp; Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ParametersPanel
                fitResult={fitResult}
                onSave={handleSaveModelFit}
                onExportJson={handleExportJson}
                isSaving={isSaving}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
