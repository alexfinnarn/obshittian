import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import Modal from './Modal.svelte';

describe('Modal', () => {
  afterEach(() => {
    cleanup();
  });

  describe('visibility', () => {
    it('does not render when visible is false', () => {
      render(Modal, { props: { visible: false, title: 'Test' } });
      expect(screen.queryByTestId('modal')).toBeNull();
    });

    it('renders when visible is true', () => {
      render(Modal, { props: { visible: true, title: 'Test' } });
      expect(screen.getByTestId('modal')).toBeTruthy();
    });

    it('displays the title', () => {
      render(Modal, { props: { visible: true, title: 'My Modal' } });
      expect(screen.getByText('My Modal')).toBeTruthy();
    });
  });

  describe('close handlers', () => {
    it('calls onclose when close button clicked', async () => {
      const onclose = vi.fn();
      render(Modal, { props: { visible: true, title: 'Test', onclose } });

      const closeBtn = screen.getByTestId('modal-close');
      await fireEvent.click(closeBtn);

      expect(onclose).toHaveBeenCalledTimes(1);
    });

    it('calls onclose when backdrop clicked', async () => {
      const onclose = vi.fn();
      render(Modal, { props: { visible: true, title: 'Test', onclose } });

      const backdrop = screen.getByTestId('modal-backdrop');
      await fireEvent.click(backdrop);

      expect(onclose).toHaveBeenCalledTimes(1);
    });

    it('does not call onclose when modal content clicked', async () => {
      const onclose = vi.fn();
      render(Modal, { props: { visible: true, title: 'Test', onclose } });

      const modal = screen.getByTestId('modal');
      await fireEvent.click(modal);

      expect(onclose).not.toHaveBeenCalled();
    });

    it('calls onclose when Escape key pressed', async () => {
      const onclose = vi.fn();
      render(Modal, { props: { visible: true, title: 'Test', onclose } });

      await fireEvent.keyDown(window, { key: 'Escape' });

      expect(onclose).toHaveBeenCalledTimes(1);
    });

    it('does not call onclose on Escape when not visible', async () => {
      const onclose = vi.fn();
      render(Modal, { props: { visible: false, title: 'Test', onclose } });

      await fireEvent.keyDown(window, { key: 'Escape' });

      expect(onclose).not.toHaveBeenCalled();
    });

    it('does not call onclose on other keys', async () => {
      const onclose = vi.fn();
      render(Modal, { props: { visible: true, title: 'Test', onclose } });

      await fireEvent.keyDown(window, { key: 'Enter' });

      expect(onclose).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has role="dialog"', () => {
      render(Modal, { props: { visible: true, title: 'Test' } });
      const backdrop = screen.getByTestId('modal-backdrop');
      expect(backdrop.getAttribute('role')).toBe('dialog');
    });

    it('has aria-modal="true"', () => {
      render(Modal, { props: { visible: true, title: 'Test' } });
      const backdrop = screen.getByTestId('modal-backdrop');
      expect(backdrop.getAttribute('aria-modal')).toBe('true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(Modal, { props: { visible: true, title: 'Test' } });
      const backdrop = screen.getByTestId('modal-backdrop');
      expect(backdrop.getAttribute('aria-labelledby')).toBe('modal-title');
    });

    it('close button has aria-label', () => {
      render(Modal, { props: { visible: true, title: 'Test' } });
      const closeBtn = screen.getByTestId('modal-close');
      expect(closeBtn.getAttribute('aria-label')).toBe('Close modal');
    });
  });
});
