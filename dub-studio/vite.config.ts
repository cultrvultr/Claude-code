import { defineConfig } from 'vite';

// relative base so the build works on any static host or sub-path (Cloudflare Pages, GitHub Pages)
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  build: { target: 'es2022' },
});
