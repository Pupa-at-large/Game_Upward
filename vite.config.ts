import { defineConfig } from 'vite';

export default defineConfig({
  // 相对路径：让产物在 GitHub Pages 子路径（/game_upward/）下也能正确加载资源。
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
