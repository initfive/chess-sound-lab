import { useEffect, useSyncExternalStore } from 'react'
import { audioEngine } from './engine'
import type { SampleMeta } from './types'

/** Preloads the given samples and exposes their load status reactively. */
export function useAudioEngine(samples: SampleMeta[]) {
  useEffect(() => {
    void audioEngine.preload(samples)
  }, [samples])

  const status = useSyncExternalStore(
    (cb) => audioEngine.subscribe(cb),
    () => audioEngine.getStatusSnapshot(),
  )

  return { engine: audioEngine, status }
}
