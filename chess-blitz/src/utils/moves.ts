// ==============================================
// Chess Blitz - Move Utility Functions
// ==============================================

export interface ParsedMove {
  san: string;
  from: string;
  to: string;
}

/**
 * Parse moves from PGN string
 * Returns array of move objects with san notation
 * Note: from/to are empty strings since PGN only contains SAN notation
 */
export function parseMovesFromPgn(pgn: string | undefined): ParsedMove[] {
  if (!pgn) return [];

  // Split by move numbers (e.g., "1.", "2.", etc.) and extract individual moves
  const moveStrings = pgn
    .split(/\d+\./)
    .filter(Boolean)
    .flatMap((m) => m.trim().split(/\s+/).filter(Boolean));

  // Return simplified format - we don't have from/to from PGN
  return moveStrings.map((san) => ({ san, from: '', to: '' }));
}

/**
 * Convert game result to player perspective
 */
export function getPlayerResult(
  result: '1-0' | '0-1' | '1/2-1/2' | '*' | null,
  playerColor: 'w' | 'b'
): 'win' | 'loss' | 'draw' | null {
  if (!result || result === '*') return null;
  if (result === '1/2-1/2') return 'draw';

  const whiteWon = result === '1-0';
  const playerIsWhite = playerColor === 'w';

  if ((whiteWon && playerIsWhite) || (!whiteWon && !playerIsWhite)) {
    return 'win';
  }
  return 'loss';
}

/**
 * Convert multiplayer result reason to game status
 */
export function getGameStatusFromReason(
  result: string | null,
  resultReason: string | null
): 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' {
  if (!result) return 'playing';

  switch (resultReason) {
    case 'checkmate':
      return 'checkmate';
    case 'stalemate':
      return 'stalemate';
    case 'resignation':
    case 'timeout':
      return 'resigned';
    default:
      if (result === '1/2-1/2') return 'draw';
      return 'playing';
  }
}
