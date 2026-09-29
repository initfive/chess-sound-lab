/**
 * Browser-side sample uploads, persisted in IndexedDB so they survive reloads.
 * They only exist in this browser; copy the files into public/sounds/ to make
 * them permanent for everyone.
 */
import type { SampleMeta } from './types'

const DB_NAME = 'chess-sound-lab'
const STORE = 'uploads'
const ID_PREFIX = 'upload:'

interface UploadRecord {
  id: string
  set: string
  file: string
  blob: Blob
  addedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

const prettify = (raw: string) => {
  const spaced = raw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uploads'

function toMeta(r: UploadRecord): SampleMeta {
  return {
    id: r.id,
    name: prettify(r.file.replace(/\.[^.]+$/, '')),
    file: r.file,
    set: r.set,
    url: '',
    blob: r.blob,
    uploaded: true,
  }
}

export async function listUploads(): Promise<SampleMeta[]> {
  if (typeof indexedDB === 'undefined') return []
  const rows = await tx<UploadRecord[]>('readonly', (s) => s.getAll())
  return rows.sort((a, b) => a.addedAt - b.addedAt).map(toMeta)
}

export async function addUploads(files: File[], set: string): Promise<SampleMeta[]> {
  const cleanSet = slugify(set)
  const added: SampleMeta[] = []
  for (const file of files) {
    const record: UploadRecord = {
      id: `${ID_PREFIX}${cleanSet}/${file.name}`,
      set: cleanSet,
      file: file.name,
      blob: file,
      addedAt: Date.now(),
    }
    await tx('readwrite', (s) => s.put(record))
    added.push(toMeta(record))
  }
  return added
}

export async function removeUpload(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id))
}

export const isUploadId = (id: string) => id.startsWith(ID_PREFIX)
