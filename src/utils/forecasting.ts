export interface ModelMetrics {
  rSquared: number;
  mae: number;
  mse: number;
  accuracyPercent: number;
}

export interface ForecastScenario {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  pumpingFactor: number;
  rechargeFactor: number;
}

export interface HistoryPoint {
  month: string;
  q: number;
  r?: number; // recharge (advanced only)
  wl: number; // depth to water (m)
}

export interface ForecastPoint {
  month: string;
  wl: number;                    // Blended predicted depth to water (m)
  drawdown: number;              // Blended predicted drawdown (m)
  wlAnalytical: number;          // Analytical predicted depth to water (m)
  drawdownAnalytical: number;    // Analytical predicted drawdown (m)
  wlAI: number;                  // AI predicted depth to water (m)
  drawdownAI: number;            // AI predicted drawdown (m)
  q: number;                     // Scenario pumping rate (m3/month)
  r?: number;                    // Scenario recharge (m/month)
}

export interface ForecastResult {
  forecastPoints: ForecastPoint[];
  historyFits: {
    month: string;
    q: number;
    r?: number;
    wl: number;
    drawdown: number;
    wlAnalytical: number;
    drawdownAnalytical: number;
    wlAI: number;
    drawdownAI: number;
  }[];
  metrics: {
    q: ModelMetrics;
    r?: ModelMetrics;
    wl: ModelMetrics; // Hybrid
    wlAnalytical: ModelMetrics;
    wlAI: ModelMetrics;
  };
}

/**
 * Fits linear & seasonal models to predict Pumping Rate (Q), Recharge (R) and Water Level (WL).
 * Calculates R2 fit scores and MAE metrics for AI, Analytical and Hybrid (Blended) models.
 */
