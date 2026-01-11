const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const symbol = process.env.TEST_SYMBOL || "BTCUSDT";
const timeframe = process.env.TEST_TIMEFRAME || "4h";

async function run() {
  const url = `${baseUrl}/api/analysis/summary?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`;
  try {
    const res = await fetch(url);
    const body = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      console.error(`❌ ${url} -> ${res.status}`, body);
      process.exitCode = 1;
      return;
    }

    if (!body || typeof body !== "object") {
      console.error(`❌ ${url} -> invalid JSON response`, body);
      process.exitCode = 1;
      return;
    }

    const requiredFields = ["symbol", "timeframe", "timestamp", "bias", "confidence", "bullishFactors", "riskFactors", "signals", "source"];
    const hasRequired = requiredFields.every((field) => field in body);
    if (!hasRequired) {
      console.error(`❌ ${url} -> missing expected fields`, body);
      process.exitCode = 1;
      return;
    }

    console.log(`✅ ${url} -> ${res.status}`);
    console.log(JSON.stringify(body, null, 2));
  } catch (error) {
    console.error(`❌ ${url} failed`, error);
    process.exitCode = 1;
  }
}

run();
