import type { Chess, Move } from 'chess.js'
import type { EventId } from '../sound/events'

/** Translate a chess.js move (already applied to `chess`) into lab events. */
export function detectMoveEvents(chess: Chess, move: Move): EventId[] {
  const events: EventId[] = []
  if (chess.isCheckmate()) events.push('checkmate')
  else if (chess.isCheck()) events.push('check')
  if (move.promotion) events.push('promotion')
  if (move.flags.includes('k') || move.flags.includes('q')) events.push('castle')
  if (move.flags.includes('c') || move.flags.includes('e')) events.push('capture')
  events.push(move.color === 'w' ? 'moveWhite' : 'moveBlack')
  return events
}
