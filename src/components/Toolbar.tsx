import type { EngineStatus } from '../chess/stockfish'
import type { BotSettings } from '../sound/presets'

interface Props {
  status: string
  moveCount: number
  muted: boolean
  bot: BotSettings
  engineStatus: EngineStatus
  onUndo: () => void
  onReset: () => void
  onFlip: () => void
  onToggleMute: () => void
  onBotChange: (patch: Partial<BotSettings>) => void
}

const ENGINE_LABEL: Record<EngineStatus, string> = {
  idle: '',
  loading: 'Loading engine…',
  ready: 'Ready',
  thinking: 'Thinking…',
  error: 'Engine failed to load',
}

export function Toolbar({ status, moveCount, muted, bot, engineStatus, onUndo, onReset, onFlip, onToggleMute, onBotChange }: Props) {
  return (
    <>
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
          <button className={`btn ${muted ? 'btn-danger' : ''}`} onClick={onToggleMute} title="Mute all (M)">
            {muted ? 'Unmute' : 'Mute all'}
          </button>
        </div>
      </div>

      <div className="bot-bar">
        <span className="field-label">Opponent</span>
        <select value={bot.kind} onChange={(e) => onBotChange({ kind: e.target.value as BotSettings['kind'] })}>
          <option value="off">Off · you play both sides</option>
          <option value="random">Random mover</option>
          <option value="stockfish">Stockfish 19</option>
        </select>
        {bot.kind !== 'off' && (
          <>
            <span className="field-label">plays</span>
            <select value={bot.side} onChange={(e) => onBotChange({ side: e.target.value as BotSettings['side'] })}>
              <option value="b">Black</option>
              <option value="w">White</option>
            </select>
          </>
        )}
        {bot.kind === 'stockfish' && (
          <>
            <label className="bot-skill" title="Stockfish skill level, 0 = weakest, 20 = full strength">
              <span className="field-label">Skill</span>
              <input type="range" min={0} max={20} step={1} value={bot.skill} onChange={(e) => onBotChange({ skill: Number(e.target.value) })} />
              <span className="value">{bot.skill}</span>
            </label>
            <span className={`engine-status engine-${engineStatus}`}>{ENGINE_LABEL[engineStatus]}</span>
          </>
        )}
      </div>
    </>
  )
}
