const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const symbol = process.env.TEST_SYMBOL || "BTCUSDT";

type NewsResponse = {
  symbol?: string;
  items?: unknown[];
  pagination?: {
    page?: number;
    pageSize?: number;
    totalPages?: number;
    hasMore?: boolean;
  };
  overallSentiment?: string;
  keyThemes?: string[];
  watchlist?: string[];
  warning?: string;
};

async function run() {
  const url = `${baseUrl}/api/analysis/news/${symbol}`;
  try {
    const res = await fetch(url);
    const body = (await res.json()) as NewsResponse;

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

    const hasRequiredFields =
      typeof body.symbol === "string" &&
      Array.isArray(body.items) &&
      typeof body.overallSentiment === "string" &&
      Array.isArray(body.keyThemes) &&
      Array.isArray(body.watchlist) &&
      typeof body.pagination === "object";

    if (!hasRequiredFields) {
      console.error(`❌ ${url} -> missing expected fields`, body);
      process.exitCode = 1;
      return;
    }

    if (!process.env.GEMINI_API_KEY && !body.warning) {
      console.error(`❌ ${url} -> expected warning without GEMINI_API_KEY`, body);
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
