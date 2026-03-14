import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import JSZip from 'jszip';
import { GET } from './+server';

describe('GET /api/files/export', () => {
  const originalVaultPath = process.env.VAULT_PATH;
  let tempVaultPath: string | null = null;

  beforeEach(async () => {
    tempVaultPath = await mkdtemp(path.join(os.tmpdir(), 'editor-export-'));
  });

  afterEach(async () => {
    if (tempVaultPath) {
      await rm(tempVaultPath, { recursive: true, force: true });
    }

    if (originalVaultPath === undefined) {
      delete process.env.VAULT_PATH;
    } else {
      process.env.VAULT_PATH = originalVaultPath;
    }
  });

  it('returns 503 when no vault is configured', async () => {
    delete process.env.VAULT_PATH;

    const response = await GET({} as never);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.code).toBe('VAULT_NOT_CONFIGURED');
  });

  it('returns a zip archive with nested, hidden, and empty-directory entries', async () => {
    if (!tempVaultPath) {
      throw new Error('Temporary vault path was not created');
    }

    await mkdir(path.join(tempVaultPath, 'docs', 'nested'), { recursive: true });
    await mkdir(path.join(tempVaultPath, 'empty-dir'), { recursive: true });
    await writeFile(path.join(tempVaultPath, 'README.md'), '# Root');
    await writeFile(path.join(tempVaultPath, '.secret'), 'hidden');
    await writeFile(path.join(tempVaultPath, 'docs', 'guide.md'), '# Guide');
    await writeFile(path.join(tempVaultPath, 'docs', 'nested', 'api.md'), '# API');

    process.env.VAULT_PATH = tempVaultPath;

    const response = await GET({} as never);
    const archiveBuffer = await response.arrayBuffer();
    const archive = await JSZip.loadAsync(archiveBuffer);
    const entryNames = Object.keys(archive.files).sort();
    const expectedFilenamePrefix = path.basename(tempVaultPath);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/zip');
    expect(response.headers.get('Content-Disposition')).toContain(
      `attachment; filename="${expectedFilenamePrefix}-`
    );
    expect(entryNames).toEqual([
      '.secret',
      'README.md',
      'docs/',
      'docs/guide.md',
      'docs/nested/',
      'docs/nested/api.md',
      'empty-dir/',
    ]);
    expect(await archive.file('README.md')?.async('string')).toBe('# Root');
    expect(await archive.file('.secret')?.async('string')).toBe('hidden');
    expect(await archive.file('docs/nested/api.md')?.async('string')).toBe('# API');
  });
});
