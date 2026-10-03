import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } }
  },
  renderer: {
    resolve: {
      alias: [
        { find: '@', replacement: resolve('src/renderer/src') },
        { find: '@shared', replacement: resolve('src/shared') },
        // monaco-vim imports deep monaco-editor paths that its exports map no longer exposes.
        { find: /^monaco-editor\/esm\/(.*)$/, replacement: resolve('node_modules/monaco-editor/esm') + '/$1' },
        { find: /^monaco-vim$/, replacement: resolve('node_modules/monaco-vim/dist/index.mjs') }
      ]
    },
    plugins: [react(), tailwindcss()],
    build: { chunkSizeWarningLimit: 6000 }
  }
})
