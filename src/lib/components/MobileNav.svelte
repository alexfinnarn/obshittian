<script lang="ts">
  export type MobileView = 'sidebar' | 'editor' | 'journal';

  interface Props {
    activeView: MobileView;
    onviewchange: (view: MobileView) => void;
  }

  let { activeView, onviewchange }: Props = $props();

  function handleTabClick(view: MobileView) {
    onviewchange(view);
  }
</script>

<nav class="mobile-nav safe-area-bottom" data-testid="mobile-nav">
  <button
    class="nav-tab"
    class:active={activeView === 'sidebar'}
    onclick={() => handleTabClick('sidebar')}
    aria-label="Files"
    data-testid="mobile-nav-sidebar"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
    <span class="nav-label">Files</span>
  </button>

  <button
    class="nav-tab"
    class:active={activeView === 'editor'}
    onclick={() => handleTabClick('editor')}
    aria-label="Editor"
    data-testid="mobile-nav-editor"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
    <span class="nav-label">Editor</span>
  </button>

  <button
    class="nav-tab"
    class:active={activeView === 'journal'}
    onclick={() => handleTabClick('journal')}
    aria-label="Journal"
    data-testid="mobile-nav-journal"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
    <span class="nav-label">Journal</span>
  </button>
</nav>

<style>
  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--mobile-nav-height, 56px);
    background: var(--mobile-nav-bg, #252525);
    border-top: 1px solid var(--mobile-nav-border, #333);
    z-index: 100;
  }

  .nav-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: none;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    padding: 8px;
    min-height: var(--touch-target-min, 44px);
    transition: color 0.15s ease;
  }

  .nav-tab:hover {
    color: var(--text-color, #e0e0e0);
  }

  .nav-tab.active {
    color: var(--mobile-nav-active, #3794ff);
  }

  .nav-tab svg {
    width: 24px;
    height: 24px;
  }

  .nav-label {
    font-size: 11px;
    font-weight: 500;
  }

  /* Hide on desktop */
  @media (min-width: 768px) {
    .mobile-nav {
      display: none;
    }
  }
</style>
