/**
 * Minimal Web Audio engine: preloads + decodes every sample once, then plays
 * them through a per-play gain node into a master gain. Playback is scheduled
 * on the AudioContext clock so timing offsets are sample-accurate.
 */
import type { LoadStatus, SampleMeta } from './types'

export interface PlayOptions {
  volume?: number // 0..1
  offsetMs?: number // delay before the sound starts
}

type Listener = () => void

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private buffers = new Map<string, AudioBuffer>()
  private status = new Map<string, LoadStatus>()
  private listeners = new Set<Listener>()
  private masterVolume = 1
  private muted = false
  private snapshot: ReadonlyMap<string, LoadStatus> = new Map()

  /** Lazily creates the context. Browsers require a user gesture before audio is audible. */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' })
      this.master = this.ctx.createGain()
      this.master.connect(this.ctx.destination)
      this.applyMasterGain()
    }
    return this.ctx
  }

  /** Call from a user gesture (pointerdown/keydown) to unlock audio. */
  resume(): void {
    const ctx = this.ensureContext()
    if (ctx.state === 'suspended') void ctx.resume()
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Immutable snapshot for useSyncExternalStore. */
  getStatusSnapshot(): ReadonlyMap<string, LoadStatus> {
    return this.snapshot
  }

  private notify() {
    this.snapshot = new Map(this.status)
    for (const l of this.listeners) l()
  }

  async preload(samples: SampleMeta[]): Promise<void> {
    const ctx = this.ensureContext()
    const pending = samples.filter((s) => !this.status.has(s.id))
    for (const s of pending) this.status.set(s.id, 'loading')
    if (pending.length) this.notify()

    await Promise.all(
      pending.map(async (s) => {
        try {
          let bytes: ArrayBuffer
          if (s.blob) {
            bytes = await s.blob.arrayBuffer()
          } else {
            const res = await fetch(s.url)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            bytes = await res.arrayBuffer()
          }
          const buf = await ctx.decodeAudioData(bytes)
          this.buffers.set(s.id, buf)
          this.status.set(s.id, 'ready')
        } catch (err) {
          console.warn(`[audio] failed to load ${s.url}`, err)
          this.status.set(s.id, 'error')
        }
        this.notify()
      }),
    )
  }

  /** Drop a sample (e.g. a deleted upload). */
  unload(sampleId: string) {
    this.buffers.delete(sampleId)
    this.status.delete(sampleId)
    this.notify()
  }

  getBuffer(sampleId: string): AudioBuffer | undefined {
    return this.buffers.get(sampleId)
  }

  /** Returns the scheduled start time (ctx clock) or null if the sample is unavailable. */
  play(sampleId: string, { volume = 1, offsetMs = 0 }: PlayOptions = {}): number | null {
    const buffer = this.buffers.get(sampleId)
    if (!buffer || !this.master) return null
    const ctx = this.ensureContext()
    if (ctx.state === 'suspended') void ctx.resume()

    const source = ctx.createBufferSource()
    source.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.value = Math.max(0, Math.min(1, volume))
    source.connect(gain).connect(this.master)

    const when = ctx.currentTime + Math.max(0, offsetMs) / 1000
    source.start(when)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
    }
    return when
  }

  setMasterVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v))
    this.applyMasterGain()
  }

  setMuted(m: boolean) {
    this.muted = m
    this.applyMasterGain()
  }

  private applyMasterGain() {
    if (!this.master || !this.ctx) return
    const target = this.muted ? 0 : this.masterVolume
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.01)
  }
}

export const audioEngine = new AudioEngine()

// Unlock audio on the first gesture anywhere on the page (capture phase so it
// runs before the click handler that might trigger a sound).
if (typeof window !== 'undefined') {
  const unlock = () => audioEngine.resume()
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true })
  window.addEventListener('keydown', unlock, { capture: true, passive: true })
}
