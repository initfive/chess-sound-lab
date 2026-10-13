/**
 * Chess events the lab can react to. Order = priority (the first matching
 * event plays). Add a new event here + a default in presets.ts.
 */
export type EventId =
  | 'checkmate'
  | 'check'
  | 'promotion'
  | 'castle'
  | 'capture'
  | 'moveWhite'
  | 'moveBlack'
  | 'illegal'
  | 'gameStart'

export interface EventDef {
  id: EventId
  label: string
  hint: string
  /** Events in the same group compete for the one sound a move plays. */
  group: 'move' | 'standalone'
}

export const EVENTS: EventDef[] = [
  { id: 'moveWhite', label: 'Move · White', hint: 'Player 1 quiet move', group: 'move' },
  { id: 'moveBlack', label: 'Move · Black', hint: 'Opponent quiet move', group: 'move' },
  { id: 'capture', label: 'Capture', hint: 'Incl. en passant', group: 'move' },
  { id: 'castle', label: 'Castle', hint: 'King- or queen-side', group: 'move' },
  { id: 'promotion', label: 'Promotion', hint: 'Pawn on last rank', group: 'move' },
  { id: 'check', label: 'Check', hint: 'Move gives check', group: 'move' },
  { id: 'checkmate', label: 'Checkmate', hint: 'Game ends by mate', group: 'move' },
  { id: 'illegal', label: 'Illegal move', hint: 'Dropped on a wrong square', group: 'standalone' },
  { id: 'gameStart', label: 'Game start', hint: 'On game reset', group: 'standalone' },
]

export const EVENT_PRIORITY: EventId[] = [
  'checkmate',
  'check',
  'promotion',
  'castle',
  'capture',
  'moveWhite',
  'moveBlack',
  'illegal',
  'gameStart',
]

export const eventById = new Map(EVENTS.map((e) => [e.id, e]))