export function trainAndForecast(
  history: HistoryPoint[],
  scenario: ForecastScenario,
  forecastMonthsCount: number = 6,
  aquiferK?: number,
  aquiferb?: number,
  aquiferS?: number
): ForecastResult {
  const n = history.length;
  if (n === 0) {
    throw new Error('History cannot be empty');
  }

  const isAdvanced = history[0].r !== undefined;
  const initialWL = history[0].wl;
  const wlCurrent = history[n - 1].wl;

  // --- Analytical Model Precomputations ---
  // 1. Simple Analytical Model: AvgDeltaWL
  const deltaWLs: number[] = [];
  for (let i = 1; i < n; i++) {
    deltaWLs.push(history[i].wl - history[i - 1].wl);
  }
  const avgDeltaWL = deltaWLs.length > 0 ? deltaWLs.reduce((sum, v) => sum + v, 0) / deltaWLs.length : 0;

  // 2. Advanced Analytical Model parameters
  const K = aquiferK ?? 10.0;
  const b = aquiferb ?? 50.0;
  const S = aquiferS ?? 0.1;
  const T_monthly = K * b;

  // --- Train Q Model (AI) ---
  const actualQ = history.map(h => h.q);
  const timeIndices = history.map((_, i) => i + 1);
  const featuresQ = timeIndices.map(t => [
    1,
    t,
    Math.sin((2 * Math.PI * t) / 12),
    Math.cos((2 * Math.PI * t) / 12)
  ]);
  const qModel = fitLinearRegression(featuresQ, actualQ, {
    epochs: 2500,
    lr: 0.02,
    lambda: 0.01
  });

  // --- Train R Model (AI, if advanced) ---
  let rModel: RegressionResult | undefined;
  if (isAdvanced) {
    const actualR = history.map(h => h.r as number);
    const featuresR = timeIndices.map(t => [
      1,
      t,
      Math.sin((2 * Math.PI * t) / 12),
      Math.cos((2 * Math.PI * t) / 12)
    ]);
    rModel = fitLinearRegression(featuresR, actualR, {
      epochs: 2500,
      lr: 0.02,
      lambda: 0.01
    });
  }

  // --- Train WL Model (AI) ---
  const actualWL = history.map(h => h.wl);
  let wlModel: RegressionResult;
  if (isAdvanced) {
    // WL = f(Q, R, t, sin(2pi*t/12), cos(2pi*t/12))
    const featuresWL = history.map((h, i) => [
      1,
      h.q,
      h.r || 0,
      i + 1,
      Math.sin((2 * Math.PI * (i + 1)) / 12),
      Math.cos((2 * Math.PI * (i + 1)) / 12)
    ]);
    wlModel = fitLinearRegression(featuresWL, actualWL, {
      epochs: 3500,
      lr: 0.02,
      lambda: 0.05,
      constraints: [null, 'positive', 'negative', null, null, null]
    });
  } else {
    // WL = f(Q, t, sin(2pi*t/12), cos(2pi*t/12))
    const featuresWL = history.map((h, i) => [
      1,
      h.q,
      i + 1,
      Math.sin((2 * Math.PI * (i + 1)) / 12),
      Math.cos((2 * Math.PI * (i + 1)) / 12)
    ]);
    wlModel = fitLinearRegression(featuresWL, actualWL, {
      epochs: 3500,
      lr: 0.02,
      lambda: 0.05,
      constraints: [null, 'positive', null, null, null]
    });
  }

  // --- Calculate training fit points for history ---
  const historyFits = history.map((h, i) => {
    const qPred = qModel.predictions[i];
    const rPred = rModel ? rModel.predictions[i] : undefined;

    // AI model prediction for historical step
    let wlAI = wlModel.predictions[i];
    if (wlAI < 0.5) wlAI = 0.5;
    if (wlAI > 250) wlAI = 250;

    // Analytical model prediction for historical step
    let wlAnalytical = initialWL;
    if (isAdvanced) {
      if (i > 0) {
        const r_inf = Math.sqrt((T_monthly * i) / S);
        const A_inf = Math.PI * r_inf * r_inf;
        const s_draw = A_inf > 0 ? (h.q * i) / (S * A_inf) : 0;
        const h_rech = ((h.r || 0) * i) / S;
        wlAnalytical = initialWL + s_draw - h_rech;
      }
    } else {
      wlAnalytical = initialWL + avgDeltaWL * i;
    }
    if (wlAnalytical < 0.5) wlAnalytical = 0.5;
    if (wlAnalytical > 250) wlAnalytical = 250;

    // Hybrid (Blended) model prediction
    const wlHybrid = (wlAI + wlAnalytical) / 2;

    return {
      month: h.month,
      q: parseFloat(qPred.toFixed(1)),
      r: rPred !== undefined ? parseFloat(rPred.toFixed(4)) : undefined,
      wl: parseFloat(wlHybrid.toFixed(2)),
      drawdown: parseFloat((wlHybrid - initialWL).toFixed(2)),
      wlAnalytical: parseFloat(wlAnalytical.toFixed(2)),
      drawdownAnalytical: parseFloat((wlAnalytical - initialWL).toFixed(2)),
      wlAI: parseFloat(wlAI.toFixed(2)),
      drawdownAI: parseFloat((wlAI - initialWL).toFixed(2))
    };
  });

  // --- Calculate Metrics for each model ---
  // target is actualWL (history.map(h => h.wl))
  const getMetricsForSeries = (predSeries: number[]): ModelMetrics => {
    const r2 = calculateRSquared(actualWL, predSeries);
    const mae = actualWL.reduce((sum, val, idx) => sum + Math.abs(val - predSeries[idx]), 0) / n;
    const mse = actualWL.reduce((sum, val, idx) => sum + Math.pow(val - predSeries[idx], 2), 0) / n;
    const accuracyPercent = calculateAccuracyPercent(actualWL, predSeries);
    return {
      rSquared: parseFloat(r2.toFixed(3)),
      mae: parseFloat(mae.toFixed(3)),
      mse: parseFloat(mse.toFixed(3)),
      accuracyPercent: parseFloat(accuracyPercent.toFixed(1))
    };
  };

  const hybridWLs = historyFits.map(hf => hf.wl);
  const aiWLs = historyFits.map(hf => hf.wlAI);
  const analyticalWLs = historyFits.map(hf => hf.wlAnalytical);

  const hybridMetrics = getMetricsForSeries(hybridWLs);
  const aiMetrics = getMetricsForSeries(aiWLs);
  const analyticalMetrics = getMetricsForSeries(analyticalWLs);

  // --- Generate Forecast points ---
  const lastMonthStr = history[n - 1].month;
  const [year, monthVal] = lastMonthStr.split('/').map(Number);
  const forecastPoints: ForecastPoint[] = [];

  for (let m = 1; m <= forecastMonthsCount; m++) {
    const fT = n + m;

    // Calendar month computation
    let fMonthVal = monthVal + m;
    let fYear = year;
    if (fMonthVal > 12) {
      fYear += Math.floor((fMonthVal - 1) / 12);
      fMonthVal = ((fMonthVal - 1) % 12) + 1;
    }
    const fMonthStr = `${fYear}/${fMonthVal.toString().padStart(2, '0')}`;

    // Predict base Q and R
    const rowQ = [
      1,
      fT,
      Math.sin((2 * Math.PI * fT) / 12),
      Math.cos((2 * Math.PI * fT) / 12)
    ];
    let qBase = predictRegression(rowQ, qModel);
    if (qBase < 0) qBase = 0;

    let rBase = 0;
    if (rModel) {
      rBase = predictRegression(rowQ, rModel);
      if (rBase < 0) rBase = 0;
    }

    // Apply scenario scaling
    const simQ = qBase * scenario.pumpingFactor;
    const simR = rBase * scenario.rechargeFactor;

    // AI Prediction
    let wlAI = 0;
    if (isAdvanced) {
      const rowWL = [
        1,
        simQ,
        simR,
        fT,
        Math.sin((2 * Math.PI * fT) / 12),
        Math.cos((2 * Math.PI * fT) / 12)
      ];
      wlAI = predictRegression(rowWL, wlModel);
    } else {
      const rowWL = [
        1,
        simQ,
        fT,
        Math.sin((2 * Math.PI * fT) / 12),
        Math.cos((2 * Math.PI * fT) / 12)
      ];
      wlAI = predictRegression(rowWL, wlModel);
    }
    if (wlAI < 0.5) wlAI = 0.5;
    if (wlAI > 250) wlAI = 250;

    // Analytical Prediction
    let wlAnalytical = wlCurrent;
    if (isAdvanced) {
      const r_inf = Math.sqrt((T_monthly * m) / S);
      const A_inf = Math.PI * r_inf * r_inf;
      const s_draw = A_inf > 0 ? (simQ * m) / (S * A_inf) : 0;
      const h_rech = (simR * m) / S;
      wlAnalytical = wlCurrent + s_draw - h_rech;
    } else {
      wlAnalytical = wlCurrent + avgDeltaWL * m;
    }
    if (wlAnalytical < 0.5) wlAnalytical = 0.5;
    if (wlAnalytical > 250) wlAnalytical = 250;

    // Hybrid (Blended) Prediction
    const wlHybrid = (wlAI + wlAnalytical) / 2;

    forecastPoints.push({
      month: fMonthStr,
      wl: parseFloat(wlHybrid.toFixed(2)),
      drawdown: parseFloat((wlHybrid - initialWL).toFixed(2)),
      wlAnalytical: parseFloat(wlAnalytical.toFixed(2)),
      drawdownAnalytical: parseFloat((wlAnalytical - initialWL).toFixed(2)),
      wlAI: parseFloat(wlAI.toFixed(2)),
      drawdownAI: parseFloat((wlAI - initialWL).toFixed(2)),
      q: Math.round(simQ),
      r: isAdvanced ? parseFloat(simR.toFixed(4)) : undefined
    });
  }

  return {
    forecastPoints,
    historyFits,
    metrics: {
      q: qModel.metrics,
      r: rModel ? rModel.metrics : undefined,
      wl: hybridMetrics,
      wlAI: aiMetrics,
      wlAnalytical: analyticalMetrics
    }
  };
}

