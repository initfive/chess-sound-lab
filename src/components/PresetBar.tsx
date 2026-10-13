import { useRef, useState } from 'react'
import type { Preset } from '../sound/presets'

interface Props {
  presets: Preset[]
  activeId: string
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onAdd: () => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onReset: (id: string) => void
  onExport: () => string
  onImport: (json: string) => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function PresetBar({ presets, activeId, onSelect, onRename, onAdd, onDuplicate, onDelete, onReset, onExport, onImport, theme, onToggleTheme }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const rename = () => {
    const current = presets.find((p) => p.id === activeId)
    const name = window.prompt('Sound set name', current?.name ?? '')
    if (name?.trim()) onRename(activeId, name.trim())
    setMenuOpen(false)
  }

  const exportFile = () => {
    const blob = new Blob([onExport()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'chess-sound-lab-presets.json'
    a.click()
    URL.revokeObjectURL(a.href)
    setMenuOpen(false)
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      onImport(await file.text())
    } catch (err) {
      window.alert(`Could not import: ${(err as Error).message}`)
    }
    setMenuOpen(false)
  }

  return (
    <div className="preset-bar">
      <div className="segmented" role="tablist" aria-label="Sound sets">
        {presets.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === activeId}
            className={`segment ${p.id === activeId ? 'segment-active' : ''}`}
            onClick={() => onSelect(p.id)}
            title={`Switch sound set (${i + 1})`}
          >
            <kbd>{i + 1}</kbd>
            {p.name}
          </button>
        ))}
      </div>
      <div className="preset-menu-wrap">
        <button className="btn btn-icon" onClick={() => setMenuOpen((o) => !o)} aria-label="More actions" title="More actions">
          ⋯
        </button>
        {menuOpen && (
          <div className="menu" onMouseLeave={() => setMenuOpen(false)}>
            <button onClick={rename}>Rename</button>
            <button onClick={() => { onAdd(); setMenuOpen(false) }}>New sound set</button>
            <button onClick={() => { onDuplicate(activeId); setMenuOpen(false) }}>Duplicate</button>
            <button onClick={() => { onReset(activeId); setMenuOpen(false) }}>Reset to Original sounds</button>
            <button disabled={presets.length <= 1} onClick={() => { onDelete(activeId); setMenuOpen(false) }}>
              Delete
            </button>
            <hr />
            <button onClick={exportFile}>Export JSON</button>
            <button onClick={() => fileRef.current?.click()}>Import JSON</button>
            <hr />
            <button onClick={() => { onToggleTheme(); setMenuOpen(false) }}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => void importFile(e.target.files?.[0])} />
          </div>
        )}
      </div>
    </div>
  )
}
