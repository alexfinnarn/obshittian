/**
 * Global type declarations for APIs not in default TypeScript lib
 */

// File System Access API types
interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FilePickerOptions {
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
}

interface Window {
  showOpenFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle>;
  showDirectoryPicker(options?: { startIn?: FileSystemHandle | string }): Promise<FileSystemDirectoryHandle>;
}

// Extend FileSystemHandle with permission methods (not in default TypeScript lib)
interface FileSystemHandle {
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

// Extend globalThis for test setup
declare var showOpenFilePicker: typeof window.showOpenFilePicker;
