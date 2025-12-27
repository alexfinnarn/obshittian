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
  // Track if we're syncing external content to prevent feedback loops
  let isSyncing = false;

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isSyncing) {
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
            },
          }),
          oneDark,
          updateListener,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { height: '100%', fontSize: '14px' },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: "'SF Mono', 'Consolas', 'Monaco', monospace",
            },
            '.cm-content': { padding: '16px' },
            '.cm-gutters': {
              backgroundColor: '#1e1e1e',
              borderRight: '1px solid #333',
            },
          }),
        ],
      }),
      parent: container,
    });
  });

  onDestroy(() => {
    view?.destroy();
    view = null;
  });

  // Sync external content changes to editor
  $effect(() => {
    if (view && view.state.doc.toString() !== content) {
      isSyncing = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
      isSyncing = false;
    }
  });

  /**
   * Get the current editor content
   */
  export function getContent(): string {
    return view?.state.doc.toString() ?? '';
  }

  /**
   * Focus the editor
   */
  export function focus(): void {
    view?.focus();
  }

  /**
   * Check if the editor is focused
   */
  export function hasFocus(): boolean {
    return view?.hasFocus ?? false;
  }
</script>

<div bind:this={container} class="editor-container" data-testid="codemirror-editor"></div>

<style>
  .editor-container {
    height: 100%;
    overflow: hidden;
  }

  .editor-container :global(.cm-editor) {
    height: 100%;
  }

  .editor-container :global(.cm-scroller) {
    overflow: auto;
  }
</style>
