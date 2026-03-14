/**
 * GET /api/files/export
 * Download the current vault as a ZIP archive.
 */
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import type { RequestHandler } from './$types';
import {
  VaultNotConfiguredError,
  createErrorResponse,
  validateAndResolvePath,
} from '$lib/server/pathUtils';

async function addDirectoryToArchive(zip: JSZip, directoryPath: string, relativePath = ''): Promise<void> {
  if (relativePath) {
    zip.folder(relativePath);
  }

  const entries = await readdir(directoryPath, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      const archivePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await addDirectoryToArchive(zip, entryPath, archivePath);
        return;
      }

      if (entry.isFile()) {
        zip.file(archivePath, await readFile(entryPath));
      }
    })
  );
}

function getArchiveFilename(vaultPath: string): string {
  const vaultName = path.basename(vaultPath) || 'vault';
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return `${vaultName}-${date}.zip`;
}

export const GET: RequestHandler = async () => {
  try {
    const requestedPath = process.env.VAULT_PATH;
    if (!requestedPath) {
      throw new VaultNotConfiguredError();
    }

    const vaultPath = validateAndResolvePath(requestedPath);
    const zip = new JSZip();

    await addDirectoryToArchive(zip, vaultPath);

    const archive = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return new Response(Buffer.from(archive), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${getArchiveFilename(vaultPath)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return createErrorResponse(err);
  }
};
