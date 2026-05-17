// TensorFlow.js neural network fitting — dynamically imported to avoid bundling on initial load

export type NNModelType = 'mlp' | 'cnn' | 'rnn' | 'lstm'

export interface NNConfig {
  epochs: number        // default 100
  learningRate: number  // default 0.01
  windowSize: number    // for CNN/RNN/LSTM sequences, default 8
  hiddenUnits: number   // default 32
  numLayers: number     // MLP only: number of hidden layers (1-3), default 2
}

export interface NNFitResult {
  modelType: NNModelType
  parameters: {
    architecture: string
    weights: number[][]
    weightShapes: number[][]
    config: NNConfig
    normalization: { xMins: number[]; xMaxs: number[]; yMin: number; yMax: number }
  }
  metrics: { r2: number; rmse: number; mse: number }
  predictedY: number[]
  trainingLoss: number[]
}

// ── Normalization helpers ─────────────────────────────────────────────────────

function normalizeFeature(arr: number[], min: number, max: number): number[] {
  const range = max - min
  if (range === 0) return arr.map(() => 0.5)
  return arr.map((v) => (v - min) / range)
}

function denormalize(arr: number[], min: number, max: number): number[] {
  const range = max - min
  return arr.map((v) => v * range + min)
}

// Normalize each column (feature) independently; returns [n_samples, n_features]
function normalizeMatrix(
  xs: number[][],
  xMins: number[],
  xMaxs: number[]
): number[][] {
  return xs.map((row) =>
    row.map((v, f) => {
      const range = xMaxs[f] - xMins[f]
      return range === 0 ? 0.5 : (v - xMins[f]) / range
    })
  )
}

function computeMetrics(
  yActual: number[],
  yPred: number[]
): { r2: number; rmse: number; mse: number } {
  const n = yActual.length
  if (n === 0) return { r2: 0, rmse: 0, mse: 0 }
  const yBar = yActual.reduce((s, v) => s + v, 0) / n
  let ssTot = 0
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    ssTot += (yActual[i] - yBar) ** 2
    ssRes += (yActual[i] - yPred[i]) ** 2
  }
  const mse = ssRes / n
  const rmse = Math.sqrt(mse)
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  return { r2, rmse, mse }
}

// ── Windowed input builder (for CNN / RNN / LSTM) ────────────────────────────
// xsNorm: [n_samples, n_features] → returns [n_samples, windowSize, n_features]

function buildWindowedInputs(xsNorm: number[][], windowSize: number): number[][][] {
  const n = xsNorm.length
  return Array.from({ length: n }, (_, i) => {
    const window: number[][] = []
    for (let j = windowSize - 1; j >= 0; j--) {
      window.push(xsNorm[Math.max(0, i - j)])
    }
    return window
  })
}

// ── Main fit function ─────────────────────────────────────────────────────────
// xs: [n_samples, n_features] — pass a single-column matrix for single-input models

