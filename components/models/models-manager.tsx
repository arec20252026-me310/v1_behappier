"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/client"
import { DatasetUploader, type ParsedDataset } from "./dataset-uploader"
import { ModelChart, FitEntry, FIT_COLORS } from "./model-chart"
import { ParametersPanel } from "./parameters-panel"
import {
  fitLinear,
  fitMultipleLinear,
  fitPolynomial,
  fitExponential,
  type ModelType,
  type FitResult,
} from "@/lib/model-fitting"
import type { NNConfig, NNModelType } from "@/lib/tf-fitting"
import { saveDataset, saveModelFit, deleteDataset } from "@/app/actions/models"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
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
  Database,
  Download,
  Merge,
  CheckCircle2,
  BarChart2,
  Sliders,
  ChevronDown,
  Info,
} from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface BEStudy {
  study_id: string
  study_goal: string
  status: string
  created_at: string
  metadata: Record<string, unknown>
}

export interface SavedDataset {
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
  // Optional demo pre-seed
  demoBehaviorDataset?: ParsedDataset
  demoSensorDataset?: ParsedDataset
  demoMergedDataset?: ParsedDataset
  demoFitEntries?: FitEntry[]
  demoChartX?: string
  demoChartY?: string
  demoSavedDatasetId?: string
  demoDatasetName?: string
  demoModelInputCols?: string[]
  demoModelOutputCol?: string
  demoSelectedStudyId?: string
}

const NN_MODEL_TYPES: ModelType[] = ["mlp", "cnn", "rnn", "lstm"]
const SINGLE_INPUT_ONLY: ModelType[] = ["polynomial", "exponential"]

type ModelSelectValue =
  | "linear"
  | "polynomial"
  | "exponential"
  | "mlp"
  | "cnn"
  | "rnn"
  | "lstm"

const MODEL_OPTIONS: { value: ModelSelectValue; label: string; tooltip: string }[] = [
  { value: "linear",      label: "Linear Regression", tooltip: "Fits a straight line (y = mx + b) between input and output. Best for data with a clear linear trend." },
  { value: "polynomial",  label: "Polynomial",        tooltip: "Fits a curved line (y = ax² + bx + c + …) to capture non-linear relationships. Higher degrees fit more complex curves." },
  { value: "exponential", label: "Exponential",       tooltip: "Fits a growth or decay curve (y = ae^(bx)). Useful when the output grows or shrinks at an increasing rate." },
  { value: "mlp",         label: "MLP",               tooltip: "Multi-Layer Perceptron — a feedforward neural network with fully-connected layers. Good for general non-linear relationships without temporal structure." },
  { value: "cnn",         label: "CNN",               tooltip: "Convolutional Neural Network — applies sliding filter windows to detect local patterns across the input sequence." },
  { value: "rnn",         label: "RNN",               tooltip: "Recurrent Neural Network — processes data step-by-step, retaining a hidden state to capture short-range temporal dependencies." },
  { value: "lstm",        label: "LSTM",              tooltip: "Long Short-Term Memory — an advanced RNN that uses memory cells and gating to capture both short and long-range patterns in time-series data." },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseToNumber(val: unknown): number {
  if (typeof val === "number") return val
  if (typeof val === "string") {
    const timeMatch = val.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (timeMatch) {
      const h = parseInt(timeMatch[1])
      const m = parseInt(timeMatch[2])
      const s = timeMatch[3] ? parseInt(timeMatch[3]) : 0
      return h * 3600 + m * 60 + s
    }
    const n = Number(val)
    if (!isNaN(n)) return n
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      // Normalize to seconds-since-midnight so all timestamp formats share the same scale
      return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
    }
  }
  return NaN
}

function extractNumericColumn(rows: Record<string, string | number>[], col: string): number[] {
  return rows.map((r) => parseToNumber(r[col]))
}

function toRelativeSeconds(xs: number[]): number[] {
  return xs
}

