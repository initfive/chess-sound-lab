import type { EventDef } from '../sound/events'
import type { EventSoundConfig } from '../sound/presets'
import { setLabel, useSamples } from '../audio/library'
import type { LoadStatus } from '../audio/types'

interface Props {
  def: EventDef
  config: EventSoundConfig
  status: ReadonlyMap<string, LoadStatus>
  flash: boolean
  onChange: (patch: Partial<EventSoundConfig>) => void
  onPreview: () => void
}

export function EventRow({ def, config, status, flash, onChange, onPreview }: Props) {
  const { samples, byId, sets } = useSamples()
  const sample = config.sampleId ? byId.get(config.sampleId) : undefined
  const missing = !!config.sampleId && !sample
  const loadState = config.sampleId ? status.get(config.sampleId) : undefined

  return (
    <div className={`event-row ${config.enabled ? '' : 'event-row-off'} ${flash ? 'event-row-flash' : ''}`}>
      <label className="switch" title={config.enabled ? 'Disable' : 'Enable'}>
        <input type="checkbox" checked={config.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
        <span className="switch-track" />
      </label>

      <div className="event-name">
        <div className="event-label">{def.label}</div>
        <div className="event-hint">{def.hint}</div>
      </div>

      <div className="event-sample">
        <div className="event-sample-pick">
        <select
          value={config.sampleId ?? ''}
          onChange={(e) => onChange({ sampleId: e.target.value || null })}
          className={missing ? 'select-error' : ''}
        >
          <option value="">No sound</option>
          {missing && <option value={config.sampleId!}>Missing: {config.sampleId}</option>}
          {sets.map((set) => (
            <optgroup key={set || '_root'} label={setLabel(set)}>
              {samples
                .filter((s) => s.set === set)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
          <span className="event-sample-pack">{sample ? setLabel(sample.set) : missing ? 'Missing file' : '\u00a0'}</span>
        </div>
        <button
          className="btn btn-icon btn-play"
          onClick={onPreview}
          disabled={!sample || loadState !== 'ready'}
          title={loadState === 'loading' ? 'Loading…' : 'Preview'}
          aria-label={`Preview ${def.label}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ marginLeft: 2 }}>
            <path d="M2.5 1.5v9l8-4.5z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <label className="event-volume" title="Volume">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={config.volume}
          onChange={(e) => onChange({ volume: Number(e.target.value) })}
        />
        <span className="value">{Math.round(config.volume * 100)}</span>
      </label>

      <label className="event-offset" title="Delay after the event, in milliseconds">
        <input
          type="number"
          min={0}
          max={2000}
          step={10}
          value={config.offsetMs}
          onChange={(e) => onChange({ offsetMs: Math.max(0, Number(e.target.value) || 0) })}
        />
        <span className="unit">ms</span>
      </label>
    </div>
  )
}
