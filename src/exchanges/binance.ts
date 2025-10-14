// exchanges/binance.ts
// import Binance from "binance-api-node";

// export interface OrderRequest {
//     symbol: string;           // "BTCUSDT"
//     side: "BUY" | "SELL";
//     quantity: number;         // base asset qty
//     price?: number;           // for LIMIT
//     type?: "MARKET" | "LIMIT";
//     newClientOrderId?: string;
// }

// export function createClient(apiKey: string, apiSecret: string) {
//     return Binance({ apiKey, apiSecret });
// }

// export async function placeBinanceOrder(apiKey: string, apiSecret: string, order: OrderRequest) {
//     const client = createClient(apiKey, apiSecret);
//     try {
//         if ((order.type || "MARKET") === "MARKET") {
//             const res = await client.order({
//                 symbol: order.symbol,
//                 side: order.side,
//                 type: "MARKET",
//                 quantity: order.quantity,
//             });
//             return res;
//         } else {
//             const res = await client.order({
//                 symbol: order.symbol,
//                 side: order.side,
//                 type: "LIMIT",
//                 quantity: order.quantity,
//                 price: order.price?.toString(),
//                 timeInForce: "GTC",
//                 newClientOrderId: order.newClientOrderId,
//             });
//             return res;
//         }
//     } catch (err: any) {
//         console.error("placeBinanceOrder error:", err?.response?.data || err?.message || err);
//         throw err;
//     }
// }

// export async function getBinanceBalances(apiKey: string, apiSecret: string) {
//     const client = createClient(apiKey, apiSecret);
//     const acc = await client.accountInfo();
//     return acc.balances;
// }

// import Binance from "binance-api-node";

// // Enum for order types
// export enum OrderType {
//     MARKET = "MARKET",
//     LIMIT = "LIMIT",
// }

// export interface OrderRequest {
//     symbol: string;           // "BTCUSDT"
//     side: "BUY" | "SELL";
//     quantity: number;         // base asset qty
//     price?: number;           // for LIMIT
//     type?: OrderType;         // fixed type
//     newClientOrderId?: string;
// }

// export function createClient(apiKey: string, apiSecret: string) {
//     return Binance({ apiKey, apiSecret });
// }

// export async function placeBinanceOrder(apiKey: string, apiSecret: string, order: OrderRequest) {
//     const client = createClient(apiKey, apiSecret);
//     try {
//         if ((order.type || OrderType.MARKET) === OrderType.MARKET) {
//             const res = await client.order({
//                 symbol: order.symbol,
//                 side: order.side,
//                 type: OrderType.MARKET,
//                 quantity: order.quantity.toString(), // quantity as string
//             });
//             return res;
//         } else {
//             const res = await client.order({
//                 symbol: order.symbol,
//                 side: order.side,
//                 type: OrderType.LIMIT,
//                 quantity: order.quantity.toString(), // quantity as string
//                 price: order.price?.toString(),      // price as string
//                 timeInForce: "GTC",
//                 newClientOrderId: order.newClientOrderId,
//             });
//             return res;
//         }
//     } catch (err: any) {
//         console.error("placeBinanceOrder error:", err?.response?.data || err?.message || err);
//         throw err;
//     }
// }

// export async function getBinanceBalances(apiKey: string, apiSecret: string) {
//     const client = createClient(apiKey, apiSecret);
//     const acc = await client.accountInfo();
//     return acc.balances;
// }
