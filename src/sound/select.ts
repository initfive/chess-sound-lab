import { EVENT_PRIORITY, type EventId } from './events'
import type { EventConfigMap } from './presets'

/**
 * Given the events a move produced, pick the one to play: the highest-priority enabled event with a sample.
 * `detected` may be in any order; output is in priority order.
 */
export function selectEventsToPlay(detected: EventId[], events: EventConfigMap): EventId[] {
  const ordered = EVENT_PRIORITY.filter((e) => detected.includes(e))
  const playable = ordered.filter((e) => events[e].enabled && events[e].sampleId)
  return playable.length ? [playable[0]] : []
}
