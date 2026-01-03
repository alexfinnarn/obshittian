/**
 * Shared types for file system API routes
 */

// Request types
export interface ReadRequest {
  path: string;
}

export interface WriteRequest {
  path: string;
  content: string;
}

export interface ListRequest {
  path: string;
}

export interface CreateRequest {
  path: string;
  kind: 'file' | 'directory';
  content?: string;
}

export interface DeleteRequest {
  path: string;
  recursive?: boolean;
}

export interface RenameRequest {
  oldPath: string;
  newPath: string;
}

export interface ExistsRequest {
  path: string;
}

export interface StatRequest {
  path: string;
}

// Response types
export interface ReadResponse {
  content: string;
}

export interface WriteResponse {
  success: true;
}

export interface DirectoryEntry {
  name: string;
  kind: 'file' | 'directory';
  size?: number;
  modified?: string;
}

export interface ListResponse {
  entries: DirectoryEntry[];
}

export interface CreateResponse {
  success: true;
}

export interface DeleteResponse {
  success: true;
}

export interface RenameResponse {
  success: true;
}

export interface ExistsResponse {
  exists: boolean;
  kind?: 'file' | 'directory';
}

export interface StatResponse {
  kind: 'file' | 'directory';
  size: number;
  modified: string;
  created: string;
}

// Error response
export interface ErrorResponse {
  error: string;
  code?: string;
}