export interface AquiferForecastResult {
  forecastPoints: ForecastPoint[];
  historyFits: {
    month: string;
    q: number;
    r?: number;
    wl: number;
    drawdown: number;
    wlAnalytical: number;
    drawdownAnalytical: number;
    wlAI: number;
    drawdownAI: number;
  }[];
  metrics: {
    q: ModelMetrics;
    r?: ModelMetrics;
    wl: ModelMetrics;
    wlAnalytical: ModelMetrics;
    wlAI: ModelMetrics;
  };
}

export function getAquiferForecast(
  wellsInAquifer: { id: number; history: HistoryPoint[] }[],
  scenario: ForecastScenario,
  forecastMonthsCount: number = 6,
  aquiferK?: number,
  aquiferb?: number,
  aquiferS?: number
): AquiferForecastResult {
  if (wellsInAquifer.length === 0) {
    throw new Error('No wells in aquifer');
  }

  const wellResults = wellsInAquifer.map(w => 
    trainAndForecast(w.history, scenario, forecastMonthsCount, aquiferK, aquiferb, aquiferS)
  );

  const numWells = wellsInAquifer.length;
  const historyLen = wellsInAquifer[0].history.length;

  const aggregatedHistoryFits = Array.from({ length: historyLen }, (_, i) => {
    let sumQ = 0;
    let sumR = 0;
    let sumWl = 0;
    let sumWlAnalytical = 0;
    let sumWlAI = 0;

    wellResults.forEach(r => {
      const hf = r.historyFits[i];
      sumQ += hf.q;
      if (hf.r !== undefined) sumR += hf.r;
      sumWl += hf.wl;
      sumWlAnalytical += hf.wlAnalytical;
      sumWlAI += hf.wlAI;
    });

    const month = wellResults[0].historyFits[i].month;
    const avgQ = sumQ / numWells;
    const avgR = sumR / numWells;
    const avgWl = sumWl / numWells;
    const avgWlAnalytical = sumWlAnalytical / numWells;
    const avgWlAI = sumWlAI / numWells;

    const avgInitialWl = wellsInAquifer.reduce((sum, w) => sum + w.history[0].wl, 0) / numWells;

    return {
      month,
      q: parseFloat(avgQ.toFixed(1)),
      r: wellsInAquifer[0].history[0].r !== undefined ? parseFloat(avgR.toFixed(4)) : undefined,
      wl: parseFloat(avgWl.toFixed(2)),
      drawdown: parseFloat((avgWl - avgInitialWl).toFixed(2)),
      wlAnalytical: parseFloat(avgWlAnalytical.toFixed(2)),
      drawdownAnalytical: parseFloat((avgWlAnalytical - avgInitialWl).toFixed(2)),
      wlAI: parseFloat(avgWlAI.toFixed(2)),
      drawdownAI: parseFloat((avgWlAI - avgInitialWl).toFixed(2))
    };
  });

  const aggregatedForecastPoints = Array.from({ length: forecastMonthsCount }, (_, i) => {
    let sumQ = 0;
    let sumR = 0;
    let sumWlAI = 0;
    let sumWlAnalytical = 0;

    wellResults.forEach(r => {
      const fp = r.forecastPoints[i];
      sumQ += fp.q;
      if (fp.r !== undefined) sumR += fp.r;
      sumWlAI += fp.wlAI;
      sumWlAnalytical += fp.wlAnalytical;
    });

    const month = wellResults[0].forecastPoints[i].month;
    const avgQ = sumQ / numWells;
    const avgR = sumR / numWells;
    const avgWlAI = sumWlAI / numWells;
    const avgWlAnalytical = sumWlAnalytical / numWells;

    const avgWl = (avgWlAnalytical + avgWlAI) / 2;

    const avgInitialWl = wellsInAquifer.reduce((sum, w) => sum + w.history[0].wl, 0) / numWells;

    return {
      month,
      wl: parseFloat(avgWl.toFixed(2)),
      drawdown: parseFloat((avgWl - avgInitialWl).toFixed(2)),
      wlAnalytical: parseFloat(avgWlAnalytical.toFixed(2)),
      drawdownAnalytical: parseFloat((avgWlAnalytical - avgInitialWl).toFixed(2)),
      wlAI: parseFloat(avgWlAI.toFixed(2)),
      drawdownAI: parseFloat((avgWlAI - avgInitialWl).toFixed(2)),
      q: Math.round(avgQ),
      r: wellsInAquifer[0].history[0].r !== undefined ? parseFloat(avgR.toFixed(4)) : undefined
    };
  });

  const actualWLs = Array.from({ length: historyLen }, (_, i) => {
    const sumActualWl = wellsInAquifer.reduce((sum, w) => sum + w.history[i].wl, 0);
    return sumActualWl / numWells;
  });

  const getMetricsForSeries = (predSeries: number[]): ModelMetrics => {
    const r2 = calculateRSquared(actualWLs, predSeries);
    const mae = actualWLs.reduce((sum, val, idx) => sum + Math.abs(val - predSeries[idx]), 0) / historyLen;
    const mse = actualWLs.reduce((sum, val, idx) => sum + Math.pow(val - predSeries[idx], 2), 0) / historyLen;
    const accuracyPercent = calculateAccuracyPercent(actualWLs, predSeries);
    return {
      rSquared: parseFloat(r2.toFixed(3)),
      mae: parseFloat(mae.toFixed(3)),
      mse: parseFloat(mse.toFixed(3)),
      accuracyPercent: parseFloat(accuracyPercent.toFixed(1))
    };
  };

  const hybridWLs = aggregatedHistoryFits.map(hf => hf.wl);
  const aiWLs = aggregatedHistoryFits.map(hf => hf.wlAI);
  const analyticalWLs = aggregatedHistoryFits.map(hf => hf.wlAnalytical);

  const hybridMetrics = getMetricsForSeries(hybridWLs);
  const aiMetrics = getMetricsForSeries(aiWLs);
  const analyticalMetrics = getMetricsForSeries(analyticalWLs);

  const qRSquared = wellResults.reduce((sum, r) => sum + r.metrics.q.rSquared, 0) / numWells;
  const qMae = wellResults.reduce((sum, r) => sum + r.metrics.q.mae, 0) / numWells;
  const qMse = wellResults.reduce((sum, r) => sum + r.metrics.q.mse, 0) / numWells;
  const qAccuracy = wellResults.reduce((sum, r) => sum + r.metrics.q.accuracyPercent, 0) / numWells;

  let rMetrics: ModelMetrics | undefined;
  if (wellsInAquifer[0].history[0].r !== undefined) {
    const rRSquared = wellResults.reduce((sum, r) => sum + (r.metrics.r?.rSquared || 0), 0) / numWells;
    const rMae = wellResults.reduce((sum, r) => sum + (r.metrics.r?.mae || 0), 0) / numWells;
    const rMse = wellResults.reduce((sum, r) => sum + (r.metrics.r?.mse || 0), 0) / numWells;
    const rAccuracy = wellResults.reduce((sum, r) => sum + (r.metrics.r?.accuracyPercent || 0), 0) / numWells;
    rMetrics = {
      rSquared: parseFloat(rRSquared.toFixed(3)),
      mae: parseFloat(rMae.toFixed(3)),
      mse: parseFloat(rMse.toFixed(3)),
      accuracyPercent: parseFloat(rAccuracy.toFixed(1))
    };
  }

  return {
    forecastPoints: aggregatedForecastPoints,
    historyFits: aggregatedHistoryFits,
    metrics: {
      q: {
        rSquared: parseFloat(qRSquared.toFixed(3)),
        mae: parseFloat(qMae.toFixed(3)),
        mse: parseFloat(qMse.toFixed(3)),
        accuracyPercent: parseFloat(qAccuracy.toFixed(1))
      },
      r: rMetrics,
      wl: hybridMetrics,
      wlAI: aiMetrics,
      wlAnalytical: analyticalMetrics
    }
  };
}

