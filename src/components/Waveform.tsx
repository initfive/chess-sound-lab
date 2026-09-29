import { useEffect, useRef } from 'react'

interface Props {
  buffer: AudioBuffer | undefined
  /** performance.now() timestamp when playback started, or null. Drives the playhead. */
  playStartedAt: number | null
  height?: number
}

/** Draws min/max peaks of a decoded buffer plus an animated playhead. */
export function Waveform({ buffer, playStartedAt, height = 48 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const peaksRef = useRef<Float32Array | null>(null)

  // Compute peaks once per buffer & width.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      canvas.width = width * dpr
      canvas.height = height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)
      if (!buffer) return

      const columns = Math.max(1, Math.floor(width / 2))
      const peaks = new Float32Array(columns)
      const data = buffer.getChannelData(0)
      const step = Math.max(1, Math.floor(data.length / columns))
      for (let c = 0; c < columns; c++) {
        let max = 0
        const start = c * step
        for (let i = start; i < start + step && i < data.length; i++) {
          const v = Math.abs(data[i])
          if (v > max) max = v
        }
        peaks[c] = max
      }
      peaksRef.current = peaks

      const style = getComputedStyle(canvas)
      ctx.fillStyle = style.getPropertyValue('--wave').trim() || '#8178FF'
      const mid = height / 2
      for (let c = 0; c < columns; c++) {
        const h = Math.max(1, peaks[c] * (height - 4))
        ctx.fillRect(c * 2, mid - h / 2, 1.2, h)
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [buffer, height])

  // Playhead overlay via a sibling element so we don't redraw peaks.
  const headRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const head = headRef.current
    if (!head || !buffer || playStartedAt === null) return
    const durationMs = buffer.duration * 1000
    let raf = 0
    const tick = () => {
      const t = performance.now() - playStartedAt
      const p = Math.min(1, t / durationMs)
      head.style.opacity = p < 1 ? '1' : '0'
      head.style.left = `${p * 100}%`
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [buffer, playStartedAt])

  return (
    <div className="wave" style={{ height }}>
      <canvas ref={canvasRef} className="wave-canvas" />
      <div ref={headRef} className="wave-head" />
    </div>
  )
}
