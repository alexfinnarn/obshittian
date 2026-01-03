<script lang="ts">
  import QuickLinks from './QuickLinks.svelte';
  import QuickFiles from './QuickFiles.svelte';
  import SidebarTabs from './SidebarTabs.svelte';
  import Calendar from './Calendar.svelte';
  import { getDatesWithEntries } from '$lib/stores/journal.svelte';

  interface Props {
    /** Callback when a date is selected in the calendar */
    ondateselect?: (date: Date) => void;
  }

  let { ondateselect }: Props = $props();

  // Calendar component reference
  let calendarComponent: Calendar | null = $state(null);

  function handleDateSelect(date: Date) {
    ondateselect?.(date);
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
</aside>

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
</style>
