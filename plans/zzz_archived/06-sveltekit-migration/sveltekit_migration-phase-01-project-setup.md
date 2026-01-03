# Phase 01: Project Setup

**Status:** Completed
**Output:** SvelteKit project structure with existing code migrated

## Objective

Initialize SvelteKit in the existing project and migrate current code to the new structure.

## Tasks

- [x] Install SvelteKit dependencies (`@sveltejs/kit`, `@sveltejs/adapter-node`)
- [x] Create `svelte.config.js` with adapter-node configuration
- [x] Create SvelteKit directory structure (`src/routes/`, `src/lib/`)
- [x] Move `App.svelte` content to `src/routes/+page.svelte`
- [x] Create `src/routes/+layout.svelte` with global styles
- [x] Update `vite.config.ts` for SvelteKit
- [x] Move existing `src/lib/` to SvelteKit's `src/lib/` (already in place)
- [x] Update import paths (remove `$lib` conflicts if any) - no conflicts found
- [x] Verify dev server runs (`npm run dev`)
- [x] Verify build works (`npm run build`)

## Directory Structure

```
src/
├── routes/
│   ├── +layout.svelte       # Global layout (imports app.css)
│   ├── +page.svelte         # Main editor page (from App.svelte)
│   └── api/                  # Server routes (Phase 02)
│       └── ...
├── lib/                      # Existing lib/ (unchanged)
│   ├── stores/
│   ├── components/
│   ├── utils/
│   ├── services/
│   ├── actions/
│   └── types/
├── app.html                  # SvelteKit HTML template
└── app.css                   # Global styles (existing)
```

## Configuration Changes

**svelte.config.js:**
```javascript
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $lib: 'src/lib'
    }
  }
};
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
  }
}
```

## Dependencies

- None (first phase)

## Acceptance Criteria

- [x] `npm run dev` starts SvelteKit dev server
- [x] App renders at `http://localhost:5173`
- [x] Existing functionality works (file tree, editor, etc. using old API for now)
- [x] `npm run build` produces working production build
- [x] TypeScript checking passes (`npm run check`)

## Notes

- Deleted `src/main.ts`, `index.html`, and `src/App.svelte` (replaced by SvelteKit structure)
- Updated `tsconfig.json` to extend `.svelte-kit/tsconfig.json`
- Added `skipLibCheck: true` to avoid third-party type conflicts
- Extended `src/global.d.ts` with `FileSystemDirectoryHandle.values()` type
- All 512 unit tests continue to pass
