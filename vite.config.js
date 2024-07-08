// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'), // 入口文件路径
      name: 'YSElement', // npm 包的名称
      fileName: format => `YSElement.${format}.js`,
    },
    rollupOptions: {
      // 其他 rollup 配置
    },
  },
});