// Scenarios definition
export const SCENARIOS: ForecastScenario[] = [
  {
    id: 'eco',
    nameEn: 'Eco-Protection (50% Pumping Reduction)',
    nameAr: 'الحماية البيئية (تقليل الضخ 50%)',
    nameFr: 'Eco-Protection (-50% Pompage)',
    pumpingFactor: 0.5,
    rechargeFactor: 1.1 // Slight recharge increase due to conservation
  },
  {
    id: 'normal',
    nameEn: 'Business As Usual (Baseline)',
    nameAr: 'الوضع المعتاد (المرجعي)',
    nameFr: 'Normal (Statut quo)',
    pumpingFactor: 1.0,
    rechargeFactor: 1.0
  },
  {
    id: 'intensive',
    nameEn: 'Intensive Use (30% Demand Increase / Drought)',
    nameAr: 'الاستخدام المكثف (زيادة الطلب 30%)',
    nameFr: 'Usage Intensif (+30% Pompage / Sécheresse)',
    pumpingFactor: 1.3,
    rechargeFactor: 0.8 // Decreased recharge due to drought
  }
];

// Calculation of R-Squared
function calculateRSquared(actual: number[], predicted: number[]): number {
  const n = actual.length;
  if (n === 0) return 0;
  const meanActual = actual.reduce((s, v) => s + v, 0) / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += Math.pow(actual[i] - predicted[i], 2);
    ssTot += Math.pow(actual[i] - meanActual, 2);
  }
  if (ssTot === 0) return 1.0;
  return 1 - ssRes / ssTot;
}

