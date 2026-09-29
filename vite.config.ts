import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { soundManifest } from './plugins/soundManifest.ts'

export default defineConfig({
  plugins: [react(), soundManifest()],
})
