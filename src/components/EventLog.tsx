import { eventById, type EventId } from '../sound/events'

export interface LogEntry {
  id: number
  time: string
  san: string | null
  detected: EventId[]
  played: { event: EventId; sampleName: string }[]
  presetName: string
}

interface Props {
  entries: LogEntry[]
  onReplay: (entry: LogEntry) => void
  onClear: () => void
}

export function EventLog({ entries, onReplay, onClear }: Props) {
  const last = entries[0]
  return (
    <div className="card log">
      <div className="card-header">
        <h2>Event log</h2>
        <div className="card-actions">
          <button className="btn btn-small" disabled={!last} onClick={() => last && onReplay(last)} title="Replay last event with the current preset (Space)">
            Replay last
          </button>
          <button className="btn btn-small btn-ghost" disabled={!entries.length} onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="hint">Make a move. Each event and the sample it triggered will show up here. Switch presets and hit Replay to A/B the same moment.</p>
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
              <button className="btn btn-icon btn-small" onClick={() => onReplay(e)} title="Replay with current preset" aria-label="Replay">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                  <path d="M20 4v5h-5" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
