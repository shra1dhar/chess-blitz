import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, createToken, TokenError, TOKEN_CONFIG, ELO } from '@chess-blitz/shared';

/**
 * POST /api/auth/refresh
 * Refresh an existing token
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 });
    }

    const oldToken = authHeader.slice(7);
    const oldPayload = await verifyToken(oldToken);

    // Preserve ELO from old token, or use default if missing
    const elo = oldPayload.elo || {
      bullet: ELO.STARTING,
      blitz: ELO.STARTING,
      rapid: ELO.STARTING,
      classical: ELO.STARTING,
    };

    const token = await createToken({
      playerId: oldPayload.playerId,
      displayName: oldPayload.displayName,
      elo,
    });

    // Calculate expiresAt from token config
    const expiresAt = Date.now() + TOKEN_CONFIG.EXPIRY_SECONDS * 1000;

    return NextResponse.json({
      token,
      playerId: oldPayload.playerId,
      displayName: oldPayload.displayName,
      elo,
      expiresAt,
    });
  } catch (error) {
    if (error instanceof TokenError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[Auth] Failed to refresh token:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
