/** One audio file, either found under public/sounds/ (see plugins/soundManifest.ts) or uploaded in the browser. */
export interface SampleMeta {
  /** Stable key used in presets, e.g. "original/move.wav" or "upload:concept-c/move.wav". */
  id: string
  /** Human readable name derived from the file name, e.g. "Move". */
  name: string
  /** File name with extension. */
  file: string
  /** Sub folder / set, e.g. "original" or "concept-a". Empty for files directly in /sounds. */
  set: string
  /** Public URL used for fetching. Empty for uploads (which carry a blob). */
  url: string
  /** Present for browser uploads: the raw file, stored in IndexedDB. */
  blob?: Blob
  uploaded?: boolean
}

export type LoadStatus = 'loading' | 'ready' | 'error'
