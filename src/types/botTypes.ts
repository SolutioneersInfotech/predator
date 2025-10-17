export interface BotConfig {
    name: string;
    strategy_type: "RSI" | "Custom";
    timeframe: string;
    configuration: {
        oversold?: string;
        overbought?: string;
        period?: string;
        pineScript?: string;
    };
    broker_config: {
        apiKey: string;
        apiSecret: string;
        apiEndpoint?: string;
    };
    symbol?: string; // 👈 naya field yahan add kiya gaya
}
