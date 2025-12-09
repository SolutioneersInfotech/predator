import axios from "axios";

const DELTA_BASE_URL = "https://cdn-ind.testnet.deltaex.org";


const PRODUCT_CACHE_TTL = 60 * 1000; // 1 minute
let PRODUCT_CACHE: any[] = [];
let LAST_FETCH = 0;

/**
 * Fetch ALL contract specs from Delta (cached)
 */
export async function getDeltaProducts() {
  const now = Date.now();
  const age = now - LAST_FETCH;

  console.log(
    `🔍 [DeltaProducts] Request received | Cache age=${age}ms | Cache size=${PRODUCT_CACHE.length}`
  );

  // Return cached if not expired
  if (PRODUCT_CACHE.length > 0 && age < PRODUCT_CACHE_TTL) {
    console.log("📦 [DeltaProducts] Returning cached product list");
    return PRODUCT_CACHE;
  }

  console.log("🌐 [DeltaProducts] Fetching products from Delta API:", DELTA_BASE_URL);

  try {
    const res = await axios.get(`${DELTA_BASE_URL}/v2/products`);
    PRODUCT_CACHE = res.data.result;
    LAST_FETCH = now;

    console.log(
      `✅ [DeltaProducts] Fetched ${PRODUCT_CACHE.length} products | Updated cache timestamp`
    );

    return PRODUCT_CACHE;
  } catch (err: any) {
    console.error("❌ [DeltaProducts] Failed to fetch from API:", err?.message || err);
    throw err;
  }
}

/**
 * Get one specific product by symbol
 */
export async function getDeltaProduct(symbol: string) {
  console.log(`🔎 [DeltaProduct] Looking up symbol: ${symbol}`);

  const products = await getDeltaProducts();

  const match = products.find(
    (p: any) => p.symbol.toUpperCase() === symbol.toUpperCase()
  );

  if (!match) {
    console.log(
      `⚠ [DeltaProduct] No match found for symbol: ${symbol} | Available symbols:`,
      products.map((p) => p.symbol).slice(0, 10),
      "..."
    );
  } else {
    console.log(
      `✅ [DeltaProduct] Found product: ${match.symbol} | contract_type=${match.contract_type} | contract_value=${match.contract_value}`
    );
  }

  return match;
}

/**
 * Convert trade LOTS into real contract SIZE (linear or inverse)
 */
export async function computeContractSize(symbol: string, latestPrice: number) {
  console.log(
    `🧮 [ContractSize] Computing contract size for ${symbol} at price=${latestPrice}`
  );

  const product = await getDeltaProduct(symbol);

  if (!product) {
    console.log(`❌ [ContractSize] No Delta product found for ${symbol}`);
    throw new Error(`Delta product not found for symbol ${symbol}`);
  }

  console.log(
    `🔧 [ContractSize] Product config → type=${product.contract_type} | value=${product.contract_value}`
  );

  const contractValue = Number(product.contract_value.replace(" USD", ""));

  let size;

  if (product.contract_type === "inverse") {
    console.log("📘 [ContractSize] Inverse contract detected → formula: contract_value / price");
    size = contractValue / latestPrice;
  } else {
    console.log("📗 [ContractSize] Linear contract detected → size = contract_value");
    size = contractValue;
  }

  console.log(
    `🎯 [ContractSize] Final computed size = ${size} (for 1 lot of ${symbol})`
  );

  return size;
}
