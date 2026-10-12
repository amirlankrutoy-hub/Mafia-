import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Уникальный номер сборки: сайт сравнивает его с /version.json и сам
// перезагружается, если в браузере осталась старая версия (например,
// телефон восстановил вкладку из памяти без перезагрузки).
const BUILD_ID = String(Date.now())

const versionFile = () => ({
  name: 'mafia-version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
  }
})

export default defineConfig({
  plugins: [react(), tailwindcss(), versionFile()],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID)
  },
  server: {
    // Файлы игрового сервера (в т.ч. data/social.json) не должны перезагружать сайт
    watch: { ignored: ['**/server/**'] }
  }
})
