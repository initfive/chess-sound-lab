import { samples as manifest } from 'virtual:sound-manifest'
import type { SampleMeta } from './types'

/** All samples under public/sounds, sorted by set then name. */
export const samples: SampleMeta[] = [...manifest].sort((a, b) =>
  a.set === b.set ? a.name.localeCompare(b.name) : a.set.localeCompare(b.set),
)

export const sampleById = new Map(samples.map((s) => [s.id, s]))

/** Distinct sub folders, in order. */
export const sampleSets: string[] = [...new Set(samples.map((s) => s.set))]

export function setLabel(set: string): string {
  if (!set) return 'Uncategorized'
  const spaced = set.replace(/[-_/]+/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
