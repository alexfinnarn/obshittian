import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shortcut, type ShortcutOptions } from './shortcut';
import type { ActionReturn } from 'svelte/action';
import { clearAllBlocks, blockShortcuts } from '$lib/stores/shortcuts.svelte';
import { setFocusedPane, resetEditorState } from '$lib/stores/editor.svelte';

// Helper type for action return that we know has destroy/update
type ActionResult = NonNullable<ActionReturn<ShortcutOptions>>;

// Helper to create keyboard event with modifiers
function createKeyEvent(
  key: string,
  modifiers: { meta?: boolean; ctrl?: boolean; alt?: boolean; shift?: boolean } = {}
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    metaKey: modifiers.meta ?? false,
    ctrlKey: modifiers.ctrl ?? false,
    altKey: modifiers.alt ?? false,
    shiftKey: modifiers.shift ?? false,
    bubbles: true,
  });
}

describe('shortcut action', () => {
  let container: HTMLDivElement;
  let targetElement: HTMLDivElement;
  let handler: () => void;

  beforeEach(() => {
    // Set up DOM structure
    container = document.createElement('div');
    targetElement = document.createElement('div');
    targetElement.setAttribute('data-testid', 'target');
    container.appendChild(targetElement);
    document.body.appendChild(container);

    handler = vi.fn();

    // Reset stores
    clearAllBlocks();
    resetEditorState();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('basic functionality', () => {
    it('fires handler when key binding matches', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
      }) as ActionResult;

      // Cmd+S (save shortcut)
      window.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).toHaveBeenCalledTimes(1);

      action.destroy?.();
    });

    it('does not fire when key does not match', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
      }) as ActionResult;

      // Wrong key
      window.dispatchEvent(createKeyEvent('x', { meta: true }));

      expect(handler).not.toHaveBeenCalled();

      action.destroy?.();
    });

    it('does not fire when modifiers do not match', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
      }) as ActionResult;

      // Right key, wrong modifier
      window.dispatchEvent(createKeyEvent('s', { alt: true }));

      expect(handler).not.toHaveBeenCalled();

      action.destroy?.();
    });

    it('prevents default when handler fires', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
      }) as ActionResult;

      const event = createKeyEvent('s', { meta: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();

      action.destroy?.();
    });
  });

  describe('blocking', () => {
    it('does not fire when shortcuts are blocked', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
      }) as ActionResult;

      blockShortcuts('modal');

      window.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).not.toHaveBeenCalled();

      action.destroy?.();
    });

    it('fires after unblocking', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
      }) as ActionResult;

      const unblock = blockShortcuts('modal');
      unblock();

      window.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).toHaveBeenCalledTimes(1);

      action.destroy?.();
    });

    it('fires when ignoreBlocking is true', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
        ignoreBlocking: true,
      }) as ActionResult;

      blockShortcuts('modal');

      window.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).toHaveBeenCalledTimes(1);

      action.destroy?.();
    });
  });

  describe('focusedPane condition', () => {
    it('fires when focusedPane matches', () => {
      const action = shortcut(targetElement, {
        binding: 'prevDay',
        handler,
        when: { focusedPane: 'right' },
      }) as ActionResult;

      setFocusedPane('right');

      window.dispatchEvent(createKeyEvent('ArrowLeft', { meta: true }));

      expect(handler).toHaveBeenCalledTimes(1);

      action.destroy?.();
    });

    it('does not fire when focusedPane does not match', () => {
      const action = shortcut(targetElement, {
        binding: 'prevDay',
        handler,
        when: { focusedPane: 'right' },
      }) as ActionResult;

      setFocusedPane('left');

      window.dispatchEvent(createKeyEvent('ArrowLeft', { meta: true }));

      expect(handler).not.toHaveBeenCalled();

      action.destroy?.();
    });

    it('does not fire when no pane is focused', () => {
      const action = shortcut(targetElement, {
        binding: 'prevDay',
        handler,
        when: { focusedPane: 'right' },
      }) as ActionResult;

      setFocusedPane(null);

      window.dispatchEvent(createKeyEvent('ArrowLeft', { meta: true }));

      expect(handler).not.toHaveBeenCalled();

      action.destroy?.();
    });
  });

  describe('custom check condition', () => {
    it('fires when check returns true', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
        when: { check: () => true },
      }) as ActionResult;

      window.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).toHaveBeenCalledTimes(1);

      action.destroy?.();
    });

    it('does not fire when check returns false', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
        when: { check: () => false },
      }) as ActionResult;

      window.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).not.toHaveBeenCalled();

      action.destroy?.();
    });
  });

  describe('scope', () => {
    it('attaches to window by default (global scope)', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
      }) as ActionResult;

      // Fire on window
      window.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).toHaveBeenCalledTimes(1);

      action.destroy?.();
    });

    it('attaches to element when scope is element', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
        scope: 'element',
      }) as ActionResult;

      // Fire on element
      targetElement.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).toHaveBeenCalledTimes(1);

      action.destroy?.();
    });

    it('does not fire on window when scope is element', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
        scope: 'element',
      }) as ActionResult;

      // Fire on window - should not trigger
      window.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).not.toHaveBeenCalled();

      action.destroy?.();
    });
  });

  describe('update', () => {
    it('updates handler', () => {
      const handler2 = vi.fn();

      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
      }) as ActionResult;

      action.update?.({
        binding: 'save',
        handler: handler2,
      });

      window.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);

      action.destroy?.();
    });

    it('handles scope change on update', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
        scope: 'global',
      }) as ActionResult;

      // Switch to element scope
      action.update?.({
        binding: 'save',
        handler,
        scope: 'element',
      });

      // Window should no longer trigger
      window.dispatchEvent(createKeyEvent('s', { meta: true }));
      expect(handler).not.toHaveBeenCalled();

      // Element should trigger
      targetElement.dispatchEvent(createKeyEvent('s', { meta: true }));
      expect(handler).toHaveBeenCalledTimes(1);

      action.destroy?.();
    });
  });

  describe('destroy', () => {
    it('stops listening after destroy', () => {
      const action = shortcut(targetElement, {
        binding: 'save',
        handler,
      }) as ActionResult;

      action.destroy?.();

      window.dispatchEvent(createKeyEvent('s', { meta: true }));

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
