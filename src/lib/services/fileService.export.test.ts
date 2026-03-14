import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fileService, FileServiceError } from './fileService';

describe('fileService exportVault', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fileService.setVaultPath('/vault');
  });

  it('fetches the export endpoint and returns the archive blob and filename', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['archive-data']), {
        status: 200,
        headers: {
          'Content-Disposition': 'attachment; filename="notes-2026-03-14.zip"',
        },
      })
    );

    const result = await fileService.exportVault();

    expect(fetchSpy).toHaveBeenCalledWith('/api/files/export', {
      method: 'GET',
    });
    expect(result.filename).toBe('notes-2026-03-14.zip');
    expect(await result.blob.text()).toBe('archive-data');
  });

  it('throws a FileServiceError when export fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Export failed', code: 'EXPORT_FAILED' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    try {
      await fileService.exportVault();
      throw new Error('Expected exportVault to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(FileServiceError);
      expect(err).toMatchObject({
        status: 500,
        code: 'EXPORT_FAILED',
      });
    }
  });

  it('throws before fetching when the vault path is not configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fileService.setVaultPath('');

    await expect(fileService.exportVault()).rejects.toMatchObject({
      status: 400,
      code: 'VAULT_NOT_SET',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
