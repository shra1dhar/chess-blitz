import { ELO } from "../types/constants";
import type { TournamentType } from "../types/constants";

/**
 * Calculate expected score using ELO formula.
 */
export function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculate ELO change after a game.
 */
export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  actualScore: number, // 1 for win, 0.5 for draw, 0 for loss
  kFactor: number = ELO.K_FACTOR
): number {
  const expected = expectedScore(playerElo, opponentElo);
  return Math.round(kFactor * (actualScore - expected));
}

/**
 * Calculate new ELO rating.
 */
export function calculateNewElo(
  currentElo: number,
  opponentElo: number,
  actualScore: number,
  kFactor: number = ELO.K_FACTOR
): number {
  const change = calculateEloChange(currentElo, opponentElo, actualScore, kFactor);
  return Math.max(ELO.FLOOR, currentElo + change);
}

/**
 * Calculate ELO changes for both players after a game.
 */
export function calculateGameEloChanges(
  whiteElo: number,
  blackElo: number,
  winner: "white" | "black" | "draw"
): {
  whiteChange: number;
  blackChange: number;
  whiteNew: number;
  blackNew: number;
} {
  let whiteScore: number;
  let blackScore: number;

  switch (winner) {
    case "white":
      whiteScore = 1;
      blackScore = 0;
      break;
    case "black":
      whiteScore = 0;
      blackScore = 1;
      break;
    case "draw":
      whiteScore = 0.5;
      blackScore = 0.5;
      break;
  }

  const whiteChange = calculateEloChange(whiteElo, blackElo, whiteScore);
  const blackChange = calculateEloChange(blackElo, whiteElo, blackScore);

  return {
    whiteChange,
    blackChange,
    whiteNew: Math.max(ELO.FLOOR, whiteElo + whiteChange),
    blackNew: Math.max(ELO.FLOOR, blackElo + blackChange),
  };
}

/**
 * Get the ELO column name for a tournament type.
 */
export function getEloColumn(tournamentType: TournamentType): string {
  const columns: Record<TournamentType, string> = {
    bullet: "elo_bullet",
    blitz: "elo_blitz",
    rapid: "elo_rapid",
    classical: "elo_classical",
  };
  return columns[tournamentType];
}

/**
 * Determine bot difficulty based on player ELO.
 */
export function determineBotDifficulty(playerElo: number): "easy" | "medium" | "hard" {
  if (playerElo < 1100) return "easy";
  if (playerElo < 1600) return "medium";
  return "hard";
}

/**
 * Get bot ELO for a difficulty level.
 */
export function getBotElo(difficulty: "easy" | "medium" | "hard"): number {
  const elos: Record<string, number> = {
    easy: 900,
    medium: 1350,
    hard: 2000,
  };
  return elos[difficulty];
}
