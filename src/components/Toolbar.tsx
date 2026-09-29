interface Props {
  status: string
  moveCount: number
  muted: boolean
  botPlaysBlack: boolean
  onUndo: () => void
  onReset: () => void
  onFlip: () => void
  onToggleMute: () => void
  onToggleBot: () => void
}

export function Toolbar({ status, moveCount, muted, botPlaysBlack, onUndo, onReset, onFlip, onToggleMute, onToggleBot }: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-status">
        <span className="status-dot" data-turn={status.startsWith('Black') ? 'b' : 'w'} />
        <span>{status}</span>
        <span className="muted-text">· {moveCount} plies</span>
      </div>
      <div className="toolbar-actions">
        <button className="btn" onClick={onUndo} disabled={moveCount === 0} title="Undo (Z)">
          Undo
        </button>
        <button className="btn" onClick={onReset} title="Reset game (R)">
          Reset
        </button>
        <button className="btn" onClick={onFlip} title="Flip board (F)">
          Flip
        </button>
        <button className={`btn ${botPlaysBlack ? 'btn-active' : ''}`} onClick={onToggleBot} title="Random bot plays Black">
          Bot: Black
        </button>
        <button className={`btn ${muted ? 'btn-danger' : ''}`} onClick={onToggleMute} title="Mute all (M)">
          {muted ? 'Unmute' : 'Mute all'}
        </button>
      </div>
    </div>
  )
}
