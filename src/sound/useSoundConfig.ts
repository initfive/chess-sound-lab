import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { EventId } from './events'
import {
  DEFAULT_GLOBAL,
  DEFAULT_PRESETS,
  ORIGINAL_EVENTS,
  type EventSoundConfig,
  type GlobalSettings,
  type Preset,
} from './presets'

const STORAGE_KEY = 'chess-sound-lab:v1'
/** Bump when a saved default should be re-applied (see migrations in load()). */
const CONFIG_VERSION = 2

export interface SoundConfigState {
  version?: number
  presets: Preset[]
  activePresetId: string
  global: GlobalSettings
}

type Action =
  | { type: 'selectPreset'; id: string }
  | { type: 'updateEvent'; eventId: EventId; patch: Partial<EventSoundConfig> }
  | { type: 'updateGlobal'; patch: Partial<GlobalSettings> }
  | { type: 'renamePreset'; id: string; name: string }
  | { type: 'addPreset' }
  | { type: 'duplicatePreset'; id: string }
  | { type: 'deletePreset'; id: string }
  | { type: 'resetPreset'; id: string }
  | { type: 'replaceAll'; state: SoundConfigState }

const initialState = (): SoundConfigState => ({
  version: CONFIG_VERSION,
  presets: structuredClone(DEFAULT_PRESETS),
  activePresetId: DEFAULT_PRESETS[0].id,
  global: { ...DEFAULT_GLOBAL },
})

function load(): SoundConfigState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<SoundConfigState>
    const base = initialState()
    const presets = Array.isArray(parsed.presets) && parsed.presets.length ? parsed.presets : base.presets
    // Fill in any events added since the config was saved.
    for (const p of presets) p.events = { ...structuredClone(ORIGINAL_EVENTS), ...p.events }
    const savedVersion = parsed.version ?? 1
    const bot = { ...base.global.bot, ...(parsed.global?.bot ?? {}) }
    // v2: Stockfish became the default opponent.
    if (savedVersion < 2) bot.kind = 'stockfish'
    return {
      version: CONFIG_VERSION,
      presets,
      activePresetId: presets.some((p) => p.id === parsed.activePresetId)
        ? (parsed.activePresetId as string)
        : presets[0].id,
      global: {
        ...base.global,
        ...(parsed.global ?? {}),
        bot,
      },
    }
  } catch {
    return initialState()
  }
}

const newId = () => `preset-${Date.now().toString(36)}`

function reducer(state: SoundConfigState, action: Action): SoundConfigState {
  switch (action.type) {
    case 'selectPreset':
      return { ...state, activePresetId: action.id }
    case 'updateEvent':
      return {
        ...state,
        presets: state.presets.map((p) =>
          p.id !== state.activePresetId
            ? p
            : { ...p, events: { ...p.events, [action.eventId]: { ...p.events[action.eventId], ...action.patch } } },
        ),
      }
    case 'updateGlobal':
      return { ...state, global: { ...state.global, ...action.patch } }
    case 'renamePreset':
      return { ...state, presets: state.presets.map((p) => (p.id === action.id ? { ...p, name: action.name } : p)) }
    case 'addPreset': {
      const preset: Preset = { id: newId(), name: `Concept ${state.presets.length}`, events: structuredClone(ORIGINAL_EVENTS) }
      return { ...state, presets: [...state.presets, preset], activePresetId: preset.id }
    }
    case 'duplicatePreset': {
      const src = state.presets.find((p) => p.id === action.id)
      if (!src) return state
      const preset: Preset = { id: newId(), name: `${src.name} copy`, events: structuredClone(src.events) }
      const idx = state.presets.indexOf(src)
      const presets = [...state.presets.slice(0, idx + 1), preset, ...state.presets.slice(idx + 1)]
      return { ...state, presets, activePresetId: preset.id }
    }
    case 'deletePreset': {
      if (state.presets.length <= 1) return state
      const presets = state.presets.filter((p) => p.id !== action.id)
      return {
        ...state,
        presets,
        activePresetId: state.activePresetId === action.id ? presets[0].id : state.activePresetId,
      }
    }
    case 'resetPreset': {
      const def = DEFAULT_PRESETS.find((p) => p.id === action.id)
      const events = structuredClone(def?.events ?? ORIGINAL_EVENTS)
      return { ...state, presets: state.presets.map((p) => (p.id === action.id ? { ...p, events } : p)) }
    }
    case 'replaceAll':
      return action.state
  }
}

export function useSoundConfig() {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable: config is session-only */
    }
  }, [state])

  const activePreset = useMemo(
    () => state.presets.find((p) => p.id === state.activePresetId) ?? state.presets[0],
    [state.presets, state.activePresetId],
  )

  const exportJson = useCallback(() => JSON.stringify(state, null, 2), [state])
  const importJson = useCallback((json: string) => {
    const parsed = JSON.parse(json) as SoundConfigState
    if (!Array.isArray(parsed.presets)) throw new Error('Invalid config file')
    dispatch({ type: 'replaceAll', state: { ...initialState(), ...parsed } })
  }, [])

  return { state, activePreset, dispatch, exportJson, importJson }
}
