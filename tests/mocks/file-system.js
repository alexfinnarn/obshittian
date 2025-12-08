// Mock File System Access API for testing

/**
 * Creates a mock file with the given name and content
 */
export function createMockFile(name, content = '') {
  return {
    name,
    text: async () => content,
    arrayBuffer: async () => new TextEncoder().encode(content).buffer
  };
}

/**
 * Creates a mock writable stream
 */
export function createMockWritable() {
  const chunks = [];
  return {
    write: async (data) => chunks.push(data),
    close: async () => {},
    getWrittenContent: () => chunks.join('')
  };
}

/**
 * Creates a mock file handle
 */
export function createMockFileHandle(name, content = '') {
  const file = createMockFile(name, content);
  let currentContent = content;

  return {
    kind: 'file',
    name,
    getFile: async () => createMockFile(name, currentContent),
    createWritable: async () => {
      const writable = createMockWritable();
      const originalClose = writable.close;
      writable.close = async () => {
        currentContent = writable.getWrittenContent();
        return originalClose();
      };
      return writable;
    },
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted'
  };
}

/**
 * Creates a mock directory handle with files and subdirectories
 */
export function createMockDirectoryHandle(name, entries = {}) {
  const files = new Map();
  const directories = new Map();

  // Initialize entries
  for (const [entryName, entry] of Object.entries(entries)) {
    if (entry.kind === 'file') {
      files.set(entryName, entry);
    } else if (entry.kind === 'directory') {
      directories.set(entryName, entry);
    }
  }

  const handle = {
    kind: 'directory',
    name,

    async getFileHandle(fileName, options = {}) {
      if (files.has(fileName)) {
        return files.get(fileName);
      }
      if (options.create) {
        const newFile = createMockFileHandle(fileName, '');
        files.set(fileName, newFile);
        return newFile;
      }
      throw new Error(`File not found: ${fileName}`);
    },

    async getDirectoryHandle(dirName, options = {}) {
      if (directories.has(dirName)) {
        return directories.get(dirName);
      }
      if (options.create) {
        const newDir = createMockDirectoryHandle(dirName);
        directories.set(dirName, newDir);
        return newDir;
      }
      throw new Error(`Directory not found: ${dirName}`);
    },

    async removeEntry(entryName, options = {}) {
      if (files.has(entryName)) {
        files.delete(entryName);
        return;
      }
      if (directories.has(entryName)) {
        directories.delete(entryName);
        return;
      }
      throw new Error(`Entry not found: ${entryName}`);
    },

    async *values() {
      for (const file of files.values()) {
        yield file;
      }
      for (const dir of directories.values()) {
        yield dir;
      }
    },

    async resolve(targetHandle) {
      // Search for file in this directory
      for (const [fileName, fileHandle] of files) {
        if (fileHandle === targetHandle) {
          return [fileName];
        }
      }
      // Search in subdirectories
      for (const [dirName, dirHandle] of directories) {
        const subPath = await dirHandle.resolve(targetHandle);
        if (subPath) {
          return [dirName, ...subPath];
        }
      }
      return null;
    },

    // Test helpers
    _files: files,
    _directories: directories
  };

  return handle;
}
