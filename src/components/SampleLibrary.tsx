import { useState } from 'react'
import { sampleSets, samples, setLabel } from '../audio/library'
import type { LoadStatus } from '../audio/types'
import type { EventId } from '../sound/events'
import type { EventConfigMap } from '../sound/presets'
import { SampleCard } from './SampleCard'

interface Props {
  status: ReadonlyMap<string, LoadStatus>
  events: EventConfigMap
  onAssign: (sampleId: string, eventId: EventId) => void
}

export function SampleLibrary({ status, events, onAssign }: Props) {
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')

  const usage = new Map<string, EventId[]>()
  for (const [eventId, cfg] of Object.entries(events) as [EventId, EventConfigMap[EventId]][]) {
    if (cfg.sampleId) usage.set(cfg.sampleId, [...(usage.get(cfg.sampleId) ?? []), eventId])
  }

  const visible = samples.filter(
    (s) => (filter === 'all' || s.set === filter) && (!query || s.name.toLowerCase().includes(query.toLowerCase())),
  )
  const ready = [...status.values()].filter((v) => v === 'ready').length

  return (
    <section className="card library">
      <div className="card-header">
        <h2>Sample library</h2>
        <span className="muted-text">
          {ready}/{samples.length} loaded · drop files into <code>public/sounds/&lt;set&gt;/</code>
        </span>
        <div className="card-actions">
          <input className="input-small" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="select-small" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All sets</option>
            {sampleSets.map((set) => (
              <option key={set || '_root'} value={set}>
                {setLabel(set)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {samples.length === 0 ? (
        <p className="hint">No audio files found. Add WAV/MP3 files under public/sounds/ and restart the dev server.</p>
      ) : (
        <div className="sample-grid">
          {visible.map((s) => (
            <SampleCard
              key={s.id}
              sample={s}
              status={status.get(s.id)}
              usedBy={usage.get(s.id) ?? []}
              onAssign={(eventId) => onAssign(s.id, eventId)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
