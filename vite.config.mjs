import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Файлы игрового сервера (в т.ч. data/social.json) не должны перезагружать сайт
    watch: { ignored: ['**/server/**'] }
  }
})
