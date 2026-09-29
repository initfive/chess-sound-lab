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
  private waiters = new Set<{ test: (line: string) => boolean; resolve: (l: string) => void; reject: (e: Error) => void }>()
  private searchId = 0
  /** Searches are serialized: the WASM engine crashes if it gets a `go` while another search is running. */
  private queue: Promise<unknown> = Promise.resolve()

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

  /** Raw post. Only used during the handshake; everything else goes through `send`. */
  private post(cmd: string) {
    this.worker?.postMessage(cmd)
  }

  /** Sends a UCI command once the engine is ready. Commands sent earlier would crash the worker. */
  private send(cmd: string) {
    if (this.status === 'ready' || this.status === 'thinking') this.post(cmd)
    else if (this.status !== 'error') void this.init().then(() => this.post(cmd)).catch(() => undefined)
  }

  private handleLine(line: string) {
    for (const w of [...this.waiters]) {
      if (!w.test(line)) continue
      this.waiters.delete(w)
      w.resolve(line)
    }
  }

  private fail(err: Error) {
    for (const w of [...this.waiters]) w.reject(err)
    this.waiters.clear()
    this.setStatus('error')
  }

  /** Waits for a line matching `test`, with a timeout. */
  private waitFor(test: (line: string) => boolean, timeoutMs = 20000): Promise<string> {
    return new Promise((resolve, reject) => {
      const waiter = {
        test,
        resolve: (l: string) => {
          clearTimeout(timer)
          resolve(l)
        },
        reject: (e: Error) => {
          clearTimeout(timer)
          reject(e)
        },
      }
      const timer = setTimeout(() => {
        this.waiters.delete(waiter)
        reject(new Error('Engine timed out'))
      }, timeoutMs)
      this.waiters.add(waiter)
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
          this.handleLine(typeof e.data === 'string' ? e.data : String(e.data))
        }
        this.worker.onerror = (e) => {
          console.error('[stockfish]', e.message)
          this.fail(new Error(e.message || 'Engine crashed'))
        }
        const uciok = this.waitFor((l) => l === 'uciok', 60000)
        this.post('uci')
        await uciok
        const readyok = this.waitFor((l) => l === 'readyok')
        this.post('isready')
        await readyok
        this.setStatus('ready')
      } catch (err) {
        this.fail(err instanceof Error ? err : new Error(String(err)))
        throw err
      }
    })()
    return this.readyPromise
  }

  /** 0 (weakest) .. 20 (full strength). */
  setSkill(level: number) {
    this.send(`setoption name Skill Level value ${Math.max(0, Math.min(20, Math.round(level)))}`)
  }

  /**
   * Returns the best move for `fen`, or null if the request was superseded
   * (a newer request or cancel() came in) before it finished.
   */
  async bestMove(fen: string, moveTimeMs: number, skill?: number): Promise<EngineMove | null> {
    await this.init()
    const id = ++this.searchId
    // Ask any running search to wrap up; we still wait for its bestmove before issuing ours.
    if (this.status === 'thinking') this.post('stop')

    const run = this.queue
      .catch(() => undefined)
      .then(async (): Promise<string | null> => {
        if (id !== this.searchId) return null
        if (skill !== undefined) this.setSkill(skill)
        this.setStatus('thinking')
        const result = this.waitFor((l) => l.startsWith('bestmove'), moveTimeMs + 15000)
        this.post(`position fen ${fen}`)
        this.post(`go movetime ${moveTimeMs}`)
        try {
          return await result
        } finally {
          if (this.status === 'thinking') this.setStatus('ready')
        }
      })
    this.queue = run

    const line = await run
    if (id !== this.searchId || !line) return null
    const uci = line.split(/\s+/)[1]
    if (!uci || uci === '(none)') return null
    return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
  }

  /** Invalidate an in-flight search (e.g. after undo/reset). */
  cancel() {
    this.searchId++
    if (this.status === 'thinking') this.post('stop')
  }
}

export const stockfish = new StockfishEngine()
