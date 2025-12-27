import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import FilenameModal from './FilenameModal.svelte';

describe('FilenameModal', () => {
  afterEach(() => {
    cleanup();
  });

  describe('visibility', () => {
    it('does not render when visible is false', () => {
      render(FilenameModal, { props: { visible: false, title: 'Test' } });
      expect(screen.queryByTestId('modal')).toBeNull();
    });

    it('renders when visible is true', () => {
      render(FilenameModal, { props: { visible: true, title: 'New File' } });
      expect(screen.getByTestId('modal')).toBeTruthy();
    });

    it('displays the title', () => {
      render(FilenameModal, { props: { visible: true, title: 'Rename File' } });
      expect(screen.getByText('Rename File')).toBeTruthy();
    });
  });

  describe('input behavior', () => {
    it('shows input field', () => {
      render(FilenameModal, { props: { visible: true, title: 'Test' } });
      expect(screen.getByTestId('filename-input')).toBeTruthy();
    });

    it('uses placeholder when provided', () => {
      render(FilenameModal, {
        props: { visible: true, title: 'Test', placeholder: 'Enter filename' },
      });
      const input = screen.getByTestId('filename-input') as HTMLInputElement;
      expect(input.placeholder).toBe('Enter filename');
    });

    it('populates input with default value when opened', async () => {
      render(FilenameModal, {
        props: { visible: true, title: 'Test', defaultValue: 'notes.md' },
      });

      // Wait for effect to run
      await new Promise((r) => setTimeout(r, 0));

      const input = screen.getByTestId('filename-input') as HTMLInputElement;
      expect(input.value).toBe('notes.md');
    });
  });

  describe('button actions', () => {
    it('calls onconfirm with trimmed value when confirm clicked', async () => {
      const onconfirm = vi.fn();
      render(FilenameModal, {
        props: { visible: true, title: 'Test', defaultValue: 'test.md', onconfirm },
      });

      // Wait for default value to populate
      await new Promise((r) => setTimeout(r, 0));

      const confirmBtn = screen.getByTestId('filename-confirm');
      await fireEvent.click(confirmBtn);

      expect(onconfirm).toHaveBeenCalledWith('test.md');
    });

    it('does not call onconfirm with empty value', async () => {
      const onconfirm = vi.fn();
      render(FilenameModal, {
        props: { visible: true, title: 'Test', defaultValue: '', onconfirm },
      });

      const confirmBtn = screen.getByTestId('filename-confirm');
      await fireEvent.click(confirmBtn);

      expect(onconfirm).not.toHaveBeenCalled();
    });

    it('calls oncancel when cancel clicked', async () => {
      const oncancel = vi.fn();
      render(FilenameModal, {
        props: { visible: true, title: 'Test', oncancel },
      });

      const cancelBtn = screen.getByTestId('filename-cancel');
      await fireEvent.click(cancelBtn);

      expect(oncancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard handling', () => {
    it('calls onconfirm when Enter pressed in input', async () => {
      const onconfirm = vi.fn();
      render(FilenameModal, {
        props: { visible: true, title: 'Test', defaultValue: 'file.md', onconfirm },
      });

      // Wait for default value to populate
      await new Promise((r) => setTimeout(r, 0));

      const input = screen.getByTestId('filename-input');
      await fireEvent.keyDown(input, { key: 'Enter' });

      expect(onconfirm).toHaveBeenCalledWith('file.md');
    });

    it('calls oncancel when Escape pressed (via Modal)', async () => {
      const oncancel = vi.fn();
      render(FilenameModal, {
        props: { visible: true, title: 'Test', oncancel },
      });

      await fireEvent.keyDown(window, { key: 'Escape' });

      expect(oncancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirm button state', () => {
    it('disables confirm button when input is empty', async () => {
      render(FilenameModal, {
        props: { visible: true, title: 'Test', defaultValue: '' },
      });

      const confirmBtn = screen.getByTestId('filename-confirm') as HTMLButtonElement;
      expect(confirmBtn.disabled).toBe(true);
    });

    it('disables confirm button when input is only whitespace', async () => {
      render(FilenameModal, {
        props: { visible: true, title: 'Test', defaultValue: '   ' },
      });

      // Wait for default value to populate
      await new Promise((r) => setTimeout(r, 0));

      const confirmBtn = screen.getByTestId('filename-confirm') as HTMLButtonElement;
      expect(confirmBtn.disabled).toBe(true);
    });

    it('enables confirm button when input has value', async () => {
      render(FilenameModal, {
        props: { visible: true, title: 'Test', defaultValue: 'file.md' },
      });

      // Wait for default value to populate
      await new Promise((r) => setTimeout(r, 0));

      const confirmBtn = screen.getByTestId('filename-confirm') as HTMLButtonElement;
      expect(confirmBtn.disabled).toBe(false);
    });
  });
});
