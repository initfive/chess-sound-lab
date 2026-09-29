import { Chessboard } from 'react-chessboard'
import type { CSSProperties } from 'react'
import type { Square } from 'chess.js'

interface Props {
  fen: string
  orientation: 'white' | 'black'
  selected: Square | null
  legalTargets: string[]
  lastMove: { from: string; to: string } | null
  kingInCheck: string | null
  turn: 'w' | 'b'
  onDrop: (from: string, to: string) => boolean
  onSquareClick: (square: Square) => void
}

/** Board colors mirror Take Take Take's "Original" theme (dark + light variants via CSS vars). */
export function Board({ fen, orientation, selected, legalTargets, lastMove, kingInCheck, turn, onDrop, onSquareClick }: Props) {
  const squareStyles: Record<string, CSSProperties> = {}
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: 'var(--board-move)' }
    squareStyles[lastMove.to] = { backgroundColor: 'var(--board-move)' }
  }
  if (selected) squareStyles[selected] = { backgroundColor: 'var(--board-selected)' }
  for (const sq of legalTargets) {
    squareStyles[sq] = {
      ...squareStyles[sq],
      backgroundImage: 'radial-gradient(circle, var(--board-dot) 22%, transparent 24%)',
    }
  }
  if (kingInCheck) {
    squareStyles[kingInCheck] = {
      backgroundImage: 'radial-gradient(circle, #F1B8AD 0%, #F35342 90%)',
    }
  }

  return (
    <Chessboard
      options={{
        id: 'sound-lab',
        position: fen,
        boardOrientation: orientation,
        animationDurationInMs: 180,
        showNotation: true,
        boardStyle: { borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--board-shadow)' },
        darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
        lightSquareStyle: { backgroundColor: 'var(--board-light)' },
        darkSquareNotationStyle: { color: 'var(--board-light)', fontWeight: 600, fontSize: 11 },
        lightSquareNotationStyle: { color: 'var(--board-dark)', fontWeight: 600, fontSize: 11 },
        dropSquareStyle: { boxShadow: 'inset 0 0 0 3px var(--accent-soft)' },
        squareStyles,
        canDragPiece: ({ piece }) => piece.pieceType[0] === turn,
        onPieceDrop: ({ sourceSquare, targetSquare }) => {
          if (!targetSquare || targetSquare === sourceSquare) return false
          return onDrop(sourceSquare, targetSquare)
        },
        onSquareClick: ({ square }) => onSquareClick(square as Square),
      }}
    />
  )
}
