"use client"

import { useState, useCallback } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/client"
import { DatasetUploader, type ParsedDataset } from "./dataset-uploader"
import { ModelChart, FitEntry, FIT_COLORS } from "./model-chart"
import { ParametersPanel } from "./parameters-panel"
import {
  fitLinear,
  fitPolynomial,
  fitExponential,
  fitMovingAverage,
  type ModelType,
  type FitResult,
} from "@/lib/model-fitting"
import type { NNConfig, NNModelType } from "@/lib/tf-fitting"
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
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface BEStudy {
  study_id: string
  study_goal: string
  status: string
  created_at: string
  metadata: Record<string, unknown>
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

const NN_MODEL_TYPES: ModelType[] = ["mlp", "cnn", "rnn", "lstm"]

// Select values for model type dropdown (includes poly-degree variants)
type ModelSelectValue =
  | "linear"
  | "polynomial_2"
  | "polynomial_3"
  | "polynomial_4"
  | "exponential"
  | "moving_average"
  | "mlp"
  | "cnn"
  | "rnn"
  | "lstm"

const MODEL_OPTIONS: { value: ModelSelectValue; label: string }[] = [
  { value: "linear", label: "Linear Regression" },
  { value: "polynomial_2", label: "Polynomial (deg 2)" },
  { value: "polynomial_3", label: "Polynomial (deg 3)" },
  { value: "polynomial_4", label: "Polynomial (deg 4)" },
  { value: "exponential", label: "Exponential" },
  { value: "moving_average", label: "Moving Average" },
  { value: "mlp", label: "MLP" },
  { value: "cnn", label: "CNN" },
  { value: "rnn", label: "RNN" },
  { value: "lstm", label: "LSTM" },
]

function selectValueToModelType(v: ModelSelectValue): ModelType {
  if (v.startsWith("polynomial")) return "polynomial"
  return v as ModelType
}

function selectValueToPolyDegree(v: ModelSelectValue): number {
  if (v === "polynomial_2") return 2
  if (v === "polynomial_3") return 3
  if (v === "polynomial_4") return 4
  return 2
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseToNumber(val: unknown): number {
  if (typeof val === "number") return val
  if (typeof val === "string") {
    // HH:MM:SS or HH:MM → seconds since midnight
    const timeMatch = val.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (timeMatch) {
      const h = parseInt(timeMatch[1])
      const m = parseInt(timeMatch[2])
      const s = timeMatch[3] ? parseInt(timeMatch[3]) : 0
      return h * 3600 + m * 60 + s
    }
    // ISO date string → ms
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
  const [modelSelectValue, setModelSelectValue] = useState<ModelSelectValue>("linear")
  const modelType: ModelType = selectValueToModelType(modelSelectValue)
  const [polyDegree, setPolyDegree] = useState<number>(2)
  const [maWindow, setMaWindow] = useState<number>(5)

  // Neural network config state
  const [nnConfig, setNNConfig] = useState<NNConfig>({
    epochs: 100,
    learningRate: 0.01,
    windowSize: 8,
    hiddenUnits: 32,
    numLayers: 2,
  })
  const [trainingProgress, setTrainingProgress] = useState<{
    epoch: number
    totalEpochs: number
    loss: number
  } | null>(null)
  const [trainingLoss, setTrainingLoss] = useState<number[]>([])

  // Results state
  const [fitEntries, setFitEntries] = useState<FitEntry[]>([])
  const [isFitting, setIsFitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingDataset, setIsSavingDataset] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const [isLoadingStudy, setIsLoadingStudy] = useState(false)

  // ── Load behavior data from a paired microstudy ──────────────────────────────

  async function handleLoadFromStudy() {
    if (selectedStudyId === "none") return
    setIsLoadingStudy(true)
    setStatusMsg("Loading behavior data…")

    try {
      const supabase = createClient()
      const { data: outputs, error } = await supabase
        .from("BE_insight_outputs")
        .select("charts")
        .eq("study_id", selectedStudyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error || !outputs) throw new Error("No insight outputs found for this study.")

      const charts = Array.isArray(outputs.charts) ? outputs.charts : []
      const lineCharts = charts.filter(
        (c: Record<string, unknown>) => c.chart_type === "line"
      ) as Array<{
        title: string
        data: { labels: string[]; values: (number | null)[] }
      }>

      if (lineCharts.length === 0) throw new Error("No time series data found in study insights.")

      // Build a merged dataset: timestamp + one column per series
      const allLabels = Array.from(
        new Set(lineCharts.flatMap((c) => c.data.labels))
      ).sort()

      const seriesNames = lineCharts.map((c) => c.title)
      const rows: Record<string, string | number>[] = allLabels.map((label) => {
        const row: Record<string, string | number> = { timestamp: label }
        for (const chart of lineCharts) {
          const idx = chart.data.labels.indexOf(label)
          const val = idx >= 0 ? chart.data.values[idx] : null
          row[chart.title] = val !== null && val !== undefined ? val : ""
        }
        return row
      })

      const studyName = studies.find((s) => s.study_id === selectedStudyId)
      const title = studyName
        ? ((studyName.metadata?.study_name as string) || studyName.study_goal).slice(0, 30)
        : selectedStudyId.slice(0, 12)

      const parsed: ParsedDataset = {
        filename: `${title} (behavior)`,
        columns: ["timestamp", ...seriesNames],
        rows,
      }

      setActiveDataset(parsed)
      setSavedDatasetId(null)
      setDatasetName(parsed.filename)
      setXColumn("timestamp")
      setYColumn(seriesNames[0] ?? "")
      setStatusMsg(`Loaded ${rows.length} rows from study behavior data.`)
      setTimeout(() => setStatusMsg(null), 3000)
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to load study data.")
    } finally {
      setIsLoadingStudy(false)
    }
  }

  // ── Dataset parsed ──────────────────────────────────────────────────────────

  const handleDataParsed = useCallback((dataset: ParsedDataset) => {
    setActiveDataset(dataset)
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
    if (ds.columns.length >= 1) setXColumn(ds.columns[0])
    if (ds.columns.length >= 2) setYColumn(ds.columns[1])
    if (ds.study_id) setSelectedStudyId(ds.study_id)
    setStatusMsg("Dataset loaded.")
    setTimeout(() => setStatusMsg(null), 2500)
  }

  // ── Fit model ───────────────────────────────────────────────────────────────

  async function handleFitModel() {
    if (!activeDataset || !xColumn || !yColumn) return
    setIsFitting(true)
    setTrainingLoss([])
    setTrainingProgress(null)

    try {
      const rawX = extractNumericColumn(activeDataset.rows, xColumn)
      const rawY = extractNumericColumn(activeDataset.rows, yColumn)

      const validPairs = rawX
        .map((x, i) => ({ x, y: rawY[i] }))
        .filter((p) => isFinite(p.x) && isFinite(p.y))

      if (validPairs.length < 2) {
        setStatusMsg("Not enough valid numeric data points to fit a model.")
        setIsFitting(false)
        return
      }

      const xVals = toRelativeSeconds(validPairs.map((p) => p.x))
      const yVals = validPairs.map((p) => p.y)

      let result: FitResult

      if (NN_MODEL_TYPES.includes(modelType)) {
        const { fitNeuralNetwork } = await import("@/lib/tf-fitting")
        setTrainingProgress({ epoch: 0, totalEpochs: nnConfig.epochs, loss: 0 })
        const nnResult = await fitNeuralNetwork(
          modelType as NNModelType,
          xVals,
          yVals,
          nnConfig,
          (epoch, loss) => {
            setTrainingProgress({ epoch, totalEpochs: nnConfig.epochs, loss })
          }
        )
        setTrainingLoss(nnResult.trainingLoss)
        setTrainingProgress(null)
        result = {
          modelType: nnResult.modelType,
          parameters: {
            architecture: nnResult.parameters.architecture,
            weights: nnResult.parameters.weights as unknown as number[],
            weightShapes: nnResult.parameters.weightShapes as unknown as number[],
            normalization: nnResult.parameters.normalization,
            config: nnResult.parameters.config as unknown as number,
          },
          metrics: nnResult.metrics,
          predictedY: nnResult.predictedY,
          trainingLoss: nnResult.trainingLoss,
        }
      } else {
        switch (modelType) {
          case "linear":
            result = fitLinear(xVals, yVals)
            break
          case "polynomial":
            result = fitPolynomial(xVals, yVals, polyDegree)
            break
          case "exponential":
            result = fitExponential(xVals, yVals)
            break
          case "moving_average":
            result = fitMovingAverage(xVals, yVals, maWindow)
            break
          default:
            result = fitLinear(xVals, yVals)
        }
      }

      const label = MODEL_OPTIONS.find((m) => m.value === modelSelectValue)?.label ?? modelSelectValue
      const newEntry: FitEntry = {
        id: crypto.randomUUID(),
        label,
        color: FIT_COLORS[fitEntries.length % FIT_COLORS.length],
        visible: true,
        xValues: xVals,
        yValues: yVals,
        fitResult: result,
      }
      setFitEntries((prev) => [...prev, newEntry])
      setStatusMsg(null)
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Fitting failed")
      setTrainingProgress(null)
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
    const lastEntry = fitEntries[fitEntries.length - 1]
    if (!lastEntry || !savedDatasetId) {
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
      lastEntry.label,
      lastEntry.fitResult.modelType,
      config,
      lastEntry.fitResult.parameters as Record<string, unknown>,
      lastEntry.fitResult.metrics as Record<string, unknown>
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
    const lastEntry = fitEntries[fitEntries.length - 1]
    if (!lastEntry) return
    const { fitResult } = lastEntry
    const isNN = NN_MODEL_TYPES.includes(fitResult.modelType)
    const content = isNN
      ? JSON.stringify(
          {
            modelType: fitResult.modelType,
            architecture: fitResult.parameters.architecture,
            config: fitResult.parameters.config,
            weights: fitResult.parameters.weights,
            weightShapes: fitResult.parameters.weightShapes,
            normalization: fitResult.parameters.normalization,
            metrics: fitResult.metrics,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        )
      : JSON.stringify(
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

  // ── Toggle / remove fit entries ──────────────────────────────────────────────

  function handleToggleEntry(id: string) {
    setFitEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e))
    )
  }

  function handleRemoveEntry(id: string) {
    setFitEntries((prev) => prev.filter((e) => e.id !== id))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const columns = activeDataset?.columns ?? []
  const lastEntry = fitEntries[fitEntries.length - 1] ?? null
  // Scatter source: use the last entry's raw values, or the active dataset columns
  const chartXValues = lastEntry?.xValues ?? []
  const chartYValues = lastEntry?.yValues ?? []

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
                    {studies.map((s) => {
                      const title = (s.metadata?.study_name as string) || s.study_goal
                      return (
                        <SelectItem key={s.study_id} value={s.study_id}>
                          <span className="truncate max-w-[240px]">
                            {title.length > 40 ? title.slice(0, 40) + "…" : title}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {selectedStudyId !== "none" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-1"
                    onClick={handleLoadFromStudy}
                    disabled={isLoadingStudy}
                  >
                    {isLoadingStudy ? (
                      <Spinner className="h-4 w-4 mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Load behavior data from study
                  </Button>
                )}
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
                <Select value={modelSelectValue} onValueChange={(v) => setModelSelectValue(v as ModelSelectValue)}>
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
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Chart</CardTitle>
              {fitEntries.length > 0 && (
                <button
                  onClick={() => setFitEntries([])}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              )}
            </CardHeader>
            <CardContent>
              <ModelChart
                xValues={chartXValues}
                yValues={chartYValues}
                fitEntries={fitEntries}
                onToggle={handleToggleEntry}
                onRemove={handleRemoveEntry}
                xLabel={xColumn || undefined}
                yLabel={yColumn || undefined}
              />
            </CardContent>
          </Card>

          {/* Parameters — shows most recent fit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Parameters &amp; Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ParametersPanel
                fitResult={lastEntry?.fitResult ?? null}
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
