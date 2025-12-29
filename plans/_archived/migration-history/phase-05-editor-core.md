# Phase 5: Editor Core

## Goal
Implement the CodeMirror editor wrapper, MarkdownPreview component, and EditorPane in single-file mode. This phase establishes the foundation for the dual-pane editing experience.

## Prerequisites
- Phase 4 complete (FileTree, FilenameModal, fileOperations utility, event bus events)

## Tasks

### 5.1 Install CodeMirror Dependencies

Add CodeMirror 6 packages to the project:

```bash
npm install codemirror @codemirror/lang-markdown @codemirror/lang-yaml @codemirror/theme-one-dark
npm install @codemirror/autocomplete @codemirror/commands @codemirror/view @codemirror/state
```

### 5.2 Create Markdown Utilities

Create `src/lib/utils/markdown.ts`:

```typescript
// Port from js/marked-config.js
import { marked } from 'marked';
import { splitFrontmatter } from './frontmatter';

export function configureMarked(): void
export function renderFrontmatterHtml(yaml: string): string
export function renderMarkdown(text: string): { frontmatterHtml: string; bodyHtml: string }
```

Features:
- Configure marked with custom renderer
- Links open in new tab (`target="_blank"`)
- Nested lists wrapped in `<details>/<summary>` for collapse/expand
- Frontmatter rendered as formatted code block

### 5.3 Create MarkdownPreview Component

Create `src/lib/components/MarkdownPreview.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { renderMarkdown, configureMarked } from '$lib/utils/markdown';

  interface Props {
    content: string;
  }

  let { content }: Props = $props();

  // Configure marked once on mount
  onMount(() => {
    configureMarked();
  });

  // Render markdown reactively
  const rendered = $derived(renderMarkdown(content));
</script>

<div class="preview" data-testid="markdown-preview">
  {#if rendered.frontmatterHtml}
    <details class="frontmatter-details">
      <summary>Frontmatter</summary>
      {@html rendered.frontmatterHtml}
    </details>
  {/if}
  {@html rendered.bodyHtml}
</div>
```

Features:
- Reactive rendering when content changes
- Collapsible frontmatter section
- Appropriate styling for dark theme

### 5.4 Create CodeMirrorEditor Component

Create `src/lib/components/CodeMirrorEditor.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
  import { yaml } from '@codemirror/lang-yaml';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { keymap, dropCursor } from '@codemirror/view';
  import { indentWithTab } from '@codemirror/commands';
  import { closeBrackets } from '@codemirror/autocomplete';

  interface Props {
    content?: string;
    onchange?: (content: string) => void;
    ondocchange?: () => void;
  }

  let { content = '', onchange, ondocchange }: Props = $props();

  let container: HTMLDivElement;
  let view: EditorView | null = null;

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const text = update.state.doc.toString();
        onchange?.(text);
        ondocchange?.();
      }
    });

    view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          closeBrackets(),
          dropCursor(),
          markdown({
            base: markdownLanguage,
            codeLanguages: (info) => {
              if (info === 'yaml' || info === 'yml') {
                return yaml().language;
              }
              return null;
            }
          }),
          oneDark,
          updateListener,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { height: '100%', fontSize: '14px' },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: "'SF Mono', 'Consolas', 'Monaco', monospace"
            },
            '.cm-content': { padding: '16px' },
            '.cm-gutters': {
              backgroundColor: '#1e1e1e',
              borderRight: '1px solid #333'
            }
          })
        ]
      }),
      parent: container
    });
  });

  onDestroy(() => {
    view?.destroy();
  });

  // Sync external content changes to editor
  $effect(() => {
    if (view && view.state.doc.toString() !== content) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content }
      });
    }
  });

  // Expose methods for parent components
  export function getContent(): string {
    return view?.state.doc.toString() ?? '';
  }

  export function focus(): void {
    view?.focus();
  }
</script>

<div bind:this={container} class="editor-container" data-testid="codemirror-editor"></div>
```

Features:
- Full CodeMirror 6 setup with markdown syntax highlighting
- YAML highlighting in fenced code blocks
- Dark theme (oneDark)
- Tab indentation, auto-closing brackets
- Line wrapping
- Exposes `getContent()` and `focus()` methods

