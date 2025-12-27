import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import QuickLinks from './QuickLinks.svelte';
import { vaultConfig, resetVaultConfig } from '$lib/stores/vaultConfig.svelte';

// Mock setQuickLinks since it tries to write to filesystem
vi.mock('$lib/stores/vaultConfig.svelte', async () => {
  const actual = await vi.importActual('$lib/stores/vaultConfig.svelte');
  return {
    ...actual,
    setQuickLinks: vi.fn().mockResolvedValue(true),
  };
});

describe('QuickLinks', () => {
  beforeEach(() => {
    resetVaultConfig();
  });

  afterEach(() => {
    cleanup();
  });

  describe('display', () => {
    it('renders the section header', () => {
      render(QuickLinks);
      expect(screen.getByText('Quick Links')).toBeTruthy();
    });

    it('shows empty message when no links', () => {
      render(QuickLinks);
      expect(screen.getByText('No quick links configured')).toBeTruthy();
    });

    it('renders links from vaultConfig', () => {
      vaultConfig.quickLinks = [
        { name: 'Google', url: 'https://google.com' },
        { name: 'GitHub', url: 'https://github.com' },
      ];

      render(QuickLinks);

      expect(screen.getByText('Google')).toBeTruthy();
      expect(screen.getByText('GitHub')).toBeTruthy();
    });

    it('links have correct href and target', () => {
      vaultConfig.quickLinks = [{ name: 'Test', url: 'https://test.com' }];

      render(QuickLinks);

      const link = screen.getByTestId('quick-link-0');
      expect(link.getAttribute('href')).toBe('https://test.com');
      expect(link.getAttribute('target')).toBe('_blank');
    });
  });

  describe('configure modal', () => {
    it('shows configure button', () => {
      render(QuickLinks);
      expect(screen.getByTestId('configure-quick-links')).toBeTruthy();
    });

    it('opens modal when configure clicked', async () => {
      render(QuickLinks);

      await fireEvent.click(screen.getByTestId('configure-quick-links'));

      expect(screen.getByText('Configure Quick Links')).toBeTruthy();
    });

    it('populates modal with existing links', async () => {
      vaultConfig.quickLinks = [{ name: 'Test', url: 'https://test.com' }];

      render(QuickLinks);
      await fireEvent.click(screen.getByTestId('configure-quick-links'));

      const nameInput = screen.getByTestId('link-name-0') as HTMLInputElement;
      const urlInput = screen.getByTestId('link-url-0') as HTMLInputElement;

      expect(nameInput.value).toBe('Test');
      expect(urlInput.value).toBe('https://test.com');
    });

    // Note: Modal transition tests are complex in happy-dom environment
    // The cancel functionality is tested via the Modal component tests
    it.skip('closes modal on cancel', async () => {
      render(QuickLinks);

      await fireEvent.click(screen.getByTestId('configure-quick-links'));
      expect(screen.getByText('Configure Quick Links')).toBeTruthy();

      await fireEvent.click(screen.getByTestId('cancel-links'));
      await waitFor(() => {
        expect(screen.queryByTestId('modal')).toBeNull();
      });
    });
  });

  describe('editing links', () => {
    it('adds new link row', async () => {
      render(QuickLinks);

      await fireEvent.click(screen.getByTestId('configure-quick-links'));
      await fireEvent.click(screen.getByTestId('add-link'));

      expect(screen.getByTestId('link-row-0')).toBeTruthy();
    });

    it('removes link row', async () => {
      vaultConfig.quickLinks = [{ name: 'Test', url: 'https://test.com' }];

      render(QuickLinks);
      await fireEvent.click(screen.getByTestId('configure-quick-links'));

      expect(screen.getByTestId('link-row-0')).toBeTruthy();

      await fireEvent.click(screen.getByTestId('link-delete-0'));

      expect(screen.queryByTestId('link-row-0')).toBeNull();
    });

    it('updates link name', async () => {
      render(QuickLinks);

      await fireEvent.click(screen.getByTestId('configure-quick-links'));
      await fireEvent.click(screen.getByTestId('add-link'));

      const nameInput = screen.getByTestId('link-name-0') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'New Name' } });

      expect(nameInput.value).toBe('New Name');
    });

    it('updates link url', async () => {
      render(QuickLinks);

      await fireEvent.click(screen.getByTestId('configure-quick-links'));
      await fireEvent.click(screen.getByTestId('add-link'));

      const urlInput = screen.getByTestId('link-url-0') as HTMLInputElement;
      await fireEvent.input(urlInput, { target: { value: 'https://new-url.com' } });

      expect(urlInput.value).toBe('https://new-url.com');
    });
  });

  describe('saving', () => {
    it('calls setQuickLinks on save', async () => {
      const { setQuickLinks } = await import('$lib/stores/vaultConfig.svelte');

      render(QuickLinks);

      await fireEvent.click(screen.getByTestId('configure-quick-links'));
      await fireEvent.click(screen.getByTestId('add-link'));

      const nameInput = screen.getByTestId('link-name-0') as HTMLInputElement;
      const urlInput = screen.getByTestId('link-url-0') as HTMLInputElement;

      await fireEvent.input(nameInput, { target: { value: 'New Link' } });
      await fireEvent.input(urlInput, { target: { value: 'https://new.com' } });

      await fireEvent.click(screen.getByTestId('save-links'));

      expect(setQuickLinks).toHaveBeenCalledWith([
        { name: 'New Link', url: 'https://new.com' },
      ]);
    });

    // Note: Modal transition tests are complex in happy-dom environment
    it.skip('closes modal after save', async () => {
      render(QuickLinks);

      await fireEvent.click(screen.getByTestId('configure-quick-links'));
      await fireEvent.click(screen.getByTestId('save-links'));

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).toBeNull();
      });
    });
  });
});
