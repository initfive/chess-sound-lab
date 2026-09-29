/**
 * Vite plugin: scans `public/sounds/**` at dev/build time and exposes the
 * result as `virtual:sound-manifest`. Drop a WAV/MP3 into a subfolder
 * (e.g. public/sounds/concept-a/move.wav) and it shows up automatically.
 */
import { readdirSync, statSync } from 'node:fs'
import { basename, extname, join, relative, sep } from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:sound-manifest'
const RESOLVED_ID = '\0' + VIRTUAL_ID
const AUDIO_EXT = new Set(['.wav', '.mp3', '.ogg', '.m4a', '.aac', '.flac', '.webm'])

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries.sort()) {
    if (entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (AUDIO_EXT.has(extname(entry).toLowerCase())) out.push(full)
  }
  return out
}

function prettify(raw: string): string {
  const spaced = raw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function soundManifest(): Plugin {
  let soundsDir = ''

  const buildModule = () => {
    const samples = walk(soundsDir).map((full) => {
      const rel = relative(soundsDir, full).split(sep).join('/')
      const slash = rel.lastIndexOf('/')
      const set = slash === -1 ? '' : rel.slice(0, slash)
      const file = basename(rel)
      return {
        id: rel,
        name: prettify(basename(file, extname(file))),
        file,
        set,
        url: '/sounds/' + rel.split('/').map(encodeURIComponent).join('/'),
      }
    })
    return `export const samples = ${JSON.stringify(samples, null, 2)};\nexport default samples;\n`
  }

  return {
    name: 'sound-manifest',
    configResolved(config) {
      soundsDir = join(config.publicDir, 'sounds')
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      return id === RESOLVED_ID ? buildModule() : undefined
    },
    configureServer(server) {
      server.watcher.add(soundsDir)
      const refresh = (file: string) => {
        if (!file.startsWith(soundsDir)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.hot.send({ type: 'full-reload' })
      }
      for (const evt of ['add', 'unlink', 'addDir', 'unlinkDir'] as const) {
        server.watcher.on(evt, refresh)
      }
    },
  }
}
