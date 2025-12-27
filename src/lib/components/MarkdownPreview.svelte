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

<style>
  .preview {
    height: 100%;
    overflow: auto;
    padding: 16px;
    color: var(--text-color, #e0e0e0);
    line-height: 1.6;
  }

  .preview :global(h1),
  .preview :global(h2),
  .preview :global(h3),
  .preview :global(h4),
  .preview :global(h5),
  .preview :global(h6) {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    color: var(--heading-color, #fff);
  }

  .preview :global(h1) {
    font-size: 1.8em;
    border-bottom: 1px solid var(--border-color, #333);
    padding-bottom: 0.3em;
  }

  .preview :global(h2) {
    font-size: 1.5em;
  }

  .preview :global(h3) {
    font-size: 1.25em;
  }

  .preview :global(p) {
    margin: 1em 0;
  }

  .preview :global(a) {
    color: var(--link-color, #4fc3f7);
    text-decoration: none;
  }

  .preview :global(a:hover) {
    text-decoration: underline;
  }

  .preview :global(code) {
    background: var(--code-bg, #1e1e1e);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
  }

  .preview :global(pre) {
    background: var(--code-bg, #1e1e1e);
    padding: 1em;
    border-radius: 4px;
    overflow-x: auto;
  }

  .preview :global(pre code) {
    padding: 0;
    background: none;
  }

  .preview :global(ul),
  .preview :global(ol) {
    margin: 1em 0;
    padding-left: 2em;
  }

  .preview :global(li) {
    margin: 0.25em 0;
  }

  .preview :global(blockquote) {
    margin: 1em 0;
    padding-left: 1em;
    border-left: 3px solid var(--border-color, #333);
    color: var(--text-muted, #888);
  }

  .frontmatter-details {
    margin-bottom: 1em;
    background: var(--code-bg, #1e1e1e);
    border-radius: 4px;
    padding: 0.5em;
  }

  .frontmatter-details summary {
    cursor: pointer;
    color: var(--text-muted, #888);
    font-size: 0.9em;
    user-select: none;
  }

  .frontmatter-details summary:hover {
    color: var(--text-color, #e0e0e0);
  }

  .preview :global(.frontmatter-yaml) {
    margin: 0.5em 0 0;
    padding: 0.5em;
    font-size: 0.85em;
  }

  /* Collapsible nested lists */
  .preview :global(details) {
    margin: 0.25em 0;
  }

  .preview :global(details summary) {
    cursor: pointer;
    user-select: none;
  }

  .preview :global(details summary:hover) {
    color: var(--link-color, #4fc3f7);
  }

  /* Checkbox styling for task lists */
  .preview :global(input[type='checkbox']) {
    margin-right: 0.5em;
  }

  /* Table styling */
  .preview :global(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }

  .preview :global(th),
  .preview :global(td) {
    border: 1px solid var(--border-color, #333);
    padding: 0.5em;
    text-align: left;
  }

  .preview :global(th) {
    background: var(--code-bg, #1e1e1e);
  }

  /* Horizontal rule */
  .preview :global(hr) {
    border: none;
    border-top: 1px solid var(--border-color, #333);
    margin: 2em 0;
  }
</style>
