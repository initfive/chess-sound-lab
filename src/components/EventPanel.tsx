import { EVENTS, type EventId } from '../sound/events'
import type { EventConfigMap, EventSoundConfig } from '../sound/presets'
import type { LoadStatus } from '../audio/types'
import { EventRow } from './EventRow'

interface Props {
  presetName: string
  events: EventConfigMap
  status: ReadonlyMap<string, LoadStatus>
  flashing: Set<EventId>
  onChange: (eventId: EventId, patch: Partial<EventSoundConfig>) => void
  onPreview: (eventId: EventId) => void
}

export function EventPanel({ presetName, events, status, flashing, onChange, onPreview }: Props) {
  return (
    <div className="card">
      <h2 className="sr-only">Events in {presetName}</h2>
      <div className="event-head">
        <span />
        <span>Event</span>
        <span>Sample</span>
        <span>Volume</span>
        <span>Offset</span>
      </div>
      <div className="event-list">
        {EVENTS.map((def) => (
          <EventRow
            key={def.id}
            def={def}
            config={events[def.id]}
            status={status}
            flash={flashing.has(def.id)}
            onChange={(patch) => onChange(def.id, patch)}
            onPreview={() => onPreview(def.id)}
          />
        ))}
      </div>
    </div>
  )
}
