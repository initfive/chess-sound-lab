import { EVENT_PRIORITY, type EventId } from './events'
import type { EventConfigMap, Layering } from './presets'

/**
 * Given the events a move produced, decide which ones to play.
 * `detected` may be in any order; output is in priority order.
 */
export function selectEventsToPlay(detected: EventId[], events: EventConfigMap, layering: Layering): EventId[] {
  const ordered = EVENT_PRIORITY.filter((e) => detected.includes(e))
  const playable = ordered.filter((e) => events[e].enabled && events[e].sampleId)
  if (layering === 'stack') return playable
  return playable.length ? [playable[0]] : []
}
