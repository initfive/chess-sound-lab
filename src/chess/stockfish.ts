/**
 * Thin UCI wrapper around the Stockfish WASM build in public/engine/.
 * Runs in a Web Worker so the board never stutters while it thinks.
 */
export type EngineStatus = 'idle' | 'loading' | 'ready' | 'thinking' | 'error'

export interface EngineMove {
  from: string
  to: string
  promotion?: string
}

const ENGINE_URL = '/engine/stockfish-19-lite-single.js'

type Listener = () => void

export class StockfishEngine {
  private worker: Worker | null = null
  private status: EngineStatus = 'idle'
  private listeners = new Set<Listener>()
  private readyPromise: Promise<void> | null = null
  private lineHandlers = new Set<(line: string) => void>()
  private searchId = 0

  getStatus() {
    return this.status
  }

  subscribe(l: Listener) {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  private setStatus(s: EngineStatus) {
    this.status = s
    for (const l of this.listeners) l()
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd)
  }

  /** Waits for a line matching `test`, with a timeout. */
  private waitFor(test: (line: string) => boolean, timeoutMs = 20000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.lineHandlers.delete(handler)
        reject(new Error('Engine timed out'))
      }, timeoutMs)
      const handler = (line: string) => {
        if (!test(line)) return
        clearTimeout(timer)
        this.lineHandlers.delete(handler)
        resolve(line)
      }
      this.lineHandlers.add(handler)
    })
  }

  /** Loads the worker + wasm once. Safe to call repeatedly. */
  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise
    this.setStatus('loading')
    this.readyPromise = (async () => {
      try {
        this.worker = new Worker(ENGINE_URL)
        this.worker.onmessage = (e: MessageEvent<string>) => {
          const line = typeof e.data === 'string' ? e.data : String(e.data)
          for (const h of [...this.lineHandlers]) h(line)
        }
        this.worker.onerror = (e) => {
          console.error('[stockfish]', e.message)
          this.setStatus('error')
        }
        const uciok = this.waitFor((l) => l === 'uciok', 60000)
        this.send('uci')
        await uciok
        const readyok = this.waitFor((l) => l === 'readyok')
        this.send('isready')
        await readyok
        this.setStatus('ready')
      } catch (err) {
        this.setStatus('error')
        throw err
      }
    })()
    return this.readyPromise
  }

  /** 0 (weakest) .. 20 (full strength). */
  setSkill(level: number) {
    this.send(`setoption name Skill Level value ${Math.max(0, Math.min(20, Math.round(level)))}`)
  }

  /** Aborts any running search and returns the best move for `fen`, or null if the search was superseded. */
  async bestMove(fen: string, moveTimeMs: number): Promise<EngineMove | null> {
    await this.init()
    const id = ++this.searchId
    this.send('stop')
    this.setStatus('thinking')
    const result = this.waitFor((l) => l.startsWith('bestmove'), moveTimeMs + 15000)
    this.send(`position fen ${fen}`)
    this.send(`go movetime ${moveTimeMs}`)
    let line: string
    try {
      line = await result
    } finally {
      if (id === this.searchId) this.setStatus('ready')
    }
    if (id !== this.searchId) return null
    const uci = line.split(/\s+/)[1]
    if (!uci || uci === '(none)') return null
    return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
  }

  /** Invalidate an in-flight search (e.g. after undo/reset). */
  cancel() {
    this.searchId++
    this.send('stop')
    if (this.status === 'thinking') this.setStatus('ready')
  }
}

export const stockfish = new StockfishEngine()