### 5.5 Create EditorPane Component (Single-File Mode)

Create `src/lib/components/EditorPane.svelte`:

```svelte
<script lang="ts">
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import MarkdownPreview from './MarkdownPreview.svelte';
  import { emit } from '$lib/utils/eventBus';

  interface Props {
    pane: 'left' | 'right';
    filename?: string;
    content?: string;
    isDirty?: boolean;
    oncontentchange?: (content: string) => void;
  }

  let {
    pane,
    filename = '',
    content = '',
    isDirty = false,
    oncontentchange,
  }: Props = $props();

  // View mode: 'edit' | 'view'
  let viewMode = $state<'edit' | 'view'>('edit');

  function toggleViewMode() {
    viewMode = viewMode === 'edit' ? 'view' : 'edit';
  }

  function handleContentChange(newContent: string) {
    oncontentchange?.(newContent);
  }

  function handleSave() {
    emit('file:save', { pane });
  }
</script>

<div class="editor-pane" data-testid="editor-pane-{pane}">
  <header class="pane-toolbar" data-testid="pane-toolbar-{pane}">
    <span class="filename" data-testid="pane-filename-{pane}">
      {filename || 'No file open'}
      {#if isDirty}
        <span class="unsaved-indicator" data-testid="unsaved-indicator-{pane}">●</span>
      {/if}
    </span>

    <div class="toolbar-actions">
      <button
        class="view-toggle"
        class:active={viewMode === 'edit'}
        onclick={() => viewMode = 'edit'}
        data-testid="view-toggle-edit-{pane}"
      >
        Edit
      </button>
      <button
        class="view-toggle"
        class:active={viewMode === 'view'}
        onclick={() => viewMode = 'view'}
        data-testid="view-toggle-view-{pane}"
      >
        View
      </button>
    </div>
  </header>

  <div class="pane-content">
    {#if viewMode === 'edit'}
      <CodeMirrorEditor
        {content}
        onchange={handleContentChange}
      />
    {:else}
      <MarkdownPreview {content} />
    {/if}
  </div>
</div>
```

Features:
- Toolbar with filename and unsaved indicator
- Edit/View mode toggle
- Shows CodeMirrorEditor in edit mode
- Shows MarkdownPreview in view mode
- Emits `file:save` event when save requested

### 5.6 Create Editor Store

Create `src/lib/stores/editor.svelte.ts`:

```typescript
interface PaneState {
  fileHandle: FileSystemFileHandle | null;
  dirHandle: FileSystemDirectoryHandle | null;
  content: string;
  isDirty: boolean;
}

interface EditorState {
  left: PaneState;
  right: PaneState;
}

export const editor = $state<EditorState>({
  left: { fileHandle: null, dirHandle: null, content: '', isDirty: false },
  right: { fileHandle: null, dirHandle: null, content: '', isDirty: false },
});

export function openFileInPane(
  pane: 'left' | 'right',
  fileHandle: FileSystemFileHandle,
  dirHandle: FileSystemDirectoryHandle,
  content: string
): void

export function updatePaneContent(pane: 'left' | 'right', content: string): void

export function markPaneDirty(pane: 'left' | 'right'): void

export function markPaneClean(pane: 'left' | 'right', content: string): void

export function closePaneFile(pane: 'left' | 'right'): void
```

### 5.7 Update App.svelte

Replace pane placeholders with EditorPane components:

