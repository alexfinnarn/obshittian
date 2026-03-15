<script lang="ts">
  import QuickLinks from './QuickLinks.svelte';
  import QuickFiles from './QuickFiles.svelte';
  import SidebarTabs from './SidebarTabs.svelte';
  import Calendar from './Calendar.svelte';
  import AppSettingsModal from './AppSettingsModal.svelte';
  import { getDatesWithEntries } from '$lib/stores/journal.svelte';

  interface Props {
    /** Callback when a date is selected in the calendar */
    ondateselect?: (date: Date) => void;
  }

  let { ondateselect }: Props = $props();

  // Calendar component reference
  let calendarComponent: Calendar | null = $state(null);
  let showAppSettings = $state(false);

  function handleDateSelect(date: Date) {
    ondateselect?.(date);
  }

  function openAppSettings() {
    showAppSettings = true;
  }

  function closeAppSettings() {
    showAppSettings = false;
  }

  /**
   * Get the calendar component reference (for direct access if needed).
   */
  export function getCalendar(): Calendar | null {
    return calendarComponent;
  }
</script>

<aside class="sidebar" data-testid="sidebar">
  <div class="sidebar-section calendar-section" data-testid="calendar">
    <header class="section-header">
      <h3>Calendar</h3>
    </header>
    <Calendar
      bind:this={calendarComponent}
      onselect={handleDateSelect}
      datesWithEntries={getDatesWithEntries()}
    />
  </div>

  <QuickLinks />
  <QuickFiles />

  <!-- Tabbed Files/Search section -->
  <div class="sidebar-section tabbed-section" data-testid="tabbed-section">
    <SidebarTabs />
  </div>

  <div class="sidebar-footer" data-testid="sidebar-footer">
    <button
      type="button"
      class="app-settings-button"
      onclick={openAppSettings}
      data-testid="open-app-settings"
    >
      <span aria-hidden="true">&#9881;</span>
      <span>App Settings</span>
    </button>
  </div>
</aside>

<AppSettingsModal visible={showAppSettings} onclose={closeAppSettings} />

<style>
  .sidebar {
    width: 280px;
    min-width: 200px;
    max-width: 400px;
    background: var(--sidebar-bg, #1e1e1e);
    border-right: 1px solid var(--border-color, #333);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  /* Mobile: full width sidebar */
  @media (max-width: 767px) {
    .sidebar {
      width: 100%;
      max-width: none;
      min-width: 0;
      border-right: none;
      height: 100%;
    }
  }

  .sidebar-section {
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-color, #333);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.5rem;
  }

  .section-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted, #888);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tabbed-section {
    flex: 1;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    /* Remove padding since tabs have their own */
    padding-top: 0;
  }

  .sidebar-footer {
    padding: 0.75rem;
    border-top: 1px solid var(--border-color, #333);
  }

  .app-settings-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color, #444);
    border-radius: 6px;
    background: var(--input-bg, #252525);
    color: var(--text-color, #fff);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .app-settings-button:hover {
    background: var(--hover-bg, #2e2e2e);
  }
</style>
