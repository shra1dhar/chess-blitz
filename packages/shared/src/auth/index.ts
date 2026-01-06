import type { TournamentType } from "../types";

// Signing key for HMAC-SHA256 (hardcoded for guest-only simplicity)
// Note: This provides tamper resistance, not cryptographic secrecy
const SIGNING_KEY = "chess-blitz-guest-session-v1-a8f3e2d1c0b9";

export interface EloRatings {
  bullet: number;
  blitz: number;
  rapid: number;
  classical: number;
}

export interface TokenPayload {
  playerId: string;
  displayName: string;
  elo: EloRatings;
  exp: number;
  iat: number;
}

export const TOKEN_CONFIG = {
  EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 7 days
  REFRESH_BUFFER_MS: 5 * 60 * 1000, // 5 minutes before expiry
} as const;

export type TokenErrorCode =
  | "INVALID_FORMAT"
  | "INVALID_SIGNATURE"
  | "EXPIRED"
  | "MALFORMED_PAYLOAD";

export class TokenError extends Error {
  constructor(
    message: string,
    public code: TokenErrorCode
  ) {
    super(message);
    this.name = "TokenError";
  }
}

// Helper functions
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c: string) => c.charCodeAt(0));
}

let cachedKey: CryptoKey | null = null;

async function getSigningKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    const keyData = stringToBytes(SIGNING_KEY);
    cachedKey = await crypto.subtle.importKey(
      "raw",
      keyData.buffer as ArrayBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return cachedKey;
}

async function computeSignature(data: string): Promise<Uint8Array> {
  const key = await getSigningKey();
  const dataBytes = stringToBytes(data);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    dataBytes.buffer as ArrayBuffer
  );
  return new Uint8Array(signature);
}

async function verifySignature(
  data: string,
  signature: Uint8Array
): Promise<boolean> {
  const key = await getSigningKey();
  const dataBytes = stringToBytes(data);
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature.buffer as ArrayBuffer,
    dataBytes.buffer as ArrayBuffer
  );
}

/**
 * Create a signed token from payload data.
 * Adds exp and iat timestamps automatically.
 */
export async function createToken(
  payload: Omit<TokenPayload, "exp" | "iat">
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_CONFIG.EXPIRY_SECONDS,
  };

  const payloadJson = JSON.stringify(fullPayload);
  const payloadEncoded = base64UrlEncode(stringToBytes(payloadJson));
  const signature = await computeSignature(payloadEncoded);
  const signatureEncoded = base64UrlEncode(signature);

  return `${payloadEncoded}.${signatureEncoded}`;
}

/**
 * Verify a token's signature and expiration.
 * Returns the decoded payload if valid.
 * Throws TokenError if invalid.
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new TokenError("Invalid token format", "INVALID_FORMAT");
  }

  const [payloadEncoded, signatureEncoded] = parts;

  // Verify signature
  let signature: Uint8Array;
  try {
    signature = base64UrlDecode(signatureEncoded);
  } catch {
    throw new TokenError("Invalid signature encoding", "INVALID_FORMAT");
  }

  const isValid = await verifySignature(payloadEncoded, signature);
  if (!isValid) {
    throw new TokenError("Invalid signature", "INVALID_SIGNATURE");
  }

  // Decode payload
  let payload: TokenPayload;
  try {
    const payloadBytes = base64UrlDecode(payloadEncoded);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    payload = JSON.parse(payloadJson);
  } catch {
    throw new TokenError("Malformed payload", "MALFORMED_PAYLOAD");
  }

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new TokenError("Token expired", "EXPIRED");
  }

  return payload;
}

/**
 * Refresh a token by verifying it and issuing a new one with fresh timestamps.
 * Preserves playerId, displayName, and elo from the original token.
 */
export async function refreshToken(token: string): Promise<string> {
  const payload = await verifyToken(token);
  return createToken({
    playerId: payload.playerId,
    displayName: payload.displayName,
    elo: payload.elo,
  });
}

/**
 * Decode payload without verification (for display purposes only).
 * Returns null if the token format is invalid.
 */
export function decodePayload(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const payloadBytes = base64UrlDecode(parts[0]);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

/**
 * Quick check if a token is expired (without signature verification).
 * Returns true if expired or invalid format.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodePayload(token);
  if (!payload || !payload.exp) return true;
  return payload.exp < Math.floor(Date.now() / 1000);
}

/**
 * Check if a token should be refreshed (within buffer period of expiry).
 * Returns true if token will expire within REFRESH_BUFFER_MS.
 */
export function shouldRefreshToken(token: string): boolean {
  const payload = decodePayload(token);
  if (!payload || !payload.exp) return true;
  const bufferSeconds = TOKEN_CONFIG.REFRESH_BUFFER_MS / 1000;
  return payload.exp < Math.floor(Date.now() / 1000) + bufferSeconds;
}
