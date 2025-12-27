import { describe, it, expect, beforeEach } from 'vitest';
import { settings, updateSettings, resetSettings, loadSettings, saveSettings } from './settings.svelte';

describe('settings store', () => {
  beforeEach(() => {
    // Reset settings and clear localStorage before each test
    localStorage.clear();
    resetSettings();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      expect(settings.autoOpenLastDirectory).toBe(true);
      expect(settings.autoOpenTodayNote).toBe(true);
      expect(settings.restoreLastOpenFile).toBe(true);
      expect(settings.restorePaneWidth).toBe(true);
      expect(settings.syncTempLimit).toBe(7);
      expect(settings.quickFilesLimit).toBe(5);
    });
  });

  describe('updateSettings', () => {
    it('updates single setting', () => {
      updateSettings({ autoOpenTodayNote: false });
      expect(settings.autoOpenTodayNote).toBe(false);
    });

    it('updates multiple settings at once', () => {
      updateSettings({ syncTempLimit: 14, quickFilesLimit: 10 });
      expect(settings.syncTempLimit).toBe(14);
      expect(settings.quickFilesLimit).toBe(10);
    });

    it('does not affect unspecified settings', () => {
      updateSettings({ autoOpenTodayNote: false });
      expect(settings.autoOpenLastDirectory).toBe(true);
      expect(settings.restoreLastOpenFile).toBe(true);
    });
  });

  describe('resetSettings', () => {
    it('resets all settings to defaults', () => {
      updateSettings({
        autoOpenTodayNote: false,
        syncTempLimit: 100,
        quickFilesLimit: 20,
      });
      resetSettings();
      expect(settings.autoOpenTodayNote).toBe(true);
      expect(settings.syncTempLimit).toBe(7);
      expect(settings.quickFilesLimit).toBe(5);
    });
  });

  describe('saveSettings / loadSettings', () => {
    it('saves settings to localStorage', () => {
      updateSettings({ syncTempLimit: 14 });
      saveSettings();
      const stored = localStorage.getItem('editorSettings');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.syncTempLimit).toBe(14);
    });

    it('loads settings from localStorage', () => {
      localStorage.setItem(
        'editorSettings',
        JSON.stringify({ autoOpenTodayNote: false, quickFilesLimit: 15 })
      );
      loadSettings();
      expect(settings.autoOpenTodayNote).toBe(false);
      expect(settings.quickFilesLimit).toBe(15);
    });

    it('handles missing localStorage gracefully', () => {
      loadSettings();
      // Should not throw, settings remain at defaults
      expect(settings.autoOpenTodayNote).toBe(true);
    });

    it('handles invalid JSON gracefully', () => {
      localStorage.setItem('editorSettings', 'not valid json');
      loadSettings();
      // Should not throw, settings remain at defaults
      expect(settings.autoOpenTodayNote).toBe(true);
    });
  });
});
