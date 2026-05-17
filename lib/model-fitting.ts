// Pure TypeScript model fitting — no external ML libraries

export type ModelType =
  | 'linear'
  | 'polynomial'
  | 'exponential'
  | 'moving_average'
  | 'mlp'
  | 'cnn'
  | 'rnn'
  | 'lstm'

export interface FitResult {
  modelType: ModelType
  parameters: Record<string, unknown>
  metrics: { r2: number; rmse: number; mse: number }
  predictedY: number[]
  trainingLoss?: number[]
}

// ── Math helpers ─────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function computeMetrics(yActual: number[], yPred: number[]): { r2: number; rmse: number; mse: number } {
  const n = yActual.length
  if (n === 0) return { r2: 0, rmse: 0, mse: 0 }

  const yBar = mean(yActual)
  let ssTot = 0
  let ssRes = 0
  let sumSqErr = 0

  for (let i = 0; i < n; i++) {
    ssTot += (yActual[i] - yBar) ** 2
    ssRes += (yActual[i] - yPred[i]) ** 2
    sumSqErr += (yActual[i] - yPred[i]) ** 2
  }

  const mse = sumSqErr / n
  const rmse = Math.sqrt(mse)
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot

  return { r2, rmse, mse }
}

// ── Gaussian elimination for square systems (augmented matrix [A | b]) ───────

function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length
  // Build augmented matrix
  const M: number[][] = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    }
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]

    if (Math.abs(M[col][col]) < 1e-12) continue // singular — skip

    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = M[row][col] / M[col][col]
      for (let k = col; k <= n; k++) {
        M[row][k] -= factor * M[col][k]
      }
    }
  }

  return M.map((row, i) => (Math.abs(M[i][i]) < 1e-12 ? 0 : row[n] / M[i][i]))
}

// ── Linear regression (closed-form OLS) ──────────────────────────────────────

export function fitLinear(x: number[], y: number[]): FitResult {
  const n = x.length
  const xBar = mean(x)
  const yBar = mean(y)

  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - xBar) * (y[i] - yBar)
    sxx += (x[i] - xBar) ** 2
  }

  const slope = sxx === 0 ? 0 : sxy / sxx
  const intercept = yBar - slope * xBar

  const predictedY = x.map(xi => slope * xi + intercept)
  const metrics = computeMetrics(y, predictedY)

  return {
    modelType: 'linear',
    parameters: { slope, intercept },
    metrics,
    predictedY,
  }
}

// ── Polynomial regression via Vandermonde normal equations ───────────────────

export function fitPolynomial(x: number[], y: number[], degree: number): FitResult {
  const n = x.length
  const d = Math.min(degree, 4) // cap at degree 4 (5 coefficients)
  const size = d + 1

  // Build Vandermonde normal equations: (X^T X) c = X^T y
  // A[i][j] = sum_k x_k^(i+j), b[i] = sum_k x_k^i * y_k
  const A: number[][] = Array.from({ length: size }, () => new Array(size).fill(0))
  const b: number[] = new Array(size).fill(0)

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < size; i++) {
      b[i] += Math.pow(x[k], i) * y[k]
      for (let j = 0; j < size; j++) {
        A[i][j] += Math.pow(x[k], i + j)
      }
    }
  }

  const coefficients = gaussianElimination(A, b)
  const predictedY = x.map(xi =>
    coefficients.reduce((acc, c, i) => acc + c * Math.pow(xi, i), 0)
  )
  const metrics = computeMetrics(y, predictedY)

  return {
    modelType: 'polynomial',
    parameters: { coefficients },
    metrics,
    predictedY,
  }
}

// ── Exponential fit via log-linearisation ────────────────────────────────────

export function fitExponential(x: number[], y: number[]): FitResult {
  // Filter valid (positive y) pairs
  const validX: number[] = []
  const lnY: number[] = []
  for (let i = 0; i < x.length; i++) {
    if (y[i] > 0) {
      validX.push(x[i])
      lnY.push(Math.log(y[i]))
    }
  }

  if (validX.length < 2) {
    // Fallback: linear on original data
    const lin = fitLinear(x, y)
    return { ...lin, modelType: 'exponential', parameters: { a: 1, b: 0 } }
  }

  const linResult = fitLinear(validX, lnY)
  const lnA = linResult.parameters.intercept as number
  const b = linResult.parameters.slope as number
  const a = Math.exp(lnA)

  const predictedY = x.map(xi => a * Math.exp(b * xi))
  const metrics = computeMetrics(y, predictedY)

  return {
    modelType: 'exponential',
    parameters: { a, b },
    metrics,
    predictedY,
  }
}

// ── Moving average ────────────────────────────────────────────────────────────

export function fitMovingAverage(x: number[], y: number[], window: number): FitResult {
  const n = y.length
  const half = Math.floor(window / 2)
  const predictedY = y.map((_, i) => {
    const lo = Math.max(0, i - half)
    const hi = Math.min(n - 1, i + half)
    const slice = y.slice(lo, hi + 1)
    return mean(slice)
  })
  const metrics = computeMetrics(y, predictedY)

  return {
    modelType: 'moving_average',
    parameters: { window },
    metrics,
    predictedY,
  }
}

// ── Multiple linear regression (OLS normal equations) ────────────────────────

export function fitMultipleLinear(
  Xs: number[][],  // [n_samples][n_features]
  y: number[],
  inputNames: string[]
): FitResult {
  const n = y.length
  const p = Xs[0].length + 1  // +1 for intercept column

  // Augment with intercept column: Xa[i] = [1, ...Xs[i]]
  const Xa = Xs.map(row => [1, ...row])

  // Normal equations: (Xa^T Xa) beta = Xa^T y
  const A: number[][] = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) =>
      Xa.reduce((s, row) => s + row[i] * row[j], 0)
    )
  )
  const b: number[] = Array.from({ length: p }, (_, i) =>
    Xa.reduce((s, row, k) => s + row[i] * y[k], 0)
  )

  const beta = gaussianElimination(A, b)
  const intercept = beta[0]
  const slopes = beta.slice(1)

  const predictedY = Xs.map(row =>
    intercept + row.reduce((s, x, j) => s + slopes[j] * x, 0)
  )

  const parameters: Record<string, number> = { intercept }
  inputNames.forEach((name, j) => { parameters[`slope_${name}`] = slopes[j] })

  return {
    modelType: 'linear',
    parameters,
    metrics: computeMetrics(y, predictedY),
    predictedY,
  }
}

// ── Re-predict from saved parameters ─────────────────────────────────────────

export function predict(
  modelType: ModelType,
  parameters: Record<string, number | number[]>,
  x: number[]
): number[] {
  switch (modelType) {
    case 'linear': {
      const { slope, intercept } = parameters as { slope: number; intercept: number }
      return x.map(xi => slope * xi + intercept)
    }
    case 'polynomial': {
      const coefficients = parameters.coefficients as number[]
      return x.map(xi =>
        coefficients.reduce((acc, c, i) => acc + c * Math.pow(xi, i), 0)
      )
    }
    case 'exponential': {
      const { a, b } = parameters as { a: number; b: number }
      return x.map(xi => a * Math.exp(b * xi))
    }
    case 'moving_average': {
      // For saved prediction we just return the x-length array of zeros
      // (can't reconstruct without original y — caller should store predictedY)
      return new Array(x.length).fill(0)
    }
    default:
      return new Array(x.length).fill(0)
  }
}
