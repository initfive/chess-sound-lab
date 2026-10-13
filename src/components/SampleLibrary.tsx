import { useRef, useState, type DragEvent } from 'react'
import { audioEngine } from '../audio/engine'
import { library, setLabel, useSamples } from '../audio/library'
import type { LoadStatus } from '../audio/types'
import type { EventId } from '../sound/events'
import type { EventConfigMap } from '../sound/presets'
import { SampleCard } from './SampleCard'

interface Props {
  status: ReadonlyMap<string, LoadStatus>
  events: EventConfigMap
  presetName: string
  onAssign: (sampleId: string, eventId: EventId) => void
}

const AUDIO_RE = /\.(wav|mp3|ogg|m4a|aac|flac|webm)$/i

export function SampleLibrary({ status, events, presetName, onAssign }: Props) {
  const { samples, sets } = useSamples()
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [uploadSet, setUploadSet] = useState('concept-a')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const usage = new Map<string, EventId[]>()
  for (const [eventId, cfg] of Object.entries(events) as [EventId, EventConfigMap[EventId]][]) {
    if (cfg.sampleId) usage.set(cfg.sampleId, [...(usage.get(cfg.sampleId) ?? []), eventId])
  }

  const visible = samples.filter(
    (s) => (filter === 'all' || s.set === filter) && (!query || s.name.toLowerCase().includes(query.toLowerCase())),
  )
  const ready = [...status.values()].filter((v) => v === 'ready').length

  const addFiles = async (list: FileList | File[] | null) => {
    const files = [...(list ?? [])].filter((f) => AUDIO_RE.test(f.name) || f.type.startsWith('audio/'))
    if (!files.length) return
    setBusy(true)
    try {
      await library.add(files, uploadSet)
    } catch (err) {
      window.alert(`Could not store files: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void addFiles(e.dataTransfer.files)
  }

  const remove = async (id: string) => {
    await library.remove(id)
    audioEngine.unload(id)
  }

  return (
    <section
      className={`card library ${dragging ? 'library-dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <div className="card-header">
        <h2>Sample library</h2>
        <span className="muted-text">
          {ready}/{samples.length} loaded
        </span>
        <div className="card-actions">
          <input className="input-small" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="select-small" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All packs</option>
            {sets.map((set) => (
              <option key={set || '_root'} value={set}>
                {setLabel(set)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="upload-bar">
        <span className="field-label">Add sounds to pack</span>
        <input
          className="input-small upload-set"
          value={uploadSet}
          onChange={(e) => setUploadSet(e.target.value)}
          placeholder="pack name"
          list="sample-sets"
        />
        <datalist id="sample-sets">
          {sets.map((s) => (
            <option key={s || '_root'} value={s} />
          ))}
        </datalist>
        <button className="btn btn-small btn-active" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Adding…' : 'Choose files'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac"
          multiple
          hidden
          onChange={(e) => {
            void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <span className="hint upload-hint">
          or drop audio files anywhere on this panel. Uploads stay in this browser only; copy them into{' '}
          <code>public/sounds/&lt;set&gt;/</code> to make them permanent.
        </span>
      </div>

      {samples.length === 0 ? (
        <p className="hint">No audio files yet. Add some above.</p>
      ) : (
        <div className="sample-grid">
          {visible.map((s) => (
            <SampleCard
              key={s.id}
              sample={s}
              status={status.get(s.id)}
              usedBy={usage.get(s.id) ?? []}
              presetName={presetName}
              onAssign={(eventId) => onAssign(s.id, eventId)}
              onRemove={s.uploaded ? () => void remove(s.id) : undefined}
            />
          ))}
        </div>
      )}
      {dragging && <div className="drop-overlay">Drop to add to “{uploadSet}”</div>}
    </section>
  )
}
