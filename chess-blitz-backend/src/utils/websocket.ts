import type { ServerMessage } from "../types/messages";
import { MAX_MESSAGE_SIZE_BYTES } from "../types/constants";

/**
 * Safely send a message to a WebSocket.
 * Checks readyState before sending to avoid errors.
 */
export function safeSend(ws: WebSocket, data: ServerMessage): boolean {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  } catch (error) {
    console.error("[WebSocket] Failed to send message:", error);
    return false;
  }
}

/**
 * Safely close a WebSocket connection.
 * Checks readyState before closing to avoid errors.
 */
export function safeClose(ws: WebSocket, code?: number, reason?: string): boolean {
  try {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(code ?? 1000, reason ?? "Closing");
      return true;
    }
    return false;
  } catch (error) {
    console.error("[WebSocket] Failed to close:", error);
    return false;
  }
}

/**
 * Broadcast a message to multiple WebSockets.
 */
export function broadcast(sockets: WebSocket[], data: ServerMessage): void {
  const message = JSON.stringify(data);
  for (const ws of sockets) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    } catch (error) {
      console.error("[WebSocket] Broadcast failed for socket:", error);
    }
  }
}

// Rate limiting functions have been moved to rate-limiter.ts
// Use: import { checkRateLimit, RATE_LIMIT_CONFIGS } from "./rate-limiter";

/**
 * Validate message size.
 */
export function validateMessageSize(message: string | ArrayBuffer): boolean {
  const size = typeof message === "string" ? new TextEncoder().encode(message).length : message.byteLength;
  return size <= MAX_MESSAGE_SIZE_BYTES;
}

/**
 * Parse and validate a client message.
 */
export function parseClientMessage(message: string | ArrayBuffer): {
  success: boolean;
  data?: unknown;
  error?: string;
} {
  try {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    const data = JSON.parse(text);

    if (!data || typeof data !== "object" || !("type" in data)) {
      return { success: false, error: "Invalid message format" };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: "Invalid JSON" };
  }
}
