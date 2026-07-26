import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GH_PAGES ? '/-lending/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // 把不常變動的第三方套件拆成獨立檔案：可平行下載，
        // 且日後改版應用程式碼時，這些檔案仍能沿用瀏覽器快取。
        // 路徑需精準比對，避免把 recharts 的相依套件（react-smooth 等）
        // 一併併入主檔，抵銷主管報表的延遲載入。
        manualChunks(id: string) {
          if (/node_modules\/(@firebase|firebase)\//.test(id)) return 'firebase'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          return undefined
        },
      },
    },
  },
})
