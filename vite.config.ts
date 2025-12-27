import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,ts}'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
