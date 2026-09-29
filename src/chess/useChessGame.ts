import { Chess, type Move, type Square } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EventId } from '../sound/events'
import { detectMoveEvents } from './detectEvents'

export interface EventPayload {
  events: EventId[]
  san?: string
  from?: string
  to?: string
}

interface Options {
  onEvents: (payload: EventPayload) => void
  botPlaysBlack: boolean
}

export function useChessGame({ onEvents, botPlaysBlack }: Options) {
  const chessRef = useRef(new Chess())
  const [fen, setFen] = useState(() => chessRef.current.fen())
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [selected, setSelected] = useState<Square | null>(null)

  const onEventsRef = useRef(onEvents)
  onEventsRef.current = onEvents

  const sync = useCallback(() => setFen(chessRef.current.fen()), [])

  /** Try a move; emits sound events. Returns true if legal. */
  const tryMove = useCallback(
    (from: string, to: string): boolean => {
      const chess = chessRef.current
      let move: Move
      try {
        move = chess.move({ from, to, promotion: 'q' })
      } catch {
        onEventsRef.current({ events: ['illegal'], from, to })
        return false
      }
      sync()
      setSelected(null)
      onEventsRef.current({ events: detectMoveEvents(chess, move), san: move.san, from, to })
      return true
    },
    [sync],
  )

  const undo = useCallback(() => {
    const chess = chessRef.current
    // With the bot on, undo both plies so it's White's turn again.
    chess.undo()
    if (botPlaysBlack && chess.turn() === 'b') chess.undo()
    setSelected(null)
    sync()
  }, [botPlaysBlack, sync])

  const reset = useCallback(() => {
    chessRef.current.reset()
    setSelected(null)
    sync()
    onEventsRef.current({ events: ['gameStart'] })
  }, [sync])

  const flip = useCallback(() => setOrientation((o) => (o === 'white' ? 'black' : 'white')), [])

  /** Click-to-move handling. */
  const clickSquare = useCallback(
    (square: Square) => {
      const chess = chessRef.current
      const piece = chess.get(square)
      if (selected) {
        if (selected === square) return setSelected(null)
        if (piece && piece.color === chess.turn()) return setSelected(square)
        tryMove(selected, square)
        return
      }
      if (piece && piece.color === chess.turn()) setSelected(square)
    },
    [selected, tryMove],
  )

  // Random-move bot for Black.
  const turn = chessRef.current.turn()
  const gameOver = chessRef.current.isGameOver()
  useEffect(() => {
    if (!botPlaysBlack || turn !== 'b' || gameOver) return
    const delay = 350 + Math.random() * 500
    const timer = setTimeout(() => {
      const moves = chessRef.current.moves({ verbose: true })
      if (!moves.length) return
      // Prefer captures/checks a little so the interesting sounds show up.
      const spicy = moves.filter((m) => m.captured || m.san.includes('+'))
      const pool = spicy.length && Math.random() < 0.5 ? spicy : moves
      const m = pool[Math.floor(Math.random() * pool.length)]
      tryMove(m.from, m.to)
    }, delay)
    return () => clearTimeout(timer)
  }, [botPlaysBlack, turn, gameOver, fen, tryMove])

  const legalTargets = useMemo(
    () => (selected ? chessRef.current.moves({ square: selected, verbose: true }).map((m) => m.to) : []),
    [selected, fen],
  )

  const history = chessRef.current.history({ verbose: true })
  const lastMove = history[history.length - 1] ?? null

  const chess = chessRef.current
  const status = chess.isCheckmate()
    ? `Checkmate · ${turn === 'w' ? 'Black' : 'White'} wins`
    : chess.isStalemate()
      ? 'Stalemate'
      : chess.isDraw()
        ? 'Draw'
        : `${turn === 'w' ? 'White' : 'Black'} to move${chess.isCheck() ? ' · Check' : ''}`

  const kingInCheck = chess.isCheck()
    ? (chess.board().flat().find((p) => p && p.type === 'k' && p.color === turn)?.square ?? null)
    : null

  return {
    fen,
    orientation,
    selected,
    legalTargets,
    lastMove,
    kingInCheck,
    status,
    turn,
    moveCount: history.length,
    tryMove,
    clickSquare,
    undo,
    reset,
    flip,
  }
}
