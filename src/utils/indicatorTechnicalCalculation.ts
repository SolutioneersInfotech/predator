// ---------- SMA series ----------
export function computeSMASeries(closes: number[], period = 50) {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i + 1 < period) {
      out.push(null);
      continue;
    }
    const slice = closes.slice(i + 1 - period, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    out.push(sum / period);
  }
  return out;
}

// ---------- EMA series ----------
export function computeEMASeries(closes: number[], period = 50) {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prevEMA: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    const price = closes[i];
    if (i + 1 < period) {
      out.push(null);
      // accumulate until we have first SMA for seed
      if (i + 1 === period - 1) {
        const seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
        prevEMA = seed;
      }
      continue;
    }
    if (prevEMA === null) {
      // compute seed if missed
      prevEMA = closes.slice(i + 1 - period, i + 1).reduce((a, b) => a + b, 0) / period;
      out[out.length - 1] = prevEMA;
      continue;
    }
    const ema = price * k + prevEMA * (1 - k);
    out.push(ema);
    prevEMA = ema;
  }
  return out;
}

// ---------- Bollinger Bands (middle = SMA, upper/lower = SMA +/- n * std) ----------
export function computeBollingerBands(closes: number[], period = 20, stdDevMultiplier = 2) {
  const bands: { middle: number | null; upper: number | null; lower: number | null }[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i + 1 < period) {
      bands.push({ middle: null, upper: null, lower: null });
      continue;
    }
    const slice = closes.slice(i + 1 - period, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance =
      slice.reduce((a, b) => a + (b - mean) * (b - mean), 0) / period;
    const sd = Math.sqrt(variance);
    bands.push({
      middle: mean,
      upper: mean + stdDevMultiplier * sd,
      lower: mean - stdDevMultiplier * sd,
    });
  }
  return bands;
}

// ---------- MACD series (MACD line, signal line, histogram) ----------
export function computeMACDSeries(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  // compute EMA series for fast and slow
  const emaFast = computeEMASeries(closes, fastPeriod).map(v => v === null ? NaN : v as number);
  const emaSlow = computeEMASeries(closes, slowPeriod).map(v => v === null ? NaN : v as number);

  const macdLine: number[] = closes.map((_, idx) => {
    const a = emaFast[idx];
    const b = emaSlow[idx];
    if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
    return a - b;
  });

  // signal line = EMA of macdLine (skip NaNs by treating them as missing)
  const signalLine: number[] = [];
  // build an array of macd values where NaN are ignored for seeding;
  let prevEMA: number | null = null;
  const k = 2 / (signalPeriod + 1);
  for (let i = 0; i < macdLine.length; i++) {
    const val = macdLine[i];
    if (isNaN(val)) {
      signalLine.push(NaN);
      continue;
    }
    if (prevEMA === null) {
      // attempt seed if sufficient prior non-NaN values
      const window = macdLine.slice(Math.max(0, i + 1 - signalPeriod), i + 1).filter(v => !isNaN(v));
      if (window.length < signalPeriod) {
        signalLine.push(NaN);
        continue;
      }
      prevEMA = window.reduce((a, b) => a + b, 0) / window.length;
      signalLine.push(prevEMA);
      continue;
    }
    const ema = val * k + prevEMA * (1 - k);
    signalLine.push(ema);
    prevEMA = ema;
  }

  const histogram = macdLine.map((v, i) =>
    Number.isNaN(v) || Number.isNaN(signalLine[i]) ? NaN : v - signalLine[i]
  );

  // convert NaN -> null for JSON friendliness (frontend can handle)
  return {
    macd: macdLine.map(v => Number.isNaN(v) ? null : v),
    signal: signalLine.map(v => Number.isNaN(v) ? null : v),
    hist: histogram.map(v => Number.isNaN(v) ? null : v),
  };
}

// ---------- RSI series ----------
export function computeRSISeries(closes: number[], period = 14) {
  const out: (number | null)[] = [];
  if (closes.length < period + 1) {
    return closes.map(_ => null);
  }

  // initial avg gain/loss
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgGain === 0 && avgLoss === 0 ? 50 : 100 - 100 / (1 + avgGain / avgLoss || 1); // seed value

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    out[i] = isFinite(rsi) ? rsi : null;
  }

  // ensure earlier indices are null
  for (let i = 0; i < period; i++) if (out[i] === undefined) out[i] = null;

  return out;
}