import { Chess, type Square, type PieceSymbol, type Color as ChessJsColor } from "chess.js";
import { GAME } from "../types/constants";

/**
 * Check if a position has insufficient material for checkmate.
 * Returns true if neither side can checkmate.
 */
export function hasInsufficientMaterial(chess: Chess): boolean {
  // chess.js has this built-in
  return chess.isInsufficientMaterial();
}

/**
 * Check if a specific color has sufficient material to checkmate.
 * Used for timeout vs insufficient material draws.
 */
export function colorHasSufficientMaterial(chess: Chess, color: "w" | "b"): boolean {
  const board = chess.board();
  const pieces: PieceSymbol[] = [];

  for (const row of board) {
    for (const square of row) {
      if (square && square.color === color && square.type !== "k") {
        pieces.push(square.type);
      }
    }
  }

  // No pieces = insufficient
  if (pieces.length === 0) return false;

  // Any pawn, rook, or queen = sufficient
  if (pieces.some((p) => p === "p" || p === "r" || p === "q")) return true;

  // Two bishops on different colors = sufficient
  if (pieces.filter((p) => p === "b").length >= 2) {
    // Check if bishops are on different colored squares
    const bishopSquares: string[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = board[r][c];
        if (square && square.color === color && square.type === "b") {
          bishopSquares.push((r + c) % 2 === 0 ? "light" : "dark");
        }
      }
    }
    if (bishopSquares.includes("light") && bishopSquares.includes("dark")) {
      return true;
    }
  }

  // Bishop + knight = sufficient
  if (pieces.includes("b") && pieces.includes("n")) return true;

  // Two or more knights = sufficient (can technically mate in some positions)
  if (pieces.filter((p) => p === "n").length >= 2) return true;

  // Single minor piece = insufficient
  return false;
}

/**
 * Check if the 50-move rule can be claimed.
 */
export function canClaimFiftyMoveRule(chess: Chess): boolean {
  const history = chess.history({ verbose: true });
  let halfMoveClock = 0;

  // Count backwards from current position
  for (let i = history.length - 1; i >= 0; i--) {
    const move = history[i];
    if (move.captured || move.piece === "p") {
      break;
    }
    halfMoveClock++;
  }

  return halfMoveClock >= GAME.FIFTY_MOVE_RULE_HALFMOVES;
}

/**
 * Check if 75-move rule applies (automatic draw).
 */
export function is75MoveRule(halfMoveClock: number): boolean {
  return halfMoveClock >= GAME.SEVENTY_FIVE_MOVE_RULE_HALFMOVES;
}

/**
 * Get position key for repetition detection.
 * Uses FEN without halfmove and fullmove counters.
 */
export function getPositionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/**
 * Check if threefold repetition can be claimed.
 */
export function canClaimThreefoldRepetition(positionHistory: Map<string, number>, currentFen: string): boolean {
  const key = getPositionKey(currentFen);
  return (positionHistory.get(key) ?? 0) >= 3;
}

/**
 * Check if fivefold repetition (automatic draw).
 */
export function isFivefoldRepetition(positionHistory: Map<string, number>, currentFen: string): boolean {
  const key = getPositionKey(currentFen);
  return (positionHistory.get(key) ?? 0) >= 5;
}

/**
 * Validate move format (e.g., "e2", "e4").
 */
export function validateSquareFormat(square: string): boolean {
  return /^[a-h][1-8]$/.test(square);
}

/**
 * Validate promotion piece.
 */
export function validatePromotion(promotion: string | undefined): "q" | "r" | "b" | "n" | undefined {
  if (!promotion) return undefined;
  const lower = promotion.toLowerCase();
  if (["q", "r", "b", "n"].includes(lower)) {
    return lower as "q" | "r" | "b" | "n";
  }
  return "q"; // Default to queen
}

/**
 * Convert chess.js color to our Color type.
 */
export function chessColorToColor(color: ChessJsColor): "white" | "black" {
  return color === "w" ? "white" : "black";
}

/**
 * Convert our Color type to chess.js color.
 */
export function colorToChessColor(color: "white" | "black"): ChessJsColor {
  return color === "white" ? "w" : "b";
}

/**
 * Create a new chess game instance.
 */
export function createChessGame(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess();
}

/**
 * Get all legal moves for the current position.
 */
export function getLegalMoves(chess: Chess): string[] {
  return chess.moves();
}

/**
 * Check if a move is legal.
 */
export function isLegalMove(chess: Chess, from: string, to: string, promotion?: string): boolean {
  try {
    const tempChess = new Chess(chess.fen());
    const result = tempChess.move({ from: from as Square, to: to as Square, promotion: promotion as "q" | "r" | "b" | "n" });
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Make a move and return the result.
 */
export function makeMove(
  chess: Chess,
  from: string,
  to: string,
  promotion?: string
): {
  success: boolean;
  san?: string;
  captured?: PieceSymbol;
  isCheck?: boolean;
  isCheckmate?: boolean;
  error?: string;
} {
  try {
    const move = chess.move({
      from: from as Square,
      to: to as Square,
      promotion: validatePromotion(promotion),
    });

    if (!move) {
      return { success: false, error: "Invalid move" };
    }

    return {
      success: true,
      san: move.san,
      captured: move.captured,
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
