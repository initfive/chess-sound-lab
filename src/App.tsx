import { useCallback, useEffect, useRef, useState } from 'react'
import { library, useSamples } from './audio/library'
import { useAudioEngine } from './audio/useAudioEngine'
import { useChessGame, type EventPayload } from './chess/useChessGame'
import { Board } from './components/Board'
import { EventLog, type LogEntry } from './components/EventLog'
import { EventPanel } from './components/EventPanel'
import { PresetBar } from './components/PresetBar'
import { SampleLibrary } from './components/SampleLibrary'
import { Toolbar } from './components/Toolbar'
import type { EventId } from './sound/events'
import { selectEventsToPlay } from './sound/select'
import { useSoundConfig } from './sound/useSoundConfig'
import { TttLogo } from './components/TttLogo'

const timeNow = () => new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })

export default function App() {
  const { samples, byId } = useSamples()
  const { engine, status } = useAudioEngine(samples)
  useEffect(() => {
    void library.loadUploads()
  }, [])
  const { state, activePreset, dispatch, exportJson, importJson } = useSoundConfig()
  const [log, setLog] = useState<LogEntry[]>([])
  const [flashing, setFlashing] = useState<Set<EventId>>(new Set())
  const logId = useRef(0)

  // Keep engine + document in sync with global settings.
  useEffect(() => engine.setMuted(state.global.muted), [engine, state.global.muted])
  useEffect(() => {
    document.documentElement.dataset.theme = state.global.theme
  }, [state.global.theme])

  // Latest config in a ref so the chess hook's callback never goes stale.
  const configRef = useRef({ preset: activePreset })
  configRef.current = { preset: activePreset }
  const byIdRef = useRef(byId)
  byIdRef.current = byId

  const flash = useCallback((ids: EventId[]) => {
    setFlashing(new Set(ids))
    window.setTimeout(() => setFlashing(new Set()), 350)
  }, [])

  /** Plays the sounds for a set of detected events using the active preset. */
  const playEvents = useCallback(
    (detected: EventId[]) => {
      const { preset } = configRef.current
      const toPlay = selectEventsToPlay(detected, preset.events)
      const played: LogEntry['played'] = []
      for (const id of toPlay) {
        const cfg = preset.events[id]
        if (!cfg.sampleId) continue
        engine.play(cfg.sampleId, { volume: cfg.volume, offsetMs: cfg.offsetMs })
        played.push({ event: id, sampleName: byIdRef.current.get(cfg.sampleId)?.name ?? cfg.sampleId })
      }
      flash(toPlay)
      return { played, presetName: preset.name }
    },
    [engine, flash],
  )

  const handleEvents = useCallback(
    ({ events, san }: EventPayload) => {
      const { played, presetName } = playEvents(events)
      setLog((l) =>
        [{ id: ++logId.current, time: timeNow(), san: san ?? null, detected: events, played, presetName }, ...l].slice(0, 30),
      )
    },
    [playEvents],
  )

  const game = useChessGame({ onEvents: handleEvents, bot: state.global.bot })

  const replay = useCallback(
    (entry: LogEntry) => {
      const { played, presetName } = playEvents(entry.detected)
      setLog((l) => [{ ...entry, id: ++logId.current, time: timeNow(), played, presetName }, ...l].slice(0, 30))
    },
    [playEvents],
  )

  const preview = useCallback(
    (eventId: EventId) => {
      const cfg = activePreset.events[eventId]
      if (cfg.sampleId) engine.play(cfg.sampleId, { volume: cfg.volume })
      flash([eventId])
    },
    [activePreset, engine, flash],
  )

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'z') game.undo()
      else if (k === 'r') game.reset()
      else if (k === 'f') game.flip()
      else if (k === 'm') dispatch({ type: 'updateGlobal', patch: { muted: !state.global.muted } })
      else if (k === ' ') {
        e.preventDefault()
        if (log[0]) replay(log[0])
      } else if (/^[1-9]$/.test(k)) {
        const p = state.presets[Number(k) - 1]
        if (p) dispatch({ type: 'selectPreset', id: p.id })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game, dispatch, state.global.muted, state.presets, log, replay])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <TttLogo />
          <span className="brand-lab" aria-hidden="true">Sound<br />Lab</span>
          <span className="sr-only">Take Take Take Sound Lab</span>
        </div>
        <div className="topbar-right">
          <PresetBar
            presets={state.presets}
            activeId={state.activePresetId}
            onSelect={(id) => dispatch({ type: 'selectPreset', id })}
            onRename={(id, name) => dispatch({ type: 'renamePreset', id, name })}
            onAdd={() => dispatch({ type: 'addPreset' })}
            onDuplicate={(id) => dispatch({ type: 'duplicatePreset', id })}
            onDelete={(id) => dispatch({ type: 'deletePreset', id })}
            onReset={(id) => dispatch({ type: 'resetPreset', id })}
            onExport={exportJson}
            onImport={importJson}
            theme={state.global.theme}
            onToggleTheme={() => dispatch({ type: 'updateGlobal', patch: { theme: state.global.theme === 'dark' ? 'light' : 'dark' } })}
          />
        </div>
      </header>

      <main className="layout">
        <section className="board-col">
          <div className="board-wrap">
            <Board
              fen={game.fen}
              orientation={game.orientation}
              selected={game.selected}
              legalTargets={game.legalTargets}
              lastMove={game.lastMove}
              kingInCheck={game.kingInCheck}
              turn={game.turn}
              onDrop={game.tryMove}
              onSquareClick={game.clickSquare}
            />
          </div>
          <Toolbar
            status={game.status}
            moveCount={game.moveCount}
            muted={state.global.muted}
            bot={state.global.bot}
            engineStatus={game.engineStatus}
            onUndo={game.undo}
            onReset={game.reset}
            onFlip={game.flip}
            onToggleMute={() => dispatch({ type: 'updateGlobal', patch: { muted: !state.global.muted } })}
            onBotChange={(patch) => dispatch({ type: 'updateGlobal', patch: { bot: { ...state.global.bot, ...patch } } })}
          />
          <EventLog entries={log} onReplay={replay} onClear={() => setLog([])} />
        </section>

        <aside className="panel-col">
          <EventPanel
            presetName={activePreset.name}
            events={activePreset.events}
            status={status}
            flashing={flashing}
            onChange={(eventId, patch) => dispatch({ type: 'updateEvent', eventId, patch })}
            onPreview={preview}
          />
          <p className="hint shortcuts">
            <kbd>Z</kbd> undo · <kbd>R</kbd> reset · <kbd>F</kbd> flip · <kbd>M</kbd> mute · <kbd>1–9</kbd> preset · <kbd>Space</kbd> replay last
          </p>
        </aside>
      </main>

      <SampleLibrary
        status={status}
        events={activePreset.events}
        onAssign={(sampleId, eventId) => dispatch({ type: 'updateEvent', eventId, patch: { sampleId } })}
      />
    </div>
  )
}
