// ==============================================
// Chess Blitz - Custom Pieces Utility
// ==============================================
// Generates customPieces prop for react-chessboard based on piece set selection

import type { ReactElement } from 'react';
import type { PieceSet } from '@/types/chess';
import { PIECE_SETS } from '@/types/chess';

// Piece type mapping: react-chessboard uses 'wP', 'bN', etc.
type PieceCode =
  | 'wP'
  | 'wN'
  | 'wB'
  | 'wR'
  | 'wQ'
  | 'wK'
  | 'bP'
  | 'bN'
  | 'bB'
  | 'bR'
  | 'bQ'
  | 'bK';

// Map piece codes to file names
const PIECE_FILE_MAP: Record<PieceCode, string> = {
  wP: 'white-pawn',
  wN: 'white-knight',
  wB: 'white-bishop',
  wR: 'white-rook',
  wQ: 'white-queen',
  wK: 'white-king',
  bP: 'black-pawn',
  bN: 'black-knight',
  bB: 'black-bishop',
  bR: 'black-rook',
  bQ: 'black-queen',
  bK: 'black-king',
};

interface PieceFnArgs {
  isDragging: boolean;
  squareWidth: number;
  square?: string;
}

type CustomPieceFn = (args: PieceFnArgs) => ReactElement;
type CustomPieces = Partial<Record<PieceCode, CustomPieceFn>>;

/**
 * Generate customPieces prop for react-chessboard based on piece set.
 * Returns undefined for 'classic' piece set (uses library's built-in SVGs).
 */
export function getCustomPieces(pieceSet: PieceSet): CustomPieces | undefined {
  if (pieceSet === 'classic') {
    return undefined;
  }

  const config = PIECE_SETS[pieceSet];
  if (!config.basePath) {
    return undefined;
  }

  const pieces: CustomPieces = {};

  (Object.keys(PIECE_FILE_MAP) as PieceCode[]).forEach((pieceCode) => {
    const fileName = PIECE_FILE_MAP[pieceCode];
    const imagePath = `${config.basePath}/${fileName}.png`;

    pieces[pieceCode] = ({ squareWidth }: PieceFnArgs): ReactElement => (
      <img
        src={imagePath}
        alt={fileName}
        style={{
          width: squareWidth,
          height: squareWidth,
          objectFit: 'contain',
          // Prevent drag ghost image issues
          pointerEvents: 'none',
        }}
        draggable={false}
      />
    );
  });

  return pieces;
}

/**
 * Get piece image URL for a specific piece (used in promotion dialog).
 * Returns null for classic piece set.
 */
export function getPieceImageUrl(
  pieceSet: PieceSet,
  piece: 'q' | 'r' | 'b' | 'n',
  color: 'w' | 'b'
): string | null {
  if (pieceSet === 'classic') {
    return null;
  }

  const config = PIECE_SETS[pieceSet];
  if (!config.basePath) {
    return null;
  }

  const pieceNames: Record<string, string> = {
    q: 'queen',
    r: 'rook',
    b: 'bishop',
    n: 'knight',
  };

  const colorName = color === 'w' ? 'white' : 'black';
  return `${config.basePath}/${colorName}-${pieceNames[piece]}.png`;
}