export async function fitNeuralNetwork(
  modelType: NNModelType,
  xs: number[][],
  y: number[],
  config: NNConfig,
  onProgress: (epoch: number, loss: number) => void
): Promise<NNFitResult> {
  const tf = await import('@tensorflow/tfjs')

  const n = xs.length
  const numFeatures = xs[0]?.length ?? 1

  const xMins = Array.from({ length: numFeatures }, (_, f) => Math.min(...xs.map((r) => r[f])))
  const xMaxs = Array.from({ length: numFeatures }, (_, f) => Math.max(...xs.map((r) => r[f])))
  const yMin = Math.min(...y)
  const yMax = Math.max(...y)

  const xsNorm = normalizeMatrix(xs, xMins, xMaxs)
  const yNorm = normalizeFeature(y, yMin, yMax)

  const trainingLoss: number[] = []
  const model = tf.sequential()

  if (modelType === 'mlp') {
    // ── MLP ──────────────────────────────────────────────────────────────────
    const numLayers = Math.min(3, Math.max(1, config.numLayers))
    model.add(tf.layers.dense({ units: config.hiddenUnits, activation: 'relu', inputShape: [numFeatures] }))
    for (let i = 1; i < numLayers; i++) {
      model.add(tf.layers.dense({ units: config.hiddenUnits, activation: 'relu' }))
    }
    model.add(tf.layers.dense({ units: 1 }))
    model.compile({ optimizer: tf.train.adam(config.learningRate), loss: 'meanSquaredError' })

    const xsTensor = tf.tensor2d(xsNorm)
    const ysTensor = tf.tensor2d(yNorm, [n, 1])

    await model.fit(xsTensor, ysTensor, {
      epochs: config.epochs,
      callbacks: {
        onEpochEnd: (epoch: number, logs?: Record<string, number>) => {
          const loss = logs?.loss ?? 0
          trainingLoss.push(loss)
          onProgress(epoch + 1, loss)
        },
      },
    })

    const predTensor = model.predict(xsTensor) as ReturnType<typeof tf.tensor2d>
    const predNorm = Array.from(predTensor.dataSync())
    const predictedY = denormalize(predNorm, yMin, yMax)

    xsTensor.dispose()
    ysTensor.dispose()
    predTensor.dispose()

    const weights = model.getWeights()
    const weightArrays = weights.map((w) => Array.from(w.dataSync()))
    const weightShapes = weights.map((w) => [...w.shape])
    model.dispose()

    const numLayersDesc = numLayers
    const architecture = `MLP: Input(${numFeatures}) → ${Array.from({ length: numLayersDesc }, () => `Dense(${config.hiddenUnits}, ReLU)`).join(' → ')} → Dense(1)`

    return {
      modelType,
      parameters: { architecture, weights: weightArrays, weightShapes, config, normalization: { xMins, xMaxs, yMin, yMax } },
      metrics: computeMetrics(y, predictedY),
      predictedY,
      trainingLoss,
    }
  } else {
    // ── CNN / RNN / LSTM — windowed inputs ───────────────────────────────────
    const W = config.windowSize
    const windowedInputs = buildWindowedInputs(xsNorm, W)  // [n, W, numFeatures]

    if (modelType === 'cnn') {
      model.add(tf.layers.conv1d({
        filters: config.hiddenUnits, kernelSize: 3, activation: 'relu',
        padding: 'same', inputShape: [W, numFeatures],
      }))
      model.add(tf.layers.conv1d({
        filters: Math.max(1, Math.floor(config.hiddenUnits / 2)),
        kernelSize: 3, activation: 'relu', padding: 'same',
      }))
      model.add(tf.layers.globalAveragePooling1d())
      model.add(tf.layers.dense({ units: config.hiddenUnits, activation: 'relu' }))
      model.add(tf.layers.dense({ units: 1 }))
    } else if (modelType === 'rnn') {
      model.add(tf.layers.simpleRNN({
        units: config.hiddenUnits, returnSequences: false, inputShape: [W, numFeatures],
      }))
      model.add(tf.layers.dense({ units: Math.max(1, Math.floor(config.hiddenUnits / 2)), activation: 'relu' }))
      model.add(tf.layers.dense({ units: 1 }))
    } else {
      model.add(tf.layers.lstm({
        units: config.hiddenUnits, returnSequences: false, inputShape: [W, numFeatures],
      }))
      model.add(tf.layers.dense({ units: Math.max(1, Math.floor(config.hiddenUnits / 2)), activation: 'relu' }))
      model.add(tf.layers.dense({ units: 1 }))
    }

    model.compile({ optimizer: tf.train.adam(config.learningRate), loss: 'meanSquaredError' })

    const xsTensor = tf.tensor3d(windowedInputs)
    const ysTensor = tf.tensor2d(yNorm, [n, 1])

    await model.fit(xsTensor, ysTensor, {
      epochs: config.epochs,
      callbacks: {
        onEpochEnd: (epoch: number, logs?: Record<string, number>) => {
          const loss = logs?.loss ?? 0
          trainingLoss.push(loss)
          onProgress(epoch + 1, loss)
        },
      },
    })

    const predTensor = model.predict(xsTensor) as ReturnType<typeof tf.tensor2d>
    const predNorm = Array.from(predTensor.dataSync())
    const predictedY = denormalize(predNorm, yMin, yMax)

    xsTensor.dispose()
    ysTensor.dispose()
    predTensor.dispose()

    const weights = model.getWeights()
    const weightArrays = weights.map((w) => Array.from(w.dataSync()))
    const weightShapes = weights.map((w) => [...w.shape])
    model.dispose()

    const archMap: Record<NNModelType, string> = {
      mlp: '',
      cnn:  `CNN:  Input([${W},${numFeatures}]) → Conv1D(${config.hiddenUnits}, k=3) → Conv1D(${Math.floor(config.hiddenUnits / 2)}, k=3) → GlobalAvgPool → Dense(${config.hiddenUnits}) → Dense(1)`,
      rnn:  `RNN:  Input([${W},${numFeatures}]) → SimpleRNN(${config.hiddenUnits}) → Dense(${Math.floor(config.hiddenUnits / 2)}) → Dense(1)`,
      lstm: `LSTM: Input([${W},${numFeatures}]) → LSTM(${config.hiddenUnits}) → Dense(${Math.floor(config.hiddenUnits / 2)}) → Dense(1)`,
    }

    return {
      modelType,
      parameters: { architecture: archMap[modelType], weights: weightArrays, weightShapes, config, normalization: { xMins, xMaxs, yMin, yMax } },
      metrics: computeMetrics(y, predictedY),
      predictedY,
      trainingLoss,
    }
  }
}

