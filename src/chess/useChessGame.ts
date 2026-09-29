import { Chess, type Move, type Square } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { EventId } from '../sound/events'
import type { BotSettings } from '../sound/presets'
import { detectMoveEvents } from './detectEvents'
import { stockfish } from './stockfish'

export interface EventPayload {
  events: EventId[]
  san?: string
  from?: string
  to?: string
}

interface Options {
  onEvents: (payload: EventPayload) => void
  bot: BotSettings
}

export function useChessGame({ onEvents, bot }: Options) {
  const chessRef = useRef(new Chess())
  const [fen, setFen] = useState(() => chessRef.current.fen())
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [selected, setSelected] = useState<Square | null>(null)

  const onEventsRef = useRef(onEvents)
  onEventsRef.current = onEvents

  const sync = useCallback(() => setFen(chessRef.current.fen()), [])

  /** Try a move; emits sound events. Returns true if legal. */
  const tryMove = useCallback(
    (from: string, to: string, promotion = 'q'): boolean => {
      const chess = chessRef.current
      let move: Move
      try {
        move = chess.move({ from, to, promotion })
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

  const botOn = bot.kind !== 'off'

  const undo = useCallback(() => {
    const chess = chessRef.current
    stockfish.cancel()
    chess.undo()
    // With a bot on, undo its reply too so it's the human's turn again.
    if (botOn && chess.turn() === bot.side) chess.undo()
    setSelected(null)
    sync()
  }, [botOn, bot.side, sync])

  const reset = useCallback(() => {
    stockfish.cancel()
    chessRef.current.reset()
    setSelected(null)
    sync()
    onEventsRef.current({ events: ['gameStart'] })
  }, [sync])

  const flip = useCallback(() => setOrientation((o) => (o === 'white' ? 'black' : 'white')), [])

  // Show the human's side at the bottom when the bot side changes.
  useEffect(() => {
    if (botOn) setOrientation(bot.side === 'w' ? 'black' : 'white')
  }, [botOn, bot.side])

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

  // Opponent bot.
  const turn = chessRef.current.turn()
  const gameOver = chessRef.current.isGameOver()
  useEffect(() => {
    if (!botOn || turn !== bot.side || gameOver) return
    let cancelled = false
    const delay = 350 + Math.random() * 500

    const playRandom = () => {
      const moves = chessRef.current.moves({ verbose: true })
      if (!moves.length) return
      // Prefer captures/checks a little so the interesting sounds show up.
      const spicy = moves.filter((m) => m.captured || m.san.includes('+'))
      const pool = spicy.length && Math.random() < 0.5 ? spicy : moves
      const m = pool[Math.floor(Math.random() * pool.length)]
      tryMove(m.from, m.to)
    }

    const playStockfish = async () => {
      const startFen = chessRef.current.fen()
      try {
        stockfish.setSkill(bot.skill)
        const m = await stockfish.bestMove(startFen, bot.moveTimeMs)
        if (cancelled || !m || chessRef.current.fen() !== startFen) return
        // Small pause so a fast engine reply still feels like an opponent.
        setTimeout(() => {
          if (!cancelled && chessRef.current.fen() === startFen) tryMove(m.from, m.to, m.promotion)
        }, delay)
      } catch (err) {
        console.warn('[bot] engine failed, falling back to random', err)
        if (!cancelled) playRandom()
      }
    }

    let timer: number | undefined
    if (bot.kind === 'stockfish') void playStockfish()
    else timer = window.setTimeout(playRandom, delay)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [botOn, bot.kind, bot.side, bot.skill, bot.moveTimeMs, turn, gameOver, fen, tryMove])

  // Warm up the engine as soon as Stockfish is selected.
  useEffect(() => {
    if (bot.kind === 'stockfish') stockfish.init().catch(() => undefined)
  }, [bot.kind])

  const engineStatus = useSyncExternalStore(
    (cb) => stockfish.subscribe(cb),
    () => stockfish.getStatus(),
  )

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
    engineStatus,
    tryMove,
    clickSquare,
    undo,
    reset,
    flip,
  }
}
