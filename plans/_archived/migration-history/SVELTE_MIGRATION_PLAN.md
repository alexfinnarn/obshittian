# Svelte 5 Migration Plan

## Executive Summary

This document outlines the plan to migrate the Minimal MD Editor from vanilla JavaScript to Svelte 5. The goal is to improve code maintainability, simplify state management, and make the codebase easier to reason about.

---

## Why Migrate

### Current Pain Points

1. **State threading is confusing** - The `state` object is passed through 5+ levels of function calls. Every function signature includes `state, elements` parameters.

2. **Manual DOM synchronization** - Code like this is everywhere:
   ```javascript
   // Current: Manual DOM updates scattered across files
   if (elements[pane].unsaved) {
       elements[pane].unsaved.style.display = 'none';
   }
   ```

3. **Circular import risks** - `ui.js` imports from `file-tree.js`, which imports from `tabs.js`, which imports from `ui.js`. This works but is fragile.

4. **Imperative event wiring** - 200+ lines of `addEventListener` calls in `app.js` and scattered across modules.

5. **Script loading complexity** - `dependencies.js` exists solely to coordinate CDN script load order with custom events.

6. **Asymmetric pane logic** - Left pane uses tabs, right pane uses single-file state. This split is handled with conditionals throughout the codebase rather than being encapsulated.

---

## What Svelte 5 Provides

### Runes: Explicit Reactive State

```svelte
<script>
  // Declare reactive state
  let isDirty = $state(false);
  let content = $state('');

  // Derived values (automatically recompute)
  let wordCount = $derived(content.split(/\s+/).length);

  // Side effects (run when dependencies change)
  $effect(() => {
    console.log('Content changed, dirty:', isDirty);
  });
</script>

<!-- Template automatically updates when state changes -->
<span class:visible={isDirty}>●</span>
```

### Component Encapsulation

Each component owns its state, DOM, and styles. No more threading `elements` objects.

### Built-in Transitions and Animations

Context menus, modals, and tab switches can use Svelte's transition system instead of manual CSS class toggling.

---

## Proposed Architecture

### File Structure

```
src/
├── App.svelte              # Root component, layout shell
├── main.js                 # Entry point, mounts App
├── lib/
│   ├── stores/
│   │   ├── vault.svelte.js     # Root directory handle, vault config
│   │   ├── tags.svelte.js      # Tag index (shared across components)
│   │   └── settings.svelte.js  # User preferences
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.svelte
│   │   │   ├── Calendar.svelte
│   │   │   ├── QuickLinks.svelte
│   │   │   ├── QuickFiles.svelte
│   │   │   ├── FileTree.svelte
│   │   │   ├── FileTreeItem.svelte
│   │   │   └── TagSearch.svelte
│   │   ├── Editor/
│   │   │   ├── EditorPane.svelte      # Reusable pane (used for both left/right)
│   │   │   ├── TabBar.svelte
│   │   │   ├── Tab.svelte
│   │   │   ├── CodeMirrorEditor.svelte
│   │   │   └── MarkdownPreview.svelte
│   │   ├── Modals/
│   │   │   ├── Modal.svelte           # Base modal component
│   │   │   ├── QuickLinksModal.svelte
│   │   │   └── QuickFilesModal.svelte
│   │   └── ContextMenu.svelte
│   ├── actions/
│   │   └── clickOutside.js     # Svelte action for click-outside detection
│   └── utils/
│       ├── filesystem.js       # File System Access API helpers
│       ├── frontmatter.js      # YAML parsing (keep existing)
│       ├── markdown.js         # marked.js configuration
│       ├── dailyNotes.js       # Date formatting, template generation
│       └── sync.js             # Docx export logic
├── app.css                 # Global styles
└── index.html              # Vite HTML template
```

### Component Responsibilities

#### App.svelte
- Layout shell (sidebar + main content)
- Keyboard shortcut registration
- Directory open/restore logic

