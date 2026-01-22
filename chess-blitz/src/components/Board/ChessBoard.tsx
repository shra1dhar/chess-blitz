'use client';

import { useState, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square, PieceSymbol, Color } from 'chess.js';
import type { UserSettings } from '@/types/chess';
import { ANIMATION_SPEEDS } from '@/types/chess';
import styles from './ChessBoard.module.scss';

interface ChessBoardProps {
  fen: string;
  playerColor: Color;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  getLegalMoves: (square: Square) => Square[];
  lastMove: { from: Square; to: Square } | null;
  isPlayerTurn: boolean;
  isCheck: boolean;
  showLegalMoves: boolean;
  animationSpeed: UserSettings['animationSpeed'];
}

export default function ChessBoard({
  fen,
  playerColor,
  onMove,
  getLegalMoves,
  lastMove,
  isPlayerTurn,
  isCheck,
  showLegalMoves,
  animationSpeed,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [showPromotion, setShowPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  // Determine board orientation
  const boardOrientation = playerColor === 'w' ? 'white' : 'black';

  // Animation duration
  const animationDuration = ANIMATION_SPEEDS[animationSpeed];

  // Handle square click for click-to-move
  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!isPlayerTurn) return;

      // If a piece is selected and this is a legal move target
      if (selectedSquare && legalMoves.includes(square)) {
        // Check for pawn promotion
        const piece = getPieceAtSquare(fen, selectedSquare);
        const isPromotion =
          piece?.type === 'p' &&
          ((piece.color === 'w' && square[1] === '8') ||
            (piece.color === 'b' && square[1] === '1'));

        if (isPromotion) {
          setShowPromotion({ from: selectedSquare, to: square });
        } else {
          onMove(selectedSquare, square);
        }

        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Select a new piece
      const moves = getLegalMoves(square);
      if (moves.length > 0) {
        setSelectedSquare(square);
        setLegalMoves(moves);
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    },
    [selectedSquare, legalMoves, isPlayerTurn, getLegalMoves, onMove, fen]
  );

  // Handle piece drop (drag and drop)
  const handlePieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      if (!isPlayerTurn) return false;

      // Check for pawn promotion
      const piece = getPieceAtSquare(fen, sourceSquare);
      const isPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && targetSquare[1] === '8') ||
          (piece.color === 'b' && targetSquare[1] === '1'));

      if (isPromotion) {
        setShowPromotion({ from: sourceSquare, to: targetSquare });
        return false; // Don't complete the move yet
      }

      const success = onMove(sourceSquare, targetSquare);

      // Clear selection after drop
      setSelectedSquare(null);
      setLegalMoves([]);

      return success;
    },
    [isPlayerTurn, onMove, fen]
  );

  // Handle promotion selection
  const handlePromotion = useCallback(
    (piece: PieceSymbol) => {
      if (showPromotion) {
        onMove(showPromotion.from, showPromotion.to, piece);
        setShowPromotion(null);
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    },
    [showPromotion, onMove]
  );

  // Handle piece drag begin
  const handlePieceDragBegin = useCallback(
    (_piece: string, sourceSquare: Square) => {
      if (!isPlayerTurn) return false;

      const moves = getLegalMoves(sourceSquare);
      setSelectedSquare(sourceSquare);
      setLegalMoves(moves);
      return moves.length > 0;
    },
    [isPlayerTurn, getLegalMoves]
  );

  // Handle piece drag end
  const handlePieceDragEnd = useCallback(() => {
    // Keep selection if promotion dialog is showing
    if (!showPromotion) {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [showPromotion]);

  // Custom square styles
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Last move highlight
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: 'var(--board-last-move)',
      };
      styles[lastMove.to] = {
        backgroundColor: 'var(--board-last-move)',
      };
    }

    // Selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'var(--board-selected)',
      };
    }

    // Legal move highlights
    if (showLegalMoves && legalMoves.length > 0) {
      legalMoves.forEach((square) => {
        const isCapture = getPieceAtSquare(fen, square) !== null;
        styles[square] = {
          ...styles[square],
          background: isCapture
            ? `radial-gradient(transparent 0%, transparent 79%, var(--board-legal-capture) 80%)`
            : `radial-gradient(var(--board-legal-move) 25%, transparent 25%)`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
        };
      });
    }

    // Check highlight (find the king that's in check)
    if (isCheck) {
      // Get whose turn it is from FEN - that's the player in check
      const turn = fen.split(' ')[1] as Color;
      const kingSquare = findKingSquare(fen, turn);
      if (kingSquare) {
        styles[kingSquare] = {
          ...styles[kingSquare],
          backgroundColor: 'var(--board-check)',
        };
      }
    }

    return styles;
  }, [lastMove, selectedSquare, legalMoves, showLegalMoves, isCheck, fen]);

  return (
    <div className={styles.boardWrapper} data-board>
      <div className={styles.board}>
        <Chessboard
          position={fen}
          boardOrientation={boardOrientation}
          onPieceDrop={handlePieceDrop}
          onSquareClick={handleSquareClick}
          onPieceDragBegin={handlePieceDragBegin}
          onPieceDragEnd={handlePieceDragEnd}
          customSquareStyles={customSquareStyles}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
          customLightSquareStyle={{
            backgroundColor: 'var(--board-light)',
          }}
          customDarkSquareStyle={{
            backgroundColor: 'var(--board-dark)',
          }}
          animationDuration={animationDuration}
          arePiecesDraggable={isPlayerTurn}
          isDraggablePiece={({ piece }) => {
            return isPlayerTurn && piece[0] === playerColor;
          }}
        />
      </div>

      {/* Promotion Dialog */}
      {showPromotion && (
        <div className={styles.promotionOverlay}>
          <div className={styles.promotionDialog}>
            <p className={styles.promotionTitle}>Promote to:</p>
            <div className={styles.promotionOptions}>
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((piece) => (
                <button
                  key={piece}
                  className={styles.promotionOption}
                  onClick={() => handlePromotion(piece)}
                >
                  <PieceIcon piece={piece} color={playerColor} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to get piece at a square from FEN
function getPieceAtSquare(
  fen: string,
  square: Square
): { type: PieceSymbol; color: Color } | null {
  const [position] = fen.split(' ');
  const ranks = position.split('/');

  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(square[1]);

  let currentFile = 0;
  for (const char of ranks[rank]) {
    if (currentFile === file) {
      if (/[pnbrqk]/i.test(char)) {
        return {
          type: char.toLowerCase() as PieceSymbol,
          color: char === char.toUpperCase() ? 'w' : 'b',
        };
      }
      return null;
    }

    if (/\d/.test(char)) {
      currentFile += parseInt(char);
    } else {
      currentFile++;
    }

    if (currentFile > file) return null;
  }

  return null;
}

// Helper to find king square
function findKingSquare(fen: string, color: Color): Square | null {
  const king = color === 'w' ? 'K' : 'k';
  const [position] = fen.split(' ');
  const ranks = position.split('/');

  for (let rank = 0; rank < 8; rank++) {
    let file = 0;
    for (const char of ranks[rank]) {
      if (char === king) {
        const fileChar = String.fromCharCode('a'.charCodeAt(0) + file);
        const rankNum = 8 - rank;
        return `${fileChar}${rankNum}` as Square;
      }

      if (/\d/.test(char)) {
        file += parseInt(char);
      } else {
        file++;
      }
    }
  }

  return null;
}

// Piece icon component
function PieceIcon({ piece, color }: { piece: PieceSymbol; color: Color }) {
  const pieceChars: Record<PieceSymbol, string> = {
    k: color === 'w' ? '♔' : '♚',
    q: color === 'w' ? '♕' : '♛',
    r: color === 'w' ? '♖' : '♜',
    b: color === 'w' ? '♗' : '♝',
    n: color === 'w' ? '♘' : '♞',
    p: color === 'w' ? '♙' : '♟',
  };

  return <span className={styles.pieceIcon}>{pieceChars[piece]}</span>;
}
