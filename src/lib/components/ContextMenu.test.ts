import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import ContextMenu from './ContextMenu.svelte';
import type { MenuItem } from './ContextMenu.svelte';

describe('ContextMenu', () => {
  afterEach(() => {
    cleanup();
  });

  const mockItems: MenuItem[] = [
    { label: 'New File', action: vi.fn() },
    { label: 'New Folder', action: vi.fn() },
    { label: '', action: () => {}, separator: true },
    { label: 'Rename', action: vi.fn() },
    { label: 'Delete', action: vi.fn(), disabled: true },
  ];

  describe('visibility', () => {
    it('does not render when visible is false', () => {
      render(ContextMenu, { props: { visible: false, items: mockItems } });
      expect(screen.queryByTestId('context-menu')).toBeNull();
    });

    it('renders when visible is true', () => {
      render(ContextMenu, { props: { visible: true, items: mockItems } });
      expect(screen.getByTestId('context-menu')).toBeTruthy();
    });
  });

  describe('menu items', () => {
    it('renders all non-separator items as buttons', () => {
      render(ContextMenu, { props: { visible: true, items: mockItems } });

      expect(screen.getByText('New File')).toBeTruthy();
      expect(screen.getByText('New Folder')).toBeTruthy();
      expect(screen.getByText('Rename')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    it('renders separators', () => {
      render(ContextMenu, { props: { visible: true, items: mockItems } });
      expect(screen.getByTestId('menu-separator-2')).toBeTruthy();
    });

    it('marks disabled items', () => {
      render(ContextMenu, { props: { visible: true, items: mockItems } });
      const deleteItem = screen.getByText('Delete');
      expect(deleteItem.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('item clicks', () => {
    it('calls action when enabled item clicked', async () => {
      const action = vi.fn();
      const items: MenuItem[] = [{ label: 'Click Me', action }];
      const onclose = vi.fn();

      render(ContextMenu, { props: { visible: true, items, onclose } });

      await fireEvent.click(screen.getByText('Click Me'));

      expect(action).toHaveBeenCalledTimes(1);
      expect(onclose).toHaveBeenCalledTimes(1);
    });

    it('does not call action when disabled item clicked', async () => {
      const action = vi.fn();
      const items: MenuItem[] = [{ label: 'Disabled', action, disabled: true }];
      const onclose = vi.fn();

      render(ContextMenu, { props: { visible: true, items, onclose } });

      await fireEvent.click(screen.getByText('Disabled'));

      expect(action).not.toHaveBeenCalled();
      expect(onclose).not.toHaveBeenCalled();
    });
  });

  describe('close handlers', () => {
    it('calls onclose when Escape pressed', async () => {
      const onclose = vi.fn();
      render(ContextMenu, { props: { visible: true, items: mockItems, onclose } });

      await fireEvent.keyDown(window, { key: 'Escape' });

      expect(onclose).toHaveBeenCalledTimes(1);
    });

    it('does not call onclose on Escape when not visible', async () => {
      const onclose = vi.fn();
      render(ContextMenu, { props: { visible: false, items: mockItems, onclose } });

      await fireEvent.keyDown(window, { key: 'Escape' });

      expect(onclose).not.toHaveBeenCalled();
    });
  });

  describe('positioning', () => {
    it('renders at specified x,y position', () => {
      render(ContextMenu, { props: { visible: true, items: mockItems, x: 100, y: 200 } });

      const menu = screen.getByTestId('context-menu');
      expect(menu.style.left).toBe('100px');
      expect(menu.style.top).toBe('200px');
    });
  });

  describe('accessibility', () => {
    it('has role="menu"', () => {
      render(ContextMenu, { props: { visible: true, items: mockItems } });
      const menu = screen.getByTestId('context-menu');
      expect(menu.getAttribute('role')).toBe('menu');
    });

    it('menu items have role="menuitem"', () => {
      render(ContextMenu, { props: { visible: true, items: mockItems } });
      const item = screen.getByTestId('menu-item-0');
      expect(item.getAttribute('role')).toBe('menuitem');
    });

    it('separators have role="separator"', () => {
      render(ContextMenu, { props: { visible: true, items: mockItems } });
      const separator = screen.getByTestId('menu-separator-2');
      expect(separator.getAttribute('role')).toBe('separator');
    });
  });
});
