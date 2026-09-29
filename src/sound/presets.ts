import type { EventId } from './events'

export interface EventSoundConfig {
  /** SampleMeta.id, e.g. "original/move.wav". null = no sound. */
  sampleId: string | null
  enabled: boolean
  volume: number // 0..1
  offsetMs: number // delay after the chess event
}

export type EventConfigMap = Record<EventId, EventSoundConfig>

export interface Preset {
  id: string
  name: string
  events: EventConfigMap
}

export type Layering = 'single' | 'stack'

export type BotKind = 'off' | 'random' | 'stockfish'

export interface BotSettings {
  kind: BotKind
  /** Which color the bot plays. */
  side: 'w' | 'b'
  /** Stockfish "Skill Level", 0 (weakest) .. 20 (full strength). */
  skill: number
  /** Stockfish thinking time per move. */
  moveTimeMs: number
}

export interface GlobalSettings {
  masterVolume: number
  muted: boolean
  /** single = only the highest-priority event plays; stack = all matching events play. */
  layering: Layering
  /** Opponent so "opponent move" is a real event: random mover or Stockfish. */
  bot: BotSettings
  theme: 'dark' | 'light'
}

const cfg = (sampleId: string | null, volume = 1, offsetMs = 0): EventSoundConfig => ({
  sampleId,
  enabled: true,
  volume,
  offsetMs,
})

/** Mapping of the sounds Take Take Take shipped. Paths relative to public/sounds. */
export const ORIGINAL_EVENTS: EventConfigMap = {
  moveWhite: cfg('original/move.wav'),
  moveBlack: cfg('original/move.wav'),
  capture: cfg('original/capture.wav'),
  castle: cfg('original/castle.wav'),
  promotion: cfg('original/promotion.wav'),
  check: cfg('original/check.wav'),
  checkmate: cfg('original/checkmate.wav'),
  illegal: cfg(null),
  gameStart: cfg('original/game-start.wav'),
}

const clone = (m: EventConfigMap): EventConfigMap => structuredClone(m)

/** Concepts start as copies of Original so A/B differences are opt-in. */
export const DEFAULT_PRESETS: Preset[] = [
  { id: 'original', name: 'Original', events: clone(ORIGINAL_EVENTS) },
  { id: 'concept-a', name: 'Concept A', events: clone(ORIGINAL_EVENTS) },
  { id: 'concept-b', name: 'Concept B', events: clone(ORIGINAL_EVENTS) },
]

export const DEFAULT_GLOBAL: GlobalSettings = {
  masterVolume: 0.9,
  muted: false,
  layering: 'single',
  bot: { kind: 'off', side: 'b', skill: 5, moveTimeMs: 300 },
  theme: 'dark',
}
