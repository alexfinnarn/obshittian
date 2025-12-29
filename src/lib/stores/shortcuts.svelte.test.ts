/**
 * Tests for shortcuts.svelte.ts store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  shortcutsStore,
  blockShortcuts,
  areShortcutsBlocked,
  getBlockingReasons,
  clearAllBlocks,
} from './shortcuts.svelte';

describe('shortcuts store', () => {
  beforeEach(() => {
    clearAllBlocks();
  });

  describe('initial state', () => {
    it('should have no blocking reasons', () => {
      expect(shortcutsStore.blockedBy.length).toBe(0);
    });

    it('should not be blocked', () => {
      expect(areShortcutsBlocked()).toBe(false);
    });
  });

  describe('blockShortcuts', () => {
    it('should block shortcuts when called', () => {
      blockShortcuts('modal');
      expect(areShortcutsBlocked()).toBe(true);
    });

    it('should track blocking reason', () => {
      blockShortcuts('modal');
      expect(getBlockingReasons()).toContain('modal');
    });

    it('should support multiple blocking reasons', () => {
      blockShortcuts('modal');
      blockShortcuts('input-focus');
      expect(getBlockingReasons()).toHaveLength(2);
      expect(getBlockingReasons()).toContain('modal');
      expect(getBlockingReasons()).toContain('input-focus');
    });

    it('should return unblock function', () => {
      const unblock = blockShortcuts('modal');
      expect(typeof unblock).toBe('function');
    });
  });

  describe('unblock function', () => {
    it('should unblock shortcuts when called', () => {
      const unblock = blockShortcuts('modal');
      expect(areShortcutsBlocked()).toBe(true);

      unblock();
      expect(areShortcutsBlocked()).toBe(false);
    });

    it('should only remove its own blocking reason', () => {
      const unblockModal = blockShortcuts('modal');
      blockShortcuts('input-focus');

      unblockModal();

      expect(areShortcutsBlocked()).toBe(true);
      expect(getBlockingReasons()).not.toContain('modal');
      expect(getBlockingReasons()).toContain('input-focus');
    });

    it('should be safe to call multiple times', () => {
      const unblock = blockShortcuts('modal');
      unblock();
      unblock(); // Should not throw
      expect(areShortcutsBlocked()).toBe(false);
    });
  });

  describe('areShortcutsBlocked', () => {
    it('should return false when no blockers', () => {
      expect(areShortcutsBlocked()).toBe(false);
    });

    it('should return true when any blocker exists', () => {
      blockShortcuts('test');
      expect(areShortcutsBlocked()).toBe(true);
    });

    it('should return false after all blockers removed', () => {
      const unblock1 = blockShortcuts('reason1');
      const unblock2 = blockShortcuts('reason2');

      unblock1();
      expect(areShortcutsBlocked()).toBe(true);

      unblock2();
      expect(areShortcutsBlocked()).toBe(false);
    });
  });

  describe('getBlockingReasons', () => {
    it('should return empty array when no blockers', () => {
      expect(getBlockingReasons()).toEqual([]);
    });

    it('should return all blocking reasons', () => {
      blockShortcuts('modal');
      blockShortcuts('dropdown');

      const reasons = getBlockingReasons();
      expect(reasons).toHaveLength(2);
      expect(reasons).toContain('modal');
      expect(reasons).toContain('dropdown');
    });
  });

  describe('clearAllBlocks', () => {
    it('should remove all blocking reasons', () => {
      blockShortcuts('modal');
      blockShortcuts('input');
      blockShortcuts('dropdown');

      clearAllBlocks();

      expect(areShortcutsBlocked()).toBe(false);
      expect(getBlockingReasons()).toEqual([]);
    });
  });
});