function isTimestampColumn(rows: Record<string, string | number>[], col: string): boolean {
  const firstVal = rows[0]?.[col]
  if (typeof firstVal !== "string") return false
  return /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test(firstVal) ||
         /^\d{4}-\d{2}-\d{2}/.test(firstVal)
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function mergeByTimestamp(
  sensorRows: Record<string, string | number>[],
  behaviorRows: Record<string, string | number>[],
  sensorTsCol: string,
  behaviorTsCol: string,
  toleranceSec: number
): Record<string, string | number>[] {
  const behaviorTimes = behaviorRows.map((r) => parseToNumber(r[behaviorTsCol]))
  const merged: Record<string, string | number>[] = []

  for (const sensorRow of sensorRows) {
    const sTs = parseToNumber(sensorRow[sensorTsCol])
    if (!isFinite(sTs)) continue
    let bestIdx = -1, bestDiff = Infinity
    for (let i = 0; i < behaviorTimes.length; i++) {
      const diff = Math.abs(behaviorTimes[i] - sTs)
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i }
    }
    if (bestIdx >= 0 && bestDiff <= toleranceSec) {
      const mergedRow: Record<string, string | number> = { ...sensorRow }
      for (const [key, val] of Object.entries(behaviorRows[bestIdx])) {
        if (key === behaviorTsCol) continue
        mergedRow[key] = val as string | number
      }
      merged.push(mergedRow)
    }
  }
  return merged
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ModelsManager({
  studies,
  datasets: initialDatasets,
  demoBehaviorDataset,
  demoSensorDataset,
  demoMergedDataset,
  demoFitEntries,
  demoChartX,
  demoChartY,
  demoSavedDatasetId,
  demoDatasetName,
  demoModelInputCols,
  demoModelOutputCol,
  demoSelectedStudyId,
}: ModelsManagerProps) {
  const [savedDatasets, setSavedDatasets] = useState<SavedDataset[]>(initialDatasets)

  // Data sources
  const [sensorDataset, setSensorDataset] = useState<ParsedDataset | null>(() => demoSensorDataset ?? null)
  const [behaviorDataset, setBehaviorDataset] = useState<ParsedDataset | null>(() => demoBehaviorDataset ?? null)
  const [mergedDataset, setMergedDataset] = useState<ParsedDataset | null>(() => demoMergedDataset ?? null)
  const [toleranceSec, setToleranceSec] = useState(30)
  const [isMerging, setIsMerging] = useState(false)
  const [savedDatasetId, setSavedDatasetId] = useState<string | null>(() => demoSavedDatasetId ?? null)
  const [datasetName, setDatasetName] = useState(() => demoDatasetName ?? "")

  const initialStudyId = demoSelectedStudyId
    ?? studies.find(s => s.status === "complete")?.study_id
    ?? studies[0]?.study_id
    ?? "none"
  const [selectedStudyId, setSelectedStudyId] = useState(() => initialStudyId)
  const [isLoadingStudy, setIsLoadingStudy] = useState(false)
  const autoLoaded = useRef(false)

  const activeDataset = mergedDataset ?? sensorDataset ?? behaviorDataset
  const canMerge = !!(sensorDataset && behaviorDataset)

  // Available columns (exclude timestamp cols from model inputs)
  const allCols = activeDataset?.columns ?? []
  const numericCols = activeDataset
    ? allCols.filter((c) => !isTimestampColumn(activeDataset.rows, c))
    : []

  // Chart axis selectors
  const [chartXCol, setChartXCol] = useState(() => demoChartX ?? "")
  const [chartYCol, setChartYCol] = useState(() => demoChartY ?? "")

  // Model builder
  const [modelInputCols, setModelInputCols] = useState<string[]>(() => demoModelInputCols ?? [])
  const [modelOutputCol, setModelOutputCol] = useState(() => demoModelOutputCol ?? "")
  const [modelSelectValue, setModelSelectValue] = useState<ModelSelectValue>("linear")
  const modelType: ModelType = modelSelectValue as ModelType
  const [polyDegree, setPolyDegree] = useState(2)
  const [nnConfig, setNNConfig] = useState<NNConfig>({
    epochs: 100, learningRate: 0.01, windowSize: 8, hiddenUnits: 32, numLayers: 2,
  })
  const [trainingProgress, setTrainingProgress] = useState<{ epoch: number; totalEpochs: number; loss: number } | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [trainingLoss, setTrainingLoss] = useState<number[]>([])

  // Results
  const [fitEntries, setFitEntries] = useState<FitEntry[]>(() => demoFitEntries ?? [])
  const [isFitting, setIsFitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingDataset, setIsSavingDataset] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // When new data loads, reset column selections
  function resetColumnSelections(cols: string[], rows: Record<string, string | number>[]) {
    const numCols = cols.filter((c) => !isTimestampColumn(rows, c))
    const tsCols = cols.filter((c) => isTimestampColumn(rows, c))
    setChartXCol(tsCols[0] ?? numCols[0] ?? "")
    setChartYCol(numCols[0] ?? "")
    setModelInputCols(numCols.slice(0, 1))
    setModelOutputCol(numCols[numCols.length - 1] ?? "")
  }

  // ── Auto-load most recent study on mount ─────────────────────────────────────

  useEffect(() => {
    if (autoLoaded.current) return
    if (demoSelectedStudyId || demoBehaviorDataset || demoMergedDataset) return
    if (initialStudyId === "none") return
    autoLoaded.current = true
    handleLoadFromStudy()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load behavior data ────────────────────────────────────────────────────────

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
      ) as Array<{ title: string; data: { labels: string[]; values: (number | null)[] } }>

      if (lineCharts.length === 0) throw new Error("No time series data found in study insights.")

      const allLabels = Array.from(new Set(lineCharts.flatMap((c) => c.data.labels))).sort()
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

      const study = studies.find((s) => s.study_id === selectedStudyId)
      const title = study
        ? ((study.metadata?.study_name as string) || study.study_goal).slice(0, 30)
        : selectedStudyId.slice(0, 12)

      const parsed: ParsedDataset = {
        filename: `${title} (behavior)`,
        columns: ["timestamp", ...seriesNames],
        rows,
      }

      setBehaviorDataset(parsed)
      setMergedDataset(null)
      setSavedDatasetId(null)
      if (!sensorDataset) resetColumnSelections(parsed.columns, parsed.rows)
      setStatusMsg(`Loaded ${rows.length} behavior rows.${sensorDataset ? " Ready to merge." : ""}`)
      setTimeout(() => setStatusMsg(null), 3000)
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to load study data.")
    } finally {
      setIsLoadingStudy(false)
    }
  }

  // ── Load sensor data from file ────────────────────────────────────────────────

  const handleDataParsed = useCallback((dataset: ParsedDataset) => {
    setSensorDataset(dataset)
    setMergedDataset(null)
    setSavedDatasetId(null)
    if (!behaviorDataset) resetColumnSelections(dataset.columns, dataset.rows)
  }, [behaviorDataset]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Merge ─────────────────────────────────────────────────────────────────────

  function handleMerge() {
    if (!sensorDataset || !behaviorDataset) return
    setIsMerging(true)
    const sensorTsCol = sensorDataset.columns[0]
    const behaviorTsCol = behaviorDataset.columns[0]
    const behaviorNonTsCols = behaviorDataset.columns.filter((c) => c !== behaviorTsCol)

    const merged = mergeByTimestamp(
      sensorDataset.rows, behaviorDataset.rows,
      sensorTsCol, behaviorTsCol, toleranceSec
    )

    if (merged.length === 0) {
      setStatusMsg(`No pairs within ±${toleranceSec}s. Try increasing the tolerance.`)
      setIsMerging(false)
      return
    }

    const mergedColumns = [...sensorDataset.columns, ...behaviorNonTsCols]
    const mergedParsed: ParsedDataset = {
      filename: `${sensorDataset.filename.replace(/\.[^.]+$/, "")} × behavior`,
      columns: mergedColumns,
      rows: merged,
    }

    setMergedDataset(mergedParsed)
    setSavedDatasetId(null)
    setDatasetName(mergedParsed.filename)
    resetColumnSelections(mergedColumns, merged)
    setStatusMsg(`Merged: ${merged.length} of ${sensorDataset.rows.length} sensor readings matched.`)
    setTimeout(() => setStatusMsg(null), 4000)
    setIsMerging(false)
  }

  // ── Load saved dataset ────────────────────────────────────────────────────────

  function loadSavedDataset(ds: SavedDataset) {
    const parsed: ParsedDataset = {
      filename: ds.name,
      columns: ds.columns,
      rows: ds.data as Record<string, string | number>[],
    }
    setSensorDataset(parsed)
    setBehaviorDataset(null)
    setMergedDataset(null)
    setSavedDatasetId(ds.id)
    setDatasetName(ds.name)
    resetColumnSelections(ds.columns, parsed.rows)
    if (ds.study_id) setSelectedStudyId(ds.study_id)
    setStatusMsg("Dataset loaded.")
    setTimeout(() => setStatusMsg(null), 2500)
  }

  // ── Toggle model input column ─────────────────────────────────────────────────

  function toggleInputCol(col: string) {
    const isSingleInputModel = SINGLE_INPUT_ONLY.includes(modelType)
    if (isSingleInputModel) {
      setModelInputCols([col])
      return
    }
    setModelInputCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  // ── Fit model ─────────────────────────────────────────────────────────────────

  async function handleFitModel() {
    if (!activeDataset || modelInputCols.length === 0 || !modelOutputCol) return
    setIsFitting(true)
    setTrainingLoss([])
    setTrainingProgress(null)

    try {
      const rawY = extractNumericColumn(activeDataset.rows, modelOutputCol)
      const rawXs = modelInputCols.map((col) => extractNumericColumn(activeDataset.rows, col))

      // Filter to rows where all inputs and output are finite
      const validIdx = rawY
        .map((y, i) => ({ i, y, xs: rawXs.map((col) => col[i]) }))
        .filter((p) => isFinite(p.y) && p.xs.every(isFinite))

      if (validIdx.length < 2) {
        setStatusMsg("Not enough valid data points.")
        setIsFitting(false)
        return
      }

      const yVals = validIdx.map((p) => p.y)
      // Convert each X column to relative seconds if it looks like time
      const xValsCols = rawXs.map((col, ci) => {
        const vals = validIdx.map((p) => p.xs[ci])
        return toRelativeSeconds(vals)
      })

      let result: FitResult

      const isSingleInput = SINGLE_INPUT_ONLY.includes(modelType) || xValsCols.length === 1
      const xVals = xValsCols[0]  // primary input (used for single-input models)

      if (NN_MODEL_TYPES.includes(modelType)) {
        const { fitNeuralNetwork } = await import("@/lib/tf-fitting")
        // Build feature matrix [n_samples, n_features]
        const xsMatrix = validIdx.map((p) => p.xs)
        setTrainingProgress({ epoch: 0, totalEpochs: nnConfig.epochs, loss: 0 })
        const nnResult = await fitNeuralNetwork(
          modelType as NNModelType, xsMatrix, yVals, nnConfig,
          (epoch, loss) => setTrainingProgress({ epoch, totalEpochs: nnConfig.epochs, loss })
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
      } else if (modelType === "linear" && !isSingleInput) {
        // Multiple linear regression
        const Xs = validIdx.map((p) => xValsCols.map((col) => col[validIdx.indexOf(p)]))
        result = fitMultipleLinear(Xs, yVals, modelInputCols)
      } else {
        switch (modelType) {
          case "linear":    result = fitLinear(xVals, yVals); break
          case "polynomial": result = fitPolynomial(xVals, yVals, polyDegree); break
          case "exponential": result = fitExponential(xVals, yVals); break
          default: result = fitLinear(xVals, yVals)
        }
      }

      const baseLabel = MODEL_OPTIONS.find((m) => m.value === modelSelectValue)?.label ?? modelSelectValue
      const modelDesc = modelType === "polynomial" ? `Polynomial (deg ${polyDegree})` : baseLabel
      const ioLabel = `${modelInputCols.join(", ")} → ${modelOutputCol}`
      const label = `${modelDesc}: ${ioLabel}`

      // Store each input column's values at valid indices so the chart can project onto any axis
      const inputValues: Record<string, number[]> = {}
      modelInputCols.forEach((col, ci) => {
        inputValues[col] = xValsCols[ci]
      })

      setFitEntries((prev) => [...prev, {
        id: crypto.randomUUID(),
        label,
        color: FIT_COLORS[prev.length % FIT_COLORS.length],
        visible: true,
        xValues: xVals,
        yValues: yVals,
        fitResult: result,
        inputCount: modelInputCols.length,
        inputCols: [...modelInputCols],
        outputCol: modelOutputCol,
        inputValues,
      }])
      setStatusMsg(null)
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Fitting failed")
      setTrainingProgress(null)
    } finally {
      setIsFitting(false)
    }
  }

  // ── Save merged/behavior dataset ──────────────────────────────────────────────

  async function handleSaveDataset() {
    const ds = mergedDataset ?? behaviorDataset
    if (!ds) return
    setIsSavingDataset(true)
    const name = datasetName || ds.filename
    const { id, error } = await saveDataset(
      name,
      selectedStudyId === "none" ? null : selectedStudyId,
      ds.columns,
      ds.rows as Record<string, unknown>[],
      { rowCount: ds.rows.length, merged: !!mergedDataset }
    )
    setIsSavingDataset(false)
    if (error) {
      setStatusMsg(`Error: ${error}`)
    } else {
      setSavedDatasetId(id ?? null)
      setSavedDatasets((prev) => [{
        id: id!, name,
        study_id: selectedStudyId === "none" ? null : selectedStudyId,
        columns: ds.columns,
        data: ds.rows as Record<string, unknown>[],
        metadata: { rowCount: ds.rows.length, merged: !!mergedDataset },
        created_at: new Date().toISOString(),
      }, ...prev])
      setStatusMsg("Dataset saved.")
      setTimeout(() => setStatusMsg(null), 2500)
    }
  }

  // ── Save model fit ────────────────────────────────────────────────────────────

  async function handleSaveModelFit() {
    const lastEntry = fitEntries[fitEntries.length - 1]
    if (!lastEntry || !savedDatasetId) {
      setStatusMsg("Save the dataset first before saving a model fit.")
      return
    }
    setIsSaving(true)
    const config: Record<string, unknown> = { inputs: modelInputCols, output: modelOutputCol }
    if (modelType === "polynomial") config.degree = polyDegree

    const { error } = await saveModelFit(
      savedDatasetId,
      selectedStudyId === "none" ? null : selectedStudyId,
      lastEntry.label, lastEntry.fitResult.modelType,
      config,
      lastEntry.fitResult.parameters as Record<string, unknown>,
      lastEntry.fitResult.metrics as Record<string, unknown>
    )
    setIsSaving(false)
    if (error) setStatusMsg(`Error: ${error}`)
    else { setStatusMsg("Model fit saved."); setTimeout(() => setStatusMsg(null), 2500) }
  }

  // ── Export ────────────────────────────────────────────────────────────────────

  function handleExportJson() {
    const lastEntry = fitEntries[fitEntries.length - 1]
    if (!lastEntry) return
    const { fitResult } = lastEntry
    const isNN = NN_MODEL_TYPES.includes(fitResult.modelType)
    const content = isNN
      ? JSON.stringify({ modelType: fitResult.modelType, architecture: fitResult.parameters.architecture, config: fitResult.parameters.config, weights: fitResult.parameters.weights, weightShapes: fitResult.parameters.weightShapes, normalization: fitResult.parameters.normalization, metrics: fitResult.metrics, exportedAt: new Date().toISOString() }, null, 2)
      : JSON.stringify({ modelType: fitResult.modelType, parameters: fitResult.parameters, metrics: fitResult.metrics, exportedAt: new Date().toISOString() }, null, 2)
    downloadBlob(content, `model-fit-${fitResult.modelType}.json`, "application/json")
  }

  function handleExportCsv(ds: SavedDataset) {
    downloadBlob(Papa.unparse(ds.data as object[]), `${ds.name}.csv`, "text/csv")
  }

  function handleExportExcel(ds: SavedDataset) {
    const ws = XLSX.utils.json_to_sheet(ds.data as object[])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data")
    XLSX.writeFile(wb, `${ds.name}.xlsx`)
  }

  async function handleDeleteDataset(id: string) {
    const { error } = await deleteDataset(id)
    if (error) setStatusMsg(`Error: ${error}`)
    else {
      setSavedDatasets((prev) => prev.filter((d) => d.id !== id))
      if (savedDatasetId === id) setSavedDatasetId(null)
    }
  }

  function handleToggleEntry(id: string) {
    setFitEntries((prev) => prev.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)))
  }
  function handleRemoveEntry(id: string) {
    setFitEntries((prev) => prev.filter((e) => e.id !== id))
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const lastEntry = fitEntries[fitEntries.length - 1] ?? null
  const chartXValues = activeDataset && chartXCol
    ? extractNumericColumn(activeDataset.rows, chartXCol)
    : []
  const chartYValues = activeDataset && chartYCol
    ? extractNumericColumn(activeDataset.rows, chartYCol)
    : []
  const xIsTime = activeDataset && chartXCol
    ? isTimestampColumn(activeDataset.rows, chartXCol)
    : false
  const showSaveDataset = !!(mergedDataset || (behaviorDataset && !sensorDataset))
  const isSingleInputModel = SINGLE_INPUT_ONLY.includes(modelType)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 min-h-full">

      {/* ── Top: combined data sources ── */}
      <Card>
        <CardHeader className="pt-2 pb-0 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-0 -mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border">

            {/* Behavior data */}
            <div className="space-y-2 pb-1 lg:pb-0 lg:pr-4">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                Behavior Data {behaviorDataset && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Micro-Study</Label>
                <Select value={selectedStudyId} onValueChange={setSelectedStudyId}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select study…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {studies.map((s) => {
                      const title = (s.metadata?.study_name as string) || s.study_goal
                      const shortTitle = title.length > 38 ? title.slice(0, 38) + "…" : title
                      let timeAgo = ""
                      try { timeAgo = formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) } catch {}
                      return (
                        <SelectItem key={s.study_id} value={s.study_id}>
                          <span className="flex items-baseline gap-1.5">
                            <span className="truncate">{shortTitle}</span>
                            {timeAgo && <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={handleLoadFromStudy}
                disabled={selectedStudyId === "none" || isLoadingStudy}>
                {isLoadingStudy ? <Spinner className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Load behavior data
              </Button>
              {behaviorDataset && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {behaviorDataset.columns.map((col) => (
                      <span key={col} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground border border-border">{col}</span>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr>
                          {behaviorDataset.columns.slice(0, 6).map((col) => (
                            <th key={col} className="text-left px-2 py-1 border-b border-border text-muted-foreground font-medium whitespace-nowrap">{col}</th>
                          ))}
                          {behaviorDataset.columns.length > 6 && <th className="text-left px-2 py-1 border-b border-border text-muted-foreground font-medium">+{behaviorDataset.columns.length - 6} more</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {behaviorDataset.rows.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            {behaviorDataset.columns.slice(0, 6).map((col) => (
                              <td key={col} className="px-2 py-1 text-foreground/80 whitespace-nowrap max-w-[120px] truncate">{String(row[col] ?? "")}</td>
                            ))}
                            {behaviorDataset.columns.length > 6 && <td className="px-2 py-1 text-muted-foreground">…</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {behaviorDataset.rows.length > 3 && (
                      <p className="text-xs text-muted-foreground mt-1 px-2">Showing 3 of {behaviorDataset.rows.length.toLocaleString()} rows</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sensor data */}
            <div className="space-y-2 pb-1 lg:pb-0 lg:px-4">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                Sensor Data {sensorDataset && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </p>
              <DatasetUploader onDataParsed={handleDataParsed} initialDataset={demoSensorDataset} />
              {sensorDataset && (
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500 font-medium">{sensorDataset.rows.length} rows</span>
                  {" · "}{sensorDataset.columns.slice(1).join(", ")}
                </p>
              )}
              {canMerge && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Merge by nearest timestamp to pair readings with observations.</p>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground shrink-0">Tolerance (s)</Label>
                    <Input type="number" min={1} max={300} value={toleranceSec}
                      onChange={(e) => setToleranceSec(Math.max(1, Number(e.target.value)))}
                      className="h-8 text-sm w-20" />
                    <Button size="sm" className="flex-1" onClick={handleMerge} disabled={isMerging}>
                      {isMerging ? <Spinner className="h-4 w-4 mr-2" /> : <Merge className="h-4 w-4 mr-2" />}
                      Merge
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Saved datasets */}
            <div className="space-y-2 pb-1 lg:pb-0 lg:pl-4">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                Saved Datasets
                {savedDatasets.length > 0 && <Badge variant="secondary" className="text-xs">{savedDatasets.length}</Badge>}
              </p>
              {showSaveDataset && (
                <div className="space-y-2 pb-2 border-b border-border">
                  <Input value={datasetName} onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="Dataset name…" className="h-8 text-sm" />
                  <Button variant="outline" size="sm" className="w-full" onClick={handleSaveDataset} disabled={isSavingDataset}>
                    {isSavingDataset ? <Spinner className="h-4 w-4 mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                    {savedDatasetId ? "Saved" : "Save Dataset"}
                  </Button>
                </div>
              )}
              {savedDatasets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No datasets saved yet.</p>
              ) : (
                <ScrollArea className="max-h-56">
                  <div className="space-y-2">
                    {savedDatasets.map((ds) => (
                      <div key={ds.id} className={cn(
                        "flex items-start gap-2 p-2.5 rounded-md border border-border bg-card hover:bg-muted/30 transition-colors",
                        savedDatasetId === ds.id && "border-primary/40 bg-primary/5"
                      )}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ds.name}</p>
                          <p className="text-xs text-muted-foreground">{ds.columns.length} cols · {(ds.data as unknown[]).length.toLocaleString()} rows</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Load" onClick={() => loadSavedDataset(ds)}><FolderOpen className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="CSV" onClick={() => handleExportCsv(ds)}><FileDown className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Excel" onClick={() => handleExportExcel(ds)}><FileDown className="h-3.5 w-3.5 text-green-500" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Delete" onClick={() => handleDeleteDataset(ds.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── Middle: chart (wide) | model builder ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch flex-1 min-h-0">

        {/* Chart — spans 2 cols */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Chart
            </CardTitle>
            {fitEntries.length > 0 && (
              <button onClick={() => setFitEntries([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                Clear all
              </button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">X axis</Label>
                <Select value={chartXCol} onValueChange={setChartXCol} disabled={allCols.length === 0}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {allCols.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Y axis</Label>
                <Select value={chartYCol} onValueChange={setChartYCol} disabled={allCols.length === 0}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {allCols.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ModelChart
              xValues={chartXValues}
              yValues={chartYValues}
              fitEntries={fitEntries}
              onToggle={handleToggleEntry}
              onRemove={handleRemoveEntry}
              xIsTime={xIsTime}
              xLabel={chartXCol || undefined}
              yLabel={chartYCol || undefined}
            />
          </CardContent>
        </Card>

        {/* Model builder */}
        <Card className="flex flex-col overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Model Builder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Inputs (X){isSingleInputModel && numericCols.length > 1 && (
                  <span className="ml-1 text-muted-foreground/60">· single input only</span>
                )}
              </Label>
              {numericCols.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Load data to see columns.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border p-2.5 bg-muted/10">
                  {numericCols.map((col) => (
                    <label key={col} className={cn(
                      "flex items-center gap-2 text-sm cursor-pointer px-1 py-0.5 rounded hover:bg-muted/30 transition-colors",
                      modelInputCols.includes(col) ? "text-foreground" : "text-muted-foreground"
                    )}>
                      <Checkbox checked={modelInputCols.includes(col)} onCheckedChange={() => toggleInputCol(col)} />
                      <span className="truncate">{col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Output (Y)</Label>
              <Select value={modelOutputCol} onValueChange={setModelOutputCol} disabled={numericCols.length === 0}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select output column…" /></SelectTrigger>
                <SelectContent>
                  {numericCols.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t border-border" />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Model Type</Label>
              <div className="flex items-center gap-1.5">
                <Select value={modelSelectValue} onValueChange={(v) => {
                  const newModel = v as ModelSelectValue
                  setModelSelectValue(newModel)
                  if (SINGLE_INPUT_ONLY.includes(newModel as ModelType) && modelInputCols.length > 1) {
                    setModelInputCols([modelInputCols[0]])
                  }
                }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    {MODEL_OPTIONS.find((o) => o.value === modelSelectValue)?.tooltip}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            {modelType === "polynomial" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Degree</Label>
                <Select value={String(polyDegree)} onValueChange={(v) => setPolyDegree(Number(v))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6].map((d) => <SelectItem key={d} value={String(d)}>Degree {d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {NN_MODEL_TYPES.includes(modelType) && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((o) => !o)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted/30 transition-colors"
                >
                  <ChevronDown className={cn("h-3 w-3 transition-transform", advancedOpen && "rotate-180")} />
                  Advanced Settings
                </button>
                {advancedOpen && (
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: "Epochs", key: "epochs" as const, min: 10, max: 1000, tooltip: "Number of full passes through the training data. More epochs can improve accuracy but take longer." },
                      { label: "Learning Rate", key: "learningRate" as const, min: 0.0001, max: 0.1, step: 0.0001, tooltip: "How large each weight update step is. Lower values train more slowly but more stably; higher values train faster but may overshoot." },
                      { label: "Hidden Units", key: "hiddenUnits" as const, min: 4, max: 256, tooltip: "Number of neurons in each hidden layer. More units increase model capacity but also training time and risk of overfitting." },
                      { label: "Window Size", key: "windowSize" as const, min: 2, max: 64, tooltip: "Number of past time steps used as context for each prediction. Larger windows capture longer-range patterns." },
                      ...(modelType === "mlp" ? [{ label: "Layers", key: "numLayers" as const, min: 1, max: 3, tooltip: "Number of hidden layers in the network. Deeper networks can learn more complex patterns but are harder to train." }] : []),
                    ] as { label: string; key: keyof NNConfig; min: number; max: number; step?: number; tooltip: string }[]).map(({ label, key, min, max, step, tooltip }) => (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">{label}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                <Info className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px]">
                              {tooltip}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input type="number" min={min} max={max} step={step ?? 1} value={nnConfig[key]}
                          onChange={(e) => setNNConfig((c) => ({ ...c, [key]: Number(e.target.value) }))}
                          className="h-8 text-sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {trainingProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Epoch {trainingProgress.epoch} / {trainingProgress.totalEpochs}</span>
                  <span>Loss: {trainingProgress.loss.toExponential(3)}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all"
                    style={{ width: `${(trainingProgress.epoch / trainingProgress.totalEpochs) * 100}%` }} />
                </div>
              </div>
            )}
            <Button className="w-full" onClick={handleFitModel}
              disabled={!activeDataset || modelInputCols.length === 0 || !modelOutputCol || isFitting}>
              {isFitting ? <Spinner className="h-4 w-4 mr-2" /> : <BrainCircuit className="h-4 w-4 mr-2" />}
              Fit Model
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* ── Bottom: Parameters & Metrics ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parameters &amp; Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ParametersPanel
            fitResult={lastEntry?.fitResult ?? null}
            onSave={handleSaveModelFit}
            onExportJson={handleExportJson}
            isSaving={isSaving}
          />
        </CardContent>
      </Card>

      {statusMsg && (
        <div className="bg-primary/10 border border-primary/30 rounded-md px-4 py-2 text-sm text-primary">
          {statusMsg}
        </div>
      )}

    </div>
  )
}