#### EditorPane.svelte
- **Reusable for both left and right panes**
- Props: `mode` ("tabs" | "single"), `purpose` ("working" | "daily")
- Contains: toolbar, tab bar (if tabs mode), editor, preview
- Owns its own dirty state, view mode, content

#### FileTree.svelte
- Recursive rendering of directory structure
- Context menu triggering (emits events, doesn't own menu)
- Emits: `fileSelect`, `contextMenu`

#### ContextMenu.svelte
- Portal-rendered (appears at document root)
- Receives position and actions via props
- Handles New File, New Folder, Rename, Delete

---

## State Management Strategy

### Global Stores (Svelte 5 Runes)

```javascript
// src/lib/stores/vault.svelte.js
export const vault = $state({
  rootDirHandle: null,
  dailyNotesFolder: 'zzz_Daily Notes',
  config: null,  // .editor-config.json contents
});

// Derived: is a vault open?
export const isVaultOpen = $derived(vault.rootDirHandle !== null);
```

### Component-Local State

Each `EditorPane` owns its state:

```svelte
<!-- EditorPane.svelte -->
<script>
  let { mode = 'single', purpose = 'working' } = $props();

  // Local state - not shared
  let tabs = $state([]);
  let activeTabIndex = $state(-1);
  let viewMode = $state('edit');

  // Derived
  let activeTab = $derived(tabs[activeTabIndex] ?? null);
  let isDirty = $derived(activeTab?.isDirty ?? false);
</script>
```

### Cross-Component Communication

1. **Parent-to-child**: Props
2. **Child-to-parent**: Events (`dispatch` or callback props)
3. **Sibling/distant**: Stores (for truly global state like vault handle, tag index)

---

## External Library Integration

### CodeMirror 6

```svelte
<!-- CodeMirrorEditor.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { markdown } from '@codemirror/lang-markdown';
  import { oneDark } from '@codemirror/theme-one-dark';

  let { content = $bindable(''), onchange } = $props();
  let container;
  let view;

  onMount(() => {
    view = new EditorView({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            content = update.state.doc.toString();
            onchange?.(content);
          }
        })
      ],
      parent: container
    });
  });

  onDestroy(() => view?.destroy());

  // Sync external content changes to editor
  $effect(() => {
    if (view && view.state.doc.toString() !== content) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content }
      });
    }
  });
</script>

<div bind:this={container} class="editor-container"></div>
```

### Pikaday Calendar

```svelte
<!-- Calendar.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import Pikaday from 'pikaday';

  let { selectedDate = $bindable(new Date()), onselect } = $props();
  let container;
  let picker;

  onMount(() => {
    picker = new Pikaday({
      bound: false,
      onSelect: (date) => {
        selectedDate = date;
        onselect?.(date);
      }
    });
    container.appendChild(picker.el);
  });

  onDestroy(() => picker?.destroy());
</script>

<div bind:this={container}></div>
```

### Marked.js

No component wrapper needed - import directly where used:

```svelte
<!-- MarkdownPreview.svelte -->
<script>
  import { marked } from 'marked';
  import { configureMarked } from '$lib/utils/markdown.js';

  let { content } = $props();

  // Configure once
  configureMarked();

  let html = $derived(marked.parse(content));
</script>

<div class="preview">{@html html}</div>
```

---

## Migration Strategy

### Phase 1: Project Setup
1. Initialize SvelteKit project (or Vite + Svelte)
2. Configure build tooling
3. Set up TypeScript (optional but recommended)
4. Port CSS to `app.css` and component styles

### Phase 2: Core Components (No External Libraries)
1. `App.svelte` - layout shell
2. `Sidebar.svelte` - container
3. `QuickLinks.svelte` / `QuickFiles.svelte`
4. `Modal.svelte` - base modal
5. `ContextMenu.svelte`

### Phase 3: File System Integration
1. Port `filesystem.js` utilities
2. `FileTree.svelte` + `FileTreeItem.svelte`
3. Vault store with directory open/restore

### Phase 4: Editor Panes
1. `CodeMirrorEditor.svelte` wrapper
2. `MarkdownPreview.svelte`
3. `EditorPane.svelte` (single file mode first)
4. `TabBar.svelte` + `Tab.svelte`
5. EditorPane tabs mode

### Phase 5: Calendar & Daily Notes
1. `Calendar.svelte` (Pikaday wrapper)
2. Daily note creation/opening logic
3. Keyboard navigation (arrow keys)

### Phase 6: Search & Tags
1. Port tag indexing logic
2. `TagSearch.svelte`
3. Fuse.js integration

### Phase 7: Sync/Export
1. Port docx export logic
2. Frontmatter auto-upgrade on save

### Phase 8: Polish
1. Keyboard shortcuts (global)
2. Persistence (IndexedDB, localStorage)
3. Error handling
4. Testing

---

## Testing Approach

### Unit Tests (Vitest)
- Utility functions (`frontmatter.js`, `dailyNotes.js`, `sync.js`)
- Store logic

### Component Tests (Vitest + @testing-library/svelte)
- Individual component behavior
- Props/events contracts

### E2E Tests (Playwright)
- Port existing `app.spec.js` tests
- Full user flows

---

## Build & Development

### Recommended: Vite + Svelte

```bash
npm create vite@latest editor-svelte -- --template svelte
cd editor-svelte
npm install
```

### Dependencies

```json
{
  "dependencies": {
    "codemirror": "^6.0.0",
    "@codemirror/lang-markdown": "^6.0.0",
    "@codemirror/theme-one-dark": "^6.0.0",
    "marked": "^15.0.0",
    "pikaday": "^1.8.2",
    "fuse.js": "^7.0.0",
    "docx": "^8.5.0"
  },
  "devDependencies": {
    "svelte": "^5.0.0",
    "vite": "^6.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "vitest": "^2.0.0",
    "@testing-library/svelte": "^5.0.0",
    "playwright": "^1.48.0"
  }
}
```

---

## What Gets Simpler

| Current (Vanilla JS) | Svelte 5 |
|---------------------|----------|
| `state` object passed to 15+ functions | Component-local `$state()` |
| `elements` object with 20+ DOM refs | `bind:this` where needed |
| Manual `element.style.display = 'none'` | `{#if condition}` or `class:hidden` |
| `addEventListener` in init functions | `onclick={handler}` in template |
| `dependencies.js` script coordination | `import` statements (bundled) |
| Conditional logic for left/right pane | Same `EditorPane` component, different props |

---

## What Gets More Complex

1. **Build step required** - No more "open index.html in browser"
2. **Learning curve** - Svelte syntax, Runes, component lifecycle
3. **Initial setup** - More tooling configuration

---

## Open Questions

1. **SvelteKit vs plain Svelte+Vite?**
   - SvelteKit adds file-based routing, SSR (not needed), more config
   - Plain Vite+Svelte is simpler for a single-page app
   - **Recommendation**: Start with plain Vite+Svelte

2. **TypeScript?**
   - Adds safety and editor autocomplete
   - More setup, some learning curve
   - **Recommendation**: Yes, but can add incrementally

3. **Keep tests during migration or rewrite after?**
   - E2E tests should mostly work (test user behavior, not implementation)
   - Unit tests will need rewriting
   - **Recommendation**: Keep E2E tests running, rewrite unit tests per-component

---

## Success Criteria

After migration, the codebase should:

1. Have no function signatures with `state, elements` parameters
2. Have each component owning its own DOM references
3. Have clear data flow (props down, events up)
4. Pass all existing E2E tests
5. Be understandable to someone reading it for the first time

---

## Next Steps

1. Review and approve this plan
2. Create new project with Vite + Svelte 5
3. Begin Phase 1 (project setup)