// ── Predict from saved weights ────────────────────────────────────────────────

export async function predictFromNNWeights(
  modelType: NNModelType,
  config: NNConfig,
  weights: number[][],
  weightShapes: number[][],
  xsNorm: number[][]   // [n_samples, n_features] — already normalized
): Promise<number[]> {
  const tf = await import('@tensorflow/tfjs')

  const n = xsNorm.length
  const numFeatures = xsNorm[0]?.length ?? 1
  const W = config.windowSize
  const model = tf.sequential()

  if (modelType === 'mlp') {
    const numLayers = Math.min(3, Math.max(1, config.numLayers))
    model.add(tf.layers.dense({ units: config.hiddenUnits, activation: 'relu', inputShape: [numFeatures] }))
    for (let i = 1; i < numLayers; i++) {
      model.add(tf.layers.dense({ units: config.hiddenUnits, activation: 'relu' }))
    }
    model.add(tf.layers.dense({ units: 1 }))
  } else if (modelType === 'cnn') {
    model.add(tf.layers.conv1d({
      filters: config.hiddenUnits, kernelSize: 3, activation: 'relu',
      padding: 'same', inputShape: [W, numFeatures],
    }))
    model.add(tf.layers.conv1d({
      filters: Math.max(1, Math.floor(config.hiddenUnits / 2)),
      kernelSize: 3, activation: 'relu', padding: 'same',
    }))
    model.add(tf.layers.globalAveragePooling1d())
    model.add(tf.layers.dense({ units: config.hiddenUnits, activation: 'relu' }))
    model.add(tf.layers.dense({ units: 1 }))
  } else if (modelType === 'rnn') {
    model.add(tf.layers.simpleRNN({
      units: config.hiddenUnits, returnSequences: false, inputShape: [W, numFeatures],
    }))
    model.add(tf.layers.dense({ units: Math.max(1, Math.floor(config.hiddenUnits / 2)), activation: 'relu' }))
    model.add(tf.layers.dense({ units: 1 }))
  } else {
    model.add(tf.layers.lstm({
      units: config.hiddenUnits, returnSequences: false, inputShape: [W, numFeatures],
    }))
    model.add(tf.layers.dense({ units: Math.max(1, Math.floor(config.hiddenUnits / 2)), activation: 'relu' }))
    model.add(tf.layers.dense({ units: 1 }))
  }

  const dummyShape = modelType === 'mlp' ? [1, numFeatures] : [1, W, numFeatures]
  const dummy = tf.zeros(dummyShape)
  const dummyOut = model.predict(dummy) as ReturnType<typeof tf.tensor2d>
  dummyOut.dispose()
  dummy.dispose()

  const weightTensors = weights.map((arr, i) =>
    tf.tensor(arr, weightShapes[i] as [number, ...number[]])
  )
  model.setWeights(weightTensors)
  weightTensors.forEach((t) => t.dispose())

  let inputTensor: ReturnType<typeof tf.tensor2d> | ReturnType<typeof tf.tensor3d>
  if (modelType === 'mlp') {
    inputTensor = tf.tensor2d(xsNorm)
  } else {
    const windowedInputs = buildWindowedInputs(xsNorm, W)
    inputTensor = tf.tensor3d(windowedInputs)
  }

  const predTensor = model.predict(inputTensor) as ReturnType<typeof tf.tensor2d>
  const result = Array.from(predTensor.dataSync())

  predTensor.dispose()
  inputTensor.dispose()
  model.dispose()

  return result
}
