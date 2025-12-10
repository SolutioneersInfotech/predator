export function detectMarketType(symbol: string) {
  const sym = symbol.toUpperCase().trim();

  // -------------------------
  // 1️⃣ CRYPTO DETECTION
  // -------------------------

  // Common quote currencies in crypto
  const quotes = ["USDT", "USD", "USDC", "BTC", "ETH", "BNB", "EUR", "TRY"];

  // A. Formats: BTC/USDT, BTC-USDT
  if (sym.includes("/") || sym.includes("-")) {
    const parts = sym.split(/[-/]/);
    if (parts.length === 2 && quotes.includes(parts[1])) {
      return "crypto";
    }
  }

  // B. Format: BTCUSDT or ETHUSD or SOLBTC
  for (const q of quotes) {
    if (sym.endsWith(q) && sym.length > q.length) {
      return "crypto";
    }
  }

  // C. Formats like BTCUSDT.P or ETHUSDT.PERP
  if (/^[A-Z0-9]{3,15}\.(P|PERP)$/i.test(sym)) {
    return "crypto";
  }

  // -------------------------
  // 2️⃣ COMMODITY DETECTION (Yahoo Finance Futures)
  // -------------------------
  const commodities = ["GC=F", "SI=F", "CL=F", "NG=F", "HG=F", "ZC=F"];
  if (commodities.includes(sym)) return "commodity";

  // -------------------------
  // 3️⃣ STOCKS (default)
  // -------------------------

  return "stock";
}


export function splitCryptoPair(symbol: string) {
  const s = symbol.toUpperCase();

  // Case 1: BTC/USDT or BTC-USDT
  if (s.includes("/")) {
    const [base, quote] = s.split("/");
    return { base, quote };
  }
  if (s.includes("-")) {
    const [base, quote] = s.split("-");
    return { base, quote };
  }

  // Case 2: BTCUSDT → BTC + USDT (common split logic)
  const stablecoins = ["USDT", "USDC", "BUSD", "DAI", "USD"];
  for (const sc of stablecoins) {
    if (s.endsWith(sc)) {
      return { base: s.replace(sc, ""), quote: sc };
    }
  }

  // Fallback
  return { base: s.slice(0, 3), quote: s.slice(3) };
}

