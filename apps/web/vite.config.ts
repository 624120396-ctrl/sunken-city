import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const repositoryRoot = path.resolve(__dirname, '../..');
const productVersion = fs.readFileSync(path.join(repositoryRoot, 'VERSION'), 'utf8').trim();
const changelog = fs.readFileSync(path.join(repositoryRoot, 'CHANGELOG.md'), 'utf8');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __SUNKEN_CITY_VERSION__: JSON.stringify(productVersion),
    __SUNKEN_CITY_CHANGELOG__: JSON.stringify(changelog),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@types': path.resolve(__dirname, './src/types'),
      '@data': path.resolve(__dirname, './src/data'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // 核心 vendor 分离
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge'],
          // 动画引擎单独 chunk
          'animejs': ['animejs'],
          'motion': ['motion'],
          // 表单相关
          'forms': ['react-hook-form', 'zod'],
          // Socket
          'socket': ['socket.io-client'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
