# Phase 02: State Management Documentation

**Status:** Completed
**Output:** `/docs/architecture/state-management.md`

## Objective

Document the store-based state management approach using Svelte 5 runes, including persistence strategies and reactive patterns.

## Tasks

- [x] Document Svelte 5 runes approach (`$state`, `$derived`, getter functions)
- [x] Document each store's responsibility and API
- [x] Explain persistence strategies (localStorage, IndexedDB, file-based)
- [x] Document store interaction patterns
- [x] Note Svelte 5 testing considerations

## Content Outline

### 1. Svelte 5 Runes Overview

```typescript
// Module-level $state works in .svelte.ts files
export const myStore = $state({ value: 0 });

// $derived CANNOT be exported - use getter functions
export function getDerivedValue() {
  return myStore.value * 2;
}
```

### 2. Store Catalog

| Store | File | Purpose | Persistence |
|-------|------|---------|-------------|
| vault | vault.svelte.ts | Root directory, config | IndexedDB |
| settings | settings.svelte.ts | User preferences | localStorage |
| vaultConfig | vaultConfig.svelte.ts | Quick links/files | .editor-config.json |
| editor | editor.svelte.ts | Dual-pane state | None (session) |
| tabs | tabs.svelte.ts | Tab management | localStorage |
| tags | tags.svelte.ts | Tag index | localStorage |

### 3. Store Details

#### vault.svelte.ts
- **State:** `rootDirHandle`, `dailyNotesFolder`, `syncDirectory`
- **Key functions:** `openVault()`, `closeVault()`, `getIsVaultOpen()`
- **Persistence:** IndexedDB for directory handle restoration

#### settings.svelte.ts
- **State:** `autoOpen`, `restore`, limits, shortcuts
- **Key functions:** `updateSettings()`, `resetSettings()`, `getShortcut()`
- **Persistence:** localStorage with deep merge for shortcuts

#### vaultConfig.svelte.ts
- **State:** `quickLinks`, `quickFiles` arrays
- **Key functions:** `getQuickLinks()`, `setQuickLinks()`, `loadVaultConfig()`
- **Persistence:** `.editor-config.json` in vault root

#### editor.svelte.ts
- **State:** `left`, `right` PaneState, `focusedPane`
- **Key functions:** `openFileInPane()`, `updatePaneContent()`, `markPaneDirty()`
- **Persistence:** None (session-only)

#### tabs.svelte.ts
- **State:** `tabs` array, `activeTabIndex`
- **Key functions:** `addTab()`, `removeTab()`, `switchTab()`, `getActiveTab()`
- **Persistence:** localStorage for restoration

#### tags.svelte.ts
- **State:** `index`, `isIndexing`, `selectedTag`, `meta`
- **Key functions:** `setTagIndex()`, `isIndexBuilt()`, `getFilesForTag()`
- **Persistence:** localStorage with staleness tracking

### 4. Persistence Strategies

```
IndexedDB (vault handle)
└── Survives browser restarts
└── Required for File System Access API handles

localStorage (settings, tabs, tags)
└── Simple key-value storage
└── Limited to ~5MB
└── String serialization

File-based (.editor-config.json)
└── Travels with vault
└── User-editable
└── Vault-specific settings
```

### 5. Store Interaction Patterns

- Components read stores directly (reactive)
- Components call store functions to update
- Services coordinate multiple store updates
- Events notify of changes that cross boundaries

### 6. Testing Considerations

- Tests require `.svelte.test.ts` extension for runes
- Use `toEqual()` not `toBe()` for $state comparisons (proxy objects)
- Mock stores or use real stores depending on test type

## Dependencies

- Read all store files
- Understand persistence utilities in filesystem.ts
- Review component usage

## Acceptance Criteria

- [x] All stores documented with state shape and functions
- [x] Persistence strategies clearly explained
- [x] Svelte 5 runes gotchas documented
- [x] Testing notes included
