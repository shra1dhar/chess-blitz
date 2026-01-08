import { NextResponse } from 'next/server';
import { createToken, TOKEN_CONFIG, ELO } from '@chess-blitz/shared';

/**
 * POST /api/auth/guest
 * Create a new guest player session
 */
export async function POST() {
  try {
    const playerId = crypto.randomUUID();
    const displayName = `Guest_${playerId.slice(0, 8)}`;
    const elo = {
      bullet: ELO.STARTING,
      blitz: ELO.STARTING,
      rapid: ELO.STARTING,
      classical: ELO.STARTING,
    };

    const token = await createToken({
      playerId,
      displayName,
      elo,
    });

    // Calculate expiresAt from token config
    const expiresAt = Date.now() + TOKEN_CONFIG.EXPIRY_SECONDS * 1000;

    return NextResponse.json({
      token,
      playerId,
      displayName,
      elo,
      expiresAt,
    });
  } catch (error) {
    console.error('[Auth] Failed to create guest session:', error);
    return NextResponse.json(
      { error: 'Failed to create guest session' },
      { status: 500 }
    );
  }
}
