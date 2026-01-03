import { describe, it, expect, beforeEach } from 'vitest';
import { vault, getIsVaultOpen, openVault, closeVault, updateVaultConfig } from './vault.svelte';

describe('vault store', () => {
  beforeEach(() => {
    // Reset vault state before each test
    closeVault();
    vault.dailyNotesFolder = 'zzz_Daily Notes';
  });

  describe('initial state', () => {
    it('starts with null path', () => {
      expect(vault.path).toBeNull();
    });

    it('has default dailyNotesFolder', () => {
      expect(vault.dailyNotesFolder).toBe('zzz_Daily Notes');
    });

    it('getIsVaultOpen() returns false initially', () => {
      expect(getIsVaultOpen()).toBe(false);
    });
  });

  describe('openVault', () => {
    it('sets path', () => {
      openVault('/path/to/vault');
      expect(vault.path).toBe('/path/to/vault');
    });

    it('makes getIsVaultOpen() return true', () => {
      openVault('/path/to/vault');
      expect(getIsVaultOpen()).toBe(true);
    });
  });

  describe('closeVault', () => {
    it('clears path', () => {
      openVault('/path/to/vault');
      closeVault();
      expect(vault.path).toBeNull();
    });

    it('makes getIsVaultOpen() return false', () => {
      openVault('/path/to/vault');
      closeVault();
      expect(getIsVaultOpen()).toBe(false);
    });
  });

  describe('updateVaultConfig', () => {
    it('updates dailyNotesFolder', () => {
      updateVaultConfig({ dailyNotesFolder: 'Daily' });
      expect(vault.dailyNotesFolder).toBe('Daily');
    });
  });
});
