/**
 * Shortcut Action - Svelte action for declarative keyboard shortcuts
 *
 * Usage:
 * <div use:shortcut={{ binding: 'save', handler: handleSave }}>...</div>
 * <div use:shortcut={{
 *   binding: 'prevDay',
 *   handler: navigatePrev,
 *   when: { focusedPane: 'right' }
 * }}>...</div>
 */

import type { Action } from 'svelte/action';
import type { KeyboardShortcuts } from '$lib/config';
import { matchesKeyBinding } from '$lib/config';
import { getShortcut } from '$lib/stores/settings.svelte';
import { getFocusedPane } from '$lib/stores/editor.svelte';
import { areShortcutsBlocked } from '$lib/stores/shortcuts.svelte';

export type ShortcutName = keyof KeyboardShortcuts;

export interface ShortcutCondition {
  /** Shortcut only fires when this pane is focused */
  focusedPane?: 'left' | 'right';
  /** Custom condition function - shortcut only fires if this returns true */
  check?: () => boolean;
}

export interface ShortcutOptions {
  /** Shortcut name from config (e.g., 'save', 'toggleView') */
  binding: ShortcutName;
  /** Handler function called when shortcut fires */
  handler: (event: KeyboardEvent) => void | Promise<void>;
  /** Conditions that must be met for shortcut to fire */
  when?: ShortcutCondition;
  /** If true, shortcut still fires when shortcuts are blocked (rare) */
  ignoreBlocking?: boolean;
  /** Scope: 'global' attaches to window, 'element' attaches to node. Default: 'global' */
  scope?: 'global' | 'element';
}

/**
 * Svelte action for declarative keyboard shortcuts
 *
 * Provides:
 * - Automatic blocking when modals are open
 * - Focus-dependent shortcuts via `when.focusedPane`
 * - Custom conditions via `when.check`
 * - Automatic cleanup on unmount
 */
export const shortcut: Action<HTMLElement, ShortcutOptions> = (
  node: HTMLElement,
  options: ShortcutOptions
) => {
  let currentOptions = options;

  const handleKeydown = (event: KeyboardEvent) => {
    // 1. Check if shortcuts are blocked (modals, etc.)
    if (!currentOptions.ignoreBlocking && areShortcutsBlocked()) {
      return;
    }

    // 2. Get binding from settings and check if event matches
    const binding = getShortcut(currentOptions.binding);
    if (!matchesKeyBinding(event, binding)) {
      return;
    }

    // 3. Check conditions
    if (currentOptions.when) {
      // Check focusedPane condition
      if (currentOptions.when.focusedPane !== undefined) {
        if (getFocusedPane() !== currentOptions.when.focusedPane) {
          return;
        }
      }
      // Check custom condition
      if (currentOptions.when.check && !currentOptions.when.check()) {
        return;
      }
    }

    // 4. Fire handler
    event.preventDefault();
    currentOptions.handler(event);
  };

  // Attach to window for global shortcuts, element for scoped
  const target: EventTarget =
    currentOptions.scope === 'element' ? node : window;
  target.addEventListener('keydown', handleKeydown as EventListener);

  return {
    update(newOptions: ShortcutOptions) {
      // If scope changed, we need to reattach
      const oldScope = currentOptions.scope ?? 'global';
      const newScope = newOptions.scope ?? 'global';

      if (oldScope !== newScope) {
        const oldTarget: EventTarget = oldScope === 'element' ? node : window;
        oldTarget.removeEventListener('keydown', handleKeydown as EventListener);

        const newTarget: EventTarget = newScope === 'element' ? node : window;
        newTarget.addEventListener('keydown', handleKeydown as EventListener);
      }

      currentOptions = newOptions;
    },
    destroy() {
      const target: EventTarget =
        currentOptions.scope === 'element' ? node : window;
      target.removeEventListener('keydown', handleKeydown as EventListener);
    },
  };
};

export default shortcut;
