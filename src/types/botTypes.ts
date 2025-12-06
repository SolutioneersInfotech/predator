export interface BotConfig {
  name: string;
  strategy_type: "RSI" | "Custom";
  timeframe: string;

  configuration: {
    // legacy/pine fields (kept for backward compatibility)
    oversold?: string;    // maps to rsiBuy
    overbought?: string;  // maps to rsiSell
    period?: string;      // maps to timeframe
    pineScript?: string;

    // optional: new RSI-specific typed fields (not required by UI)
    rsiBuy?: number;
    rsiSell?: number;
    quantity?: number;
  };

  broker_config: {
    apiKey: string;
    apiSecret: string;
    apiEndpoint?: string; // optional text ID of exchange or endpoint string
  };

  symbol?: string;
}
