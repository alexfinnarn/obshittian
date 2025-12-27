import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import Sidebar from './Sidebar.svelte';
import { resetVaultConfig } from '$lib/stores/vaultConfig.svelte';

// Mock setQuickLinks and setQuickFiles since they try to write to filesystem
vi.mock('$lib/stores/vaultConfig.svelte', async () => {
  const actual = await vi.importActual('$lib/stores/vaultConfig.svelte');
  return {
    ...actual,
    setQuickLinks: vi.fn().mockResolvedValue(true),
    setQuickFiles: vi.fn().mockResolvedValue(true),
  };
});

// Mock Pikaday for Calendar component
vi.mock('pikaday', () => {
  class MockPikaday {
    el: HTMLElement;
    constructor() {
      this.el = document.createElement('div');
      this.el.className = 'pika-single';
      this.el.setAttribute('data-testid', 'pikaday-el');
    }
    destroy() {}
    getDate() { return new Date(); }
    setDate() {}
  }
  return { default: MockPikaday };
});

// Mock Pikaday CSS
vi.mock('pikaday/css/pikaday.css', () => ({}));

describe('Sidebar', () => {
  beforeEach(() => {
    resetVaultConfig();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders sidebar container', () => {
    render(Sidebar);
    expect(screen.getByTestId('sidebar')).toBeTruthy();
  });

  it('has calendar section with Calendar component', () => {
    render(Sidebar);
    expect(screen.getByTestId('calendar')).toBeTruthy();
    expect(screen.getByText('Calendar')).toBeTruthy();
    // Calendar component renders Pikaday widget
    expect(screen.getByTestId('calendar-widget')).toBeTruthy();
  });

  it('has tabbed section with Files and Search tabs', () => {
    render(Sidebar);
    expect(screen.getByTestId('tabbed-section')).toBeTruthy();
    expect(screen.getByTestId('files-tab-button')).toBeTruthy();
    expect(screen.getByTestId('search-tab-button')).toBeTruthy();
    // Files tab is active by default, showing FileTree
    expect(screen.getByTestId('file-tree-content')).toBeTruthy();
  });

  it('renders QuickLinks section', () => {
    render(Sidebar);
    expect(screen.getByTestId('quick-links-section')).toBeTruthy();
    expect(screen.getByText('Quick Links')).toBeTruthy();
  });

  it('renders QuickFiles section', () => {
    render(Sidebar);
    expect(screen.getByTestId('quick-files-section')).toBeTruthy();
    expect(screen.getByText('Quick Files')).toBeTruthy();
  });
});
