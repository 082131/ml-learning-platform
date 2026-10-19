/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built dist/ works from any static host or sub-path.
  base: './',
  plugins: [
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm, remarkMath], rehypePlugins: [rehypeKatex] }) },
    react({ include: /\.(mdx|tsx|ts)$/ }),
  ],
  // The Pyodide worker imports the runtime from a URL at run time, which needs an ES module worker.
  worker: { format: 'es' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'content/**/*.test.ts', 'scripts/**/*.test.ts'],
    css: false,
    // The file-system transform cache keeps stale import.meta.glob results when lesson files are added.
    fsModuleCache: false,
  },
});
