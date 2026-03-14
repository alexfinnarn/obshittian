# AGENTS.md - Guidelines for AI Agents

This file provides guidelines for AI coding agents working in this repository.

## Project Overview

A minimal browser-based Markdown editor with dual-pane editing and daily notes functionality.
Built with **SvelteKit** (adapter-node), **Svelte 5**, and **TypeScript**.

## Reference Docs

- `README.md` - Product overview, core features, and standard development commands
- `docs/architecture/` - Architecture reference for services, state, events, and actions
- `docs/local-deployment.md` - Manual VPS/Kamal deployment workflow

## Build, Lint, and Test Commands

### Development
```bash
npm install           # Install dependencies (requires Node 22+)
npm run dev           # Start dev server at localhost:5173
npm run build         # Production build to build/
```

### Type Checking
```bash
npm run check         # Run TypeScript/Svelte type checking
```

### Testing
```bash
npm test              # Run unit tests in watch mode
npm run test:run      # Run unit tests once
npm run test:e2e      # Run Playwright E2E tests
npm run test:e2e:ui   # Run E2E tests with Playwright UI
npm run test:e2e:headed  # Run E2E tests in headed browser
```

### Running a Single Test

**Unit tests:**
```bash
npm test -- --run src/lib/stores/vault.svelte.test.ts
npm test -- --run src/lib/utils/tags.test.ts
```

**E2E tests:**
```bash
npx playwright test tests/e2e/editor.spec.ts
npx playwright test tests/e2e/file-tree.spec.ts --grep "test name"
```

## Code Style Guidelines

### Svelte 5 Runes

- Use `$state` for reactive module-level state (export the state object directly)
- Use `$derived` only inside components, not in modules
- Use getter functions instead of exporting `$derived` values from modules
- Store tests require `.svelte.test.ts` extension
- Compare `$state` values with `toEqual` (not `toBe`) due to proxy objects

### TypeScript

- Use explicit types for function parameters and return values
- Use interfaces for object shapes, types for unions/aliases
- Enable `strict: true` equivalent via svelte-check

### File Organization

- Components in `src/lib/components/`
- Stores in `src/lib/stores/` (`.svelte.ts` extension)
- Utilities in `src/lib/utils/`
- Services in `src/lib/services/`
- Server utilities in `src/lib/server/`
- API routes in `src/routes/api/`
- Use `$lib` alias for internal imports (configured in svelte.config.js)

### Naming Conventions

- **Components**: PascalCase (`EditorPane.svelte`, `FileTree.svelte`)
- **Stores**: PascalCase with `.svelte.ts` extension (`vault.svelte.ts`, `tabs.svelte.ts`)
- **Utilities**: camelCase (`fileOperations.ts`, `dailyNotes.ts`)
- **Constants**: SCREAMING_SNAKE_CASE for enums, camelCase for const objects
- **Interfaces**: PascalCase (`VaultState`, `Tab`, `JournalEntry`)

### Imports

```typescript
// Internal imports
import { vault, getIsVaultOpen } from '$lib/stores/vault.svelte';
import { extractTags, buildTagIndex } from '$lib/utils/tags';
import { fileService } from '$lib/services/fileService';

// External imports
import { renderMarkdown } from '$lib/utils/markdown';
import { onMount } from 'svelte';
```

### Svelte Components

- Use TypeScript in `<script lang="ts">`
- Use runes (`$state`, `$derived`, `$effect`) where applicable
- Use `<script module>` for component-level state (less common in Svelte 5)
- Props via `$props()` rune
- Use `export let` sparingly (prefer `$props()`)
- Use `onclick` instead of `on:click` (Svelte 5)
- Event handling: `onclick={(e) => handler(e)}`

### Error Handling

- Use custom error classes for domain errors (`PathTraversalError`, `VaultNotConfiguredError`)
- Use try/catch with appropriate error propagation in async functions
- Return error responses with status codes in API routes
- Use `tryOrNull<T>` and `tryBoolean` helpers from `src/lib/utils/errors.ts`

### CSS and Styling

- Use CSS variables defined in `src/app.css`
- Follow mobile-first responsive design
- Use existing theme colors via `var(--accent-color)`, `var(--bg-color)`, etc.
- Keep component styles scoped (Svelte default)
- Use utility classes from app.css for common patterns

### Testing

- Unit tests colocated with source files: `src/lib/stores/*.svelte.test.ts`
- E2E tests in `tests/e2e/` directory
- Use Vitest with happy-dom for unit tests
- Use Playwright for E2E tests
- Test fixtures in `tests/data/testing-files/`

### Git Conventions

- Write concise commit messages (1-2 sentences)
- Use present tense: "add feature" not "added feature"
- Commit related changes together
- Never commit secrets, credentials, or `.env` files

### Keyboard Shortcuts Configuration

Shortcuts are configured in `src/lib/config.ts`:
- Use `meta` modifier for Cmd (Mac) / Ctrl (Windows/Linux)
- Use `ctrl` modifier for Ctrl-only
- Document shortcut behavior clearly

### Server-Side vs Client-Side

- Server API routes in `src/routes/api/` use Node.js `fs` module
- Client components use `fileService` to make HTTP requests to API routes
- Never import Node.js modules in client code
- Path validation is handled in `src/lib/server/pathUtils.ts`

### Documentation

- Use JSDoc for complex functions and public APIs
- Document error conditions and edge cases
- Keep comments focused on "why", not "what"
- Don't add comments unless they add value
