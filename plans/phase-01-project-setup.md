# Phase 1: Project Setup

## Goal
Initialize a Vite + Svelte 5 project alongside the existing vanilla JS code. Get a minimal "Hello World" Svelte app running with proper build configuration.

## Prerequisites
- Node.js 18+
- npm

## Tasks

### 1.1 Create Svelte Project
```bash
cd /Users/alexfinnarn/Sites/personal/editor
npm create vite@latest svelte-app -- --template svelte
cd svelte-app
npm install
```

### 1.2 Install Dependencies
```bash
npm install codemirror @codemirror/lang-markdown @codemirror/theme-one-dark
npm install marked pikaday fuse.js docx
npm install -D vitest @testing-library/svelte playwright @playwright/test
```

### 1.3 Configure Vite
Update `vite.config.js`:
- Configure path aliases (`$lib` → `src/lib`)
- Set up test configuration for Vitest

### 1.4 Port Global CSS
- Copy `style.css` to `svelte-app/src/app.css`
- Remove any JavaScript-specific selectors that won't apply
- Keep CSS custom properties (dark theme)

### 1.5 Create Directory Structure
```
svelte-app/src/
├── App.svelte              # Placeholder
├── main.js                 # Entry point
├── app.css                 # Global styles
├── lib/
│   ├── stores/             # For Phase 2
│   ├── components/         # For Phase 3+
│   ├── actions/            # Svelte actions
│   └── utils/              # Ported utilities
```

### 1.6 Verify Dev Server
```bash
npm run dev
```
- App loads at localhost:5173
- Hot reload works
- No console errors

### 1.7 Verify Build
```bash
npm run build
npm run preview
```
- Production build completes
- Preview server works

### 1.8 Set Up Vitest
Create `svelte-app/vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

Add test script to `package.json`:
```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

### 1.9 Create First Test
Create a simple test to verify setup works:
```javascript
// src/lib/utils/example.test.js
import { describe, it, expect } from 'vitest';

describe('test setup', () => {
  it('works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`

## Success Criteria
- [x] `npm run dev` starts Svelte dev server
- [x] `npm run build` produces working production build
- [x] `npm test` runs and passes
- [x] Directory structure matches proposed architecture
- [x] Minimal CSS reset in place (not ported from old app)
- [x] Original vanilla JS app (`index.html`) still works unchanged

## Notes

### Changes from original plan
- Used TypeScript template (`--template svelte-ts`) instead of JS
- Used `happy-dom` instead of `jsdom` for tests (jsdom v27 has ESM compatibility issues)
- Did not port old CSS; created minimal modern reset instead (will add styling incrementally)
- Node 22.12+ required (set in package.json engines)

### What was set up
- Svelte 5.43.8 with TypeScript
- Vite 7.3.0 (shows Node version warning but works on 20.17.0)
- Path alias `$lib` → `src/lib` (configured in both vite.config.ts and tsconfig.app.json)
- Vitest with happy-dom environment
- Directory structure: `src/lib/{stores,components,actions,utils}`

### Commands
From `svelte-app/` directory:
- `npm run dev` - Start dev server (localhost:5173)
- `npm run build` - Production build to `dist/`
- `npm run preview` - Preview production build
- `npm run test` - Run Vitest in watch mode
- `npm run test:run` - Run Vitest once
- `npm run check` - TypeScript/Svelte type checking

