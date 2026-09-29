import { useState } from 'react'
import { audioEngine } from '../audio/engine'
import type { LoadStatus, SampleMeta } from '../audio/types'
import { EVENTS, type EventId } from '../sound/events'
import { Waveform } from './Waveform'

interface Props {
  sample: SampleMeta
  status: LoadStatus | undefined
  usedBy: EventId[]
  onAssign: (eventId: EventId) => void
  onRemove?: () => void
}

const fmt = (s: number) => (s >= 1 ? `${s.toFixed(2)} s` : `${Math.round(s * 1000)} ms`)

export function SampleCard({ sample, status, usedBy, onAssign, onRemove }: Props) {
  const [playStartedAt, setPlayStartedAt] = useState<number | null>(null)
  const buffer = audioEngine.getBuffer(sample.id)

  const play = () => {
    if (audioEngine.play(sample.id) !== null) setPlayStartedAt(performance.now())
  }

  return (
    <div className={`sample-card ${usedBy.length ? 'sample-card-used' : ''}`}>
      <div className="sample-top">
        <button className="btn btn-icon btn-play" onClick={play} disabled={status !== 'ready'} aria-label={`Play ${sample.name}`}>
          ▶
        </button>
        <div className="sample-title">
          <div className="sample-name" title={sample.file}>
            {sample.name}
            {sample.uploaded && <span className="chip chip-dim sample-uploaded">uploaded</span>}
          </div>
          <div className="sample-meta muted-text">
            {status === 'ready' && buffer
              ? `${fmt(buffer.duration)} · ${buffer.numberOfChannels === 1 ? 'mono' : 'stereo'} · ${Math.round(buffer.sampleRate / 1000)} kHz`
              : status === 'error'
                ? 'Failed to load'
                : 'Loading…'}
          </div>
        </div>
        {onRemove && (
          <button className="btn btn-icon btn-small btn-ghost sample-remove" onClick={onRemove} title="Remove this upload" aria-label={`Remove ${sample.name}`}>
            ×
          </button>
        )}
      </div>
      <Waveform buffer={buffer} playStartedAt={playStartedAt} />
      <div className="sample-bottom">
        <div className="sample-tags">
          {usedBy.map((id) => (
            <span key={id} className="chip chip-accent">
              {EVENTS.find((e) => e.id === id)?.label}
            </span>
          ))}
        </div>
        <select className="select-small" value="" onChange={(e) => e.target.value && onAssign(e.target.value as EventId)} title="Assign this sample to an event in the active preset">
          <option value="">Assign to…</option>
          {EVENTS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
