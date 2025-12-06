import ccxt from "ccxt";

/**
 * Small exchange factory that returns a ccxt instance by exchange id.
 * You can extend this to read API keys from bot.broker_config if needed.
 */
export function exchangeFor(nameOrEndpoint: string, options: any) {
  // Accepts something like "binance" or an apiEndpoint string used in your broker_config
  const id = (nameOrEndpoint ?? "binance").toLowerCase();
  
  if (id.includes("bybit")) return new ccxt.bybit(options);
  if (id.includes("binance")) return new ccxt.binance(options);
  if (id.includes("okx")) return new ccxt.okx(options);
  if (id.includes("delta")) return new ccxt.delta(options);
  // default fallback
  return new ccxt.delta(options);
}