// Calculation of Accuracy Percentage (based on MAPE and R-Squared blend)
function calculateAccuracyPercent(actual: number[], predicted: number[]): number {
  const n = actual.length;
  if (n === 0) return 0;

  let sumPercentageError = 0;
  let nonZeroCount = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] !== 0) {
      sumPercentageError += Math.abs((actual[i] - predicted[i]) / actual[i]);
      nonZeroCount++;
    } else {
      if (predicted[i] !== 0) {
        sumPercentageError += Math.abs(predicted[i]) / (Math.abs(predicted[i]) + 1);
        nonZeroCount++;
      }
    }
  }
  const mape = nonZeroCount > 0 ? sumPercentageError / nonZeroCount : 0;
  const mapeScore = Math.max(0, 1 - mape) * 100;

  const r2 = calculateRSquared(actual, predicted);
  const r2Score = Math.max(0, r2) * 100;

  // Blended score (70% R2, 30% MAPE) bounded between 0 and 100
  const score = r2Score * 0.7 + mapeScore * 0.3;
  return Math.min(100, Math.max(0, parseFloat(score.toFixed(1))));
}

interface RegressionResult {
  weights: number[];
  means: number[];
  stds: number[];
  predictions: number[];
  metrics: ModelMetrics;
}

// Helper to fit linear regression using gradient descent
function fitLinearRegression(
  features: number[][],
  targets: number[],
  options: {
    epochs?: number;
    lr?: number;
    lambda?: number;
    constraints?: (string | null)[];
  } = {}
): RegressionResult {
  const n = targets.length;
  const p = features[0].length;
  const epochs = options.epochs ?? 3000;
  const lr = options.lr ?? 0.02;
  const lambda = options.lambda ?? 0.05;
  const constraints = options.constraints;

  // Standardize columns (except column 0 which is bias)
  const means = new Array(p).fill(0);
  const stds = new Array(p).fill(1);
  for (let j = 1; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += features[i][j];
    means[j] = sum / n;

    let sumSq = 0;
    for (let i = 0; i < n; i++) sumSq += Math.pow(features[i][j] - means[j], 2);
    stds[j] = Math.sqrt(sumSq / n) || 1;
  }

  const normFeatures = features.map(row =>
    row.map((val, j) => (j === 0 ? 1 : (val - means[j]) / stds[j]))
  );

  // Initialize weights
  const weights = new Array(p).fill(0);
  weights[0] = targets.reduce((sum, v) => sum + v, 0) / n;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const grads = new Array(p).fill(0);
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < p; j++) pred += weights[j] * normFeatures[i][j];
      const error = pred - targets[i];
      for (let j = 0; j < p; j++) grads[j] += error * normFeatures[i][j];
    }

    for (let j = 0; j < p; j++) {
      const reg = j === 0 ? 0 : lambda * weights[j];
      const grad = grads[j] / n + reg;
      weights[j] -= lr * grad;

      // Apply constraints
      if (constraints && constraints[j]) {
        if (constraints[j] === 'positive' && weights[j] < 0) {
          weights[j] = 0;
        } else if (constraints[j] === 'negative' && weights[j] > 0) {
          weights[j] = 0;
        }
      }
    }
  }

  const predictions = features.map(row => {
    let pred = 0;
    for (let j = 0; j < p; j++) {
      const normVal = j === 0 ? 1 : (row[j] - means[j]) / stds[j];
      pred += weights[j] * normVal;
    }
    return pred;
  });

  const r2 = calculateRSquared(targets, predictions);
  let sumAbsErr = 0;
  let sumSqErr = 0;
  for (let i = 0; i < n; i++) {
    sumAbsErr += Math.abs(targets[i] - predictions[i]);
    sumSqErr += Math.pow(targets[i] - predictions[i], 2);
  }
  const mae = sumAbsErr / n;
  const mse = sumSqErr / n;
  const accuracyPercent = calculateAccuracyPercent(targets, predictions);

  return {
    weights,
    means,
    stds,
    predictions,
    metrics: {
      rSquared: parseFloat(r2.toFixed(3)),
      mae: parseFloat(mae.toFixed(3)),
      mse: parseFloat(mse.toFixed(3)),
      accuracyPercent: parseFloat(accuracyPercent.toFixed(1))
    }
  };
}

function predictRegression(
  featuresRow: number[],
  model: RegressionResult
): number {
  let pred = 0;
  for (let j = 0; j < model.weights.length; j++) {
    const normVal = j === 0 ? 1 : (featuresRow[j] - model.means[j]) / model.stds[j];
    pred += model.weights[j] * normVal;
  }
  return pred;
}


