import { describe, it, expect, beforeEach } from 'vitest';
import { vault, getIsVaultOpen, openVault, closeVault, updateVaultConfig } from './vault.svelte';

describe('vault store', () => {
  beforeEach(() => {
    // Reset vault state before each test
    closeVault();
    vault.dailyNotesFolder = 'zzz_Daily Notes';
    vault.syncDirectory = 'zzzz_exports';
  });

  describe('initial state', () => {
    it('starts with null rootDirHandle', () => {
      expect(vault.rootDirHandle).toBeNull();
    });

    it('has default dailyNotesFolder', () => {
      expect(vault.dailyNotesFolder).toBe('zzz_Daily Notes');
    });

    it('has default syncDirectory', () => {
      expect(vault.syncDirectory).toBe('zzzz_exports');
    });

    it('getIsVaultOpen() returns false initially', () => {
      expect(getIsVaultOpen()).toBe(false);
    });
  });

  describe('openVault', () => {
    it('sets rootDirHandle', () => {
      const mockHandle = { name: 'test-vault' } as FileSystemDirectoryHandle;
      openVault(mockHandle);
      // Use toEqual for deep equality since $state returns a proxy
      expect(vault.rootDirHandle).toEqual(mockHandle);
    });

    it('makes getIsVaultOpen() return true', () => {
      const mockHandle = { name: 'test-vault' } as FileSystemDirectoryHandle;
      openVault(mockHandle);
      expect(getIsVaultOpen()).toBe(true);
    });
  });

  describe('closeVault', () => {
    it('clears rootDirHandle', () => {
      const mockHandle = { name: 'test-vault' } as FileSystemDirectoryHandle;
      openVault(mockHandle);
      closeVault();
      expect(vault.rootDirHandle).toBeNull();
    });

    it('makes getIsVaultOpen() return false', () => {
      const mockHandle = { name: 'test-vault' } as FileSystemDirectoryHandle;
      openVault(mockHandle);
      closeVault();
      expect(getIsVaultOpen()).toBe(false);
    });
  });

  describe('updateVaultConfig', () => {
    it('updates dailyNotesFolder', () => {
      updateVaultConfig({ dailyNotesFolder: 'Daily' });
      expect(vault.dailyNotesFolder).toBe('Daily');
    });

    it('updates syncDirectory', () => {
      updateVaultConfig({ syncDirectory: 'exports' });
      expect(vault.syncDirectory).toBe('exports');
    });

    it('updates multiple properties at once', () => {
      updateVaultConfig({ dailyNotesFolder: 'Notes', syncDirectory: 'sync' });
      expect(vault.dailyNotesFolder).toBe('Notes');
      expect(vault.syncDirectory).toBe('sync');
    });

    it('does not affect unspecified properties', () => {
      updateVaultConfig({ dailyNotesFolder: 'Daily' });
      expect(vault.syncDirectory).toBe('zzzz_exports');
    });
  });
});
