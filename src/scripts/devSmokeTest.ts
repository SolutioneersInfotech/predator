const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const token = process.env.TEST_TOKEN;

async function run() {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const endpoints = [
    `${baseUrl}/api/analysis/signals/BTCUSDT`,
    `${baseUrl}/api/analysis/news/BTCUSDT`,
    `${baseUrl}/api/analysis/key-levels/ETHUSDT?timeframe=1h`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers });
      const body = await res.json();
      console.log(`✅ ${url} -> ${res.status}`);
      console.log(JSON.stringify(body, null, 2));
    } catch (error) {
      console.error(`❌ ${url} failed`, error);
    }
  }
}

run();
