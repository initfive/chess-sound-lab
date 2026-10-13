/**
 * The sample library = files from public/sounds (build-time manifest) + browser uploads.
 * Exposed as a tiny external store so components re-render when uploads change.
 */
import { useMemo, useSyncExternalStore } from 'react'
import { samples as manifest } from 'virtual:sound-manifest'
import type { SampleMeta } from './types'
import { addUploads, listUploads, removeUpload } from './uploads'

type Listener = () => void

const sortSamples = (list: SampleMeta[]) =>
  [...list].sort((a, b) => {
    if (!!a.uploaded !== !!b.uploaded) return a.uploaded ? 1 : -1
    return a.set === b.set ? a.name.localeCompare(b.name) : a.set.localeCompare(b.set)
  })

let uploads: SampleMeta[] = []
let snapshot: SampleMeta[] = sortSamples(manifest)
const listeners = new Set<Listener>()

function publish() {
  snapshot = sortSamples([...manifest, ...uploads])
  for (const l of listeners) l()
}

export const library = {
  getSamples: () => snapshot,
  subscribe(l: Listener) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  async loadUploads() {
    try {
      uploads = await listUploads()
      publish()
    } catch (err) {
      console.warn('[library] could not read uploads', err)
    }
  },
  async add(files: File[], set: string) {
    const added = await addUploads(files, set)
    const ids = new Set(added.map((s) => s.id))
    uploads = [...uploads.filter((s) => !ids.has(s.id)), ...added]
    publish()
    return added
  },
  async remove(id: string) {
    await removeUpload(id)
    uploads = uploads.filter((s) => s.id !== id)
    publish()
  },
}

/** Reactive list of all samples plus derived lookups. */
export function useSamples() {
  const samples = useSyncExternalStore(library.subscribe, library.getSamples)
  const byId = useMemo(() => new Map(samples.map((s) => [s.id, s])), [samples])
  const sets = useMemo(() => [...new Set(samples.map((s) => s.set))], [samples])
  return { samples, byId, sets }
}

export function setLabel(set: string): string {
  if (!set) return 'Uncategorized'
  const spaced = set.replace(/[-_/]+/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
