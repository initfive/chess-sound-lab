import type { GlobalSettings } from '../sound/presets'

interface Props {
  settings: GlobalSettings
  onChange: (patch: Partial<GlobalSettings>) => void
}

export function GlobalControls({ settings, onChange }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Global</h2>
      </div>
      <div className="global-grid">
        <label className="field">
          <span className="field-label">Master volume</span>
          <span className="field-row">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.masterVolume}
              onChange={(e) => onChange({ masterVolume: Number(e.target.value) })}
            />
            <span className="value">{Math.round(settings.masterVolume * 100)}</span>
          </span>
        </label>
        <label className="field">
          <span className="field-label">Layering</span>
          <select value={settings.layering} onChange={(e) => onChange({ layering: e.target.value as GlobalSettings['layering'] })}>
            <option value="single">Single · highest priority only</option>
            <option value="stack">Stack · play every matching event</option>
          </select>
        </label>
      </div>
      <p className="hint">
        Priority: checkmate → check → promotion → castle → capture → move. In Stack mode use the offsets to layer sounds.
      </p>
    </div>
  )
}
