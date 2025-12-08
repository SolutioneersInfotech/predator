// src/ws/wsServer.ts
// import WebSocket, { Server as WSServer } from "ws";
import http from "http";
import eventBus from "./eventBus.js";
import { WebSocketServer } from "ws";

type ClientMeta = {
  ws: WebSocket;
  subscribedBotIds: Set<string>;
};


let wss: WebSocketServer | null = null;

// Keep map of clients for optional targeted broadcasts
const clients = new Set<ClientMeta>();

/**
 * Start WS server attached to existing HTTP server
 */
export function startWebSocketServer(server: http.Server) {
  if (wss) return wss; // already started
  wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws, req) => {
    const meta: ClientMeta = { ws, subscribedBotIds: new Set() };
    clients.add(meta);

    ws.on("message", (data) => {
      // Expect JSON commands like: { action: "subscribe", botId: "..." }
      try {
        const msg = JSON.parse(String(data));
        if (msg.action === "subscribe" && msg.botId) {
          meta.subscribedBotIds.add(String(msg.botId));
        } else if (msg.action === "unsubscribe" && msg.botId) {
          meta.subscribedBotIds.delete(String(msg.botId));
        }
      } catch (e) {
        // ignore
      }
    });

    ws.on("close", () => {
      clients.delete(meta);
    });

    // optional ping/pong keepalive
    ws.on("error", () => {
      clients.delete(meta);
      try { ws.terminate(); } catch {}
    });
  });

  // Listen to eventBus events and broadcast to interested clients
  eventBus.on("trade", (payload) => {
    // payload: { botId, trade }
    broadcastToSubscribers(payload.botId, { type: "trade", data: payload.trade });
  });

  eventBus.on("runtime", (payload) => {
    // payload: { botId, runtime, pnlOptional? }
    broadcastToSubscribers(payload.botId, { type: "runtime", data: payload });
  });

  return wss;
}

/**
 * Broadcasts a message to clients that subscribed to the bot or to all if no subs present.
 */
function broadcastToSubscribers(botId: string, message: any) {
  const json = JSON.stringify(message);

  // If no clients subscribed specifically, broadcast to everyone (optional behavior)
  let someoneSubscribed = false;
  for (const c of clients) {
    if (c.subscribedBotIds.size > 0) {
      someoneSubscribed = true;
      break;
    }
  }

  for (const c of clients) {
    try {
      if (!someoneSubscribed || c.subscribedBotIds.has(botId)) {
        c.ws.send(json);
      }
    } catch (err) {
      // ignore write errors; client will close eventually
    }
  }
}

/**
 * Optional programmatic send (send to all subscribers / all clients)
 */
export function publishTrade(botId: string, trade: any) {
  eventBus.emit("trade", { botId, trade });
}

export function publishRuntime(botId: string, payload: any) {
  // payload can include runtime and current computed pnl
  eventBus.emit("runtime", { botId, ...payload });
}
