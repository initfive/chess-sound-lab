/// <reference types="vite/client" />

declare module 'virtual:sound-manifest' {
  import type { SampleMeta } from './audio/types'
  export const samples: SampleMeta[]
  export default samples
}
