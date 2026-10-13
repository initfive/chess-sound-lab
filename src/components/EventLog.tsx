import { eventById, type EventId } from '../sound/events'
import type { Preset } from '../sound/presets'

export interface LogEntry {
  id: number
  time: string
  san: string | null
  detected: EventId[]
  played: { event: EventId; sampleName: string }[]
  presetId: string
  presetName: string
}

interface Props {
  entries: LogEntry[]
  presets: Preset[]
  onReplay: (entry: LogEntry, presetId?: string) => void
  onClear: () => void
}

export function EventLog({ entries, presets, onReplay, onClear }: Props) {
  const last = entries[0]
  return (
    <div className="card log">
      <div className="card-header">
        <h2>Event log</h2>
        <div className="card-actions">
          <button className="btn btn-small" disabled={!last} onClick={() => last && onReplay(last)} title="Replay the last move with the current sound set (Space)">
            Replay last
          </button>
          <button className="btn btn-small btn-ghost" disabled={!entries.length} onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="hint">Make a move. Each move, its events and the sample it played show up here. Use the numbers on a row to hear that same moment with each sound set.</p>
      ) : (
        <ul className="log-list">
          {entries.map((e) => (
            <li key={e.id} className="log-item">
              <span className="log-time">{e.time}</span>
              <span className="log-san">{e.san ?? (e.detected.includes('illegal') ? '✕' : '·')}</span>
              <span className="log-events">
                {e.detected.map((id) => (
                  <span key={id} className={`chip ${e.played.some((p) => p.event === id) ? 'chip-accent' : 'chip-dim'}`}>
                    {eventById.get(id)?.label ?? id}
                  </span>
                ))}
              </span>
              <span className="log-played muted-text">
                {e.played.length ? e.played.map((p) => p.sampleName).join(' + ') : 'silent'} · {e.presetName}
              </span>
              <span className="log-replay" role="group" aria-label="Replay this move with">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                  <path d="M20 4v5h-5" />
                </svg>
                {presets.slice(0, 9).map((p, i) => (
                  <button
                    key={p.id}
                    className={`log-replay-btn ${p.id === e.presetId ? 'log-replay-played' : ''}`}
                    onClick={() => onReplay(e, p.id)}
                    title={`Replay with ${p.name}${p.id === e.presetId ? ' (played with this)' : ''}`}
                    aria-label={`Replay with ${p.name}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