```svelte
<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import EditorPane from '$lib/components/EditorPane.svelte';
  import { editor, openFileInPane, updatePaneContent } from '$lib/stores/editor.svelte';
  import { vault } from '$lib/stores/vault.svelte';
  import { on } from '$lib/utils/eventBus';
  import { writeToFile } from '$lib/utils/fileOperations';

  onMount(() => {
    // Handle file:open events
    unsubscribers.push(
      on('file:open', async (data) => {
        // Navigate to file and open in pane
        const pane = data.pane ?? 'left';
        // ... open file logic
      })
    );

    // Handle file:save events
    unsubscribers.push(
      on('file:save', async (data) => {
        const pane = data.pane;
        const state = editor[pane];
        if (state.fileHandle) {
          await writeToFile(state.fileHandle, state.content);
          markPaneClean(pane, state.content);
        }
      })
    );
  });
</script>

<div class="app">
  <Sidebar />
  <main class="editor-area">
    <EditorPane
      pane="left"
      filename={editor.left.fileHandle?.name ?? ''}
      content={editor.left.content}
      isDirty={editor.left.isDirty}
      oncontentchange={(c) => updatePaneContent('left', c)}
    />
    <div class="pane-divider"></div>
    <EditorPane
      pane="right"
      filename={editor.right.fileHandle?.name ?? ''}
      content={editor.right.content}
      isDirty={editor.right.isDirty}
      oncontentchange={(c) => updatePaneContent('right', c)}
    />
  </main>
</div>
```

### 5.8 Add Keyboard Shortcuts

Register keyboard shortcuts for save and view toggle:

```typescript
// In App.svelte or a dedicated shortcuts handler
function handleKeydown(event: KeyboardEvent) {
  const isMod = event.metaKey || event.ctrlKey;

  // Cmd/Ctrl+S - Save
  if (isMod && event.key === 's') {
    event.preventDefault();
    // Save focused pane or both
    emit('file:save', { pane: 'left' }); // TODO: detect focused pane
  }

  // Cmd/Ctrl+E - Toggle view mode
  if (isMod && event.key === 'e') {
    event.preventDefault();
    // Toggle view for focused pane
  }
}
```

### 5.9 Add Pane Resizer

Create `src/lib/components/PaneResizer.svelte`:

```svelte
<script lang="ts">
  import { savePaneWidth } from '$lib/utils/filesystem';

  let isDragging = $state(false);

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    // Calculate and apply new pane widths
  }

  function handleMouseUp() {
    if (isDragging) {
      isDragging = false;
      // Save width to localStorage
    }
  }
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div
  class="pane-divider"
  class:dragging={isDragging}
  onmousedown={handleMouseDown}
  data-testid="pane-divider"
></div>
```

### 5.10 Write Tests

Create tests for:
- `markdown.ts` - Marked configuration, rendering with frontmatter
- `MarkdownPreview.svelte` - Content rendering, frontmatter display
- `CodeMirrorEditor.svelte` - Editor mounting, content sync (mocked CodeMirror)
- `EditorPane.svelte` - View mode toggle, toolbar display
- `editor.svelte.ts` - Store state management

### 5.11 Verify Integration

- Clicking files in FileTree opens them in left pane
- Content displays in CodeMirror editor
- Edit/View toggle switches between editor and preview
- Unsaved indicator shows when content changes
- Ctrl/Cmd+S saves the file
- Pane divider is draggable
- All tests pass
- `npm run check` passes

## File Structure After Phase 5

```
src/lib/
├── stores/
│   ├── vault.svelte.ts
│   ├── settings.svelte.ts
│   ├── vaultConfig.svelte.ts
│   └── editor.svelte.ts          # NEW
├── components/
│   ├── Sidebar.svelte
│   ├── QuickLinks.svelte
│   ├── QuickFiles.svelte
│   ├── FileTree.svelte
│   ├── FileTreeItem.svelte
│   ├── FilenameModal.svelte
│   ├── Modal.svelte
│   ├── ContextMenu.svelte
│   ├── EditorPane.svelte          # NEW
│   ├── CodeMirrorEditor.svelte    # NEW
│   ├── MarkdownPreview.svelte     # NEW
│   └── PaneResizer.svelte         # NEW
├── actions/
│   └── clickOutside.ts
└── utils/
    ├── eventBus.ts
    ├── fileOperations.ts
    ├── filesystem.ts
    ├── frontmatter.ts
    └── markdown.ts                # NEW
```

## Success Criteria

- [ ] CodeMirror editor with markdown syntax highlighting
- [ ] Dark theme matching app design
- [ ] Edit/View mode toggle per pane
- [ ] Markdown preview with frontmatter handling
- [ ] Collapsible nested lists in preview
- [ ] Links open in new tabs
- [ ] Unsaved indicator when content changes
- [ ] Ctrl/Cmd+S saves file
- [ ] Pane resizer working
- [ ] File clicks open in correct pane
- [ ] Unit tests pass for all components
- [ ] `npm run check` passes

