import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index'),
      name: 'YSElement',
      fileName: (format) => `index.${format}.js`
    },
    rollupOptions: {
      external: [], // 这里列出你的外部依赖包，比如 'react' 等
      output: {
        globals: {} // 这里为外部依赖提供全局变量名
      }
    }
  }
})