## Research Needed

1. **CodeMirror 6 + Svelte 5** - Best practices for wrapping CM6 in Svelte
2. **Content sync pattern** - How to sync external content changes to CM without infinite loops
3. **Focus tracking** - Detecting which pane has focus for keyboard shortcuts
4. **marked.js types** - TypeScript types for marked custom renderer

## Porting Notes

From vanilla JS:
- `js/editor.js` → `CodeMirrorEditor.svelte`
- `js/marked-config.js` → `markdown.ts` + `MarkdownPreview.svelte`
- `js/ui.js` (view toggle, save) → `EditorPane.svelte` + App.svelte

Key differences:
- CodeMirror lifecycle managed with `onMount`/`onDestroy`
- View mode is component state, not global
- Content changes via reactive $state, not manual DOM updates
- Save via event bus instead of direct function calls

## Dependencies to Add

```json
{
  "dependencies": {
    "codemirror": "^6.0.0",
    "@codemirror/lang-markdown": "^6.0.0",
    "@codemirror/lang-yaml": "^6.0.0",
    "@codemirror/theme-one-dark": "^6.0.0",
    "@codemirror/autocomplete": "^6.0.0",
    "@codemirror/commands": "^6.0.0",
    "@codemirror/view": "^6.0.0",
    "@codemirror/state": "^6.0.0",
    "marked": "^15.0.0"
  }
}
```

## Notes

### Completed Implementation

**Dependencies Added:**
- `@codemirror/lang-yaml` - YAML syntax highlighting for fenced code blocks
- `@codemirror/autocomplete` - closeBrackets() for auto-closing brackets/quotes
- `@codemirror/commands` - indentWithTab for Tab key handling
- `@codemirror/view` - keymap, dropCursor extensions
- `@codemirror/state` - EditorState for editor state management

**Files Created:**
- `src/lib/utils/markdown.ts` - marked.js configuration with custom link/listitem renderers
- `src/lib/utils/markdown.test.ts` - 12 tests for markdown utilities
- `src/lib/components/MarkdownPreview.svelte` - Reactive markdown preview with frontmatter
- `src/lib/components/MarkdownPreview.test.ts` - 11 tests for preview component
- `src/lib/components/CodeMirrorEditor.svelte` - CodeMirror 6 wrapper with content sync
- `src/lib/components/CodeMirrorEditor.test.ts` - 8 tests for editor component
- `src/lib/stores/editor.svelte.ts` - Dual-pane editor state with focus tracking
- `src/lib/stores/editor.svelte.test.ts` - 18 tests for editor store
- `src/lib/components/EditorPane.svelte` - Combined editor/preview pane with toolbar
- `src/lib/components/EditorPane.test.ts` - 20 tests for pane component
- `src/lib/components/PaneResizer.svelte` - Draggable divider for pane resizing
- `src/lib/components/PaneResizer.test.ts` - 7 tests for resizer component

**Key Implementation Details:**

1. **Content Sync Pattern**: Used `isSyncing` flag to prevent infinite loops when syncing external content changes to CodeMirror. The $effect watches for content changes and updates CM when different.

2. **Focus Tracking**: EditorPane sets focused pane on focusin/mousedown events. The focused pane is stored in editor store and used by keyboard shortcuts.

3. **Component Bindings**: Component references (like `leftPaneComponent`) need `$state(null)` to avoid Svelte 5 warnings about non-reactive updates.

4. **Svelte 5 Proxy Comparisons**: When testing $state objects, use `toBe` only for primitives. For object comparisons, compare specific properties (e.g., `fileHandle?.name`) rather than the proxy objects themselves.

5. **A11y Considerations**: PaneResizer uses `role="separator"` with proper ARIA attributes. Added svelte-ignore comments for non-interactive element warnings since the separator is interactive.

**Test Results:**
- All 270 tests pass
- `npm run check` passes with 0 errors
- Build succeeds (716KB bundle - CodeMirror is the main contributor)
