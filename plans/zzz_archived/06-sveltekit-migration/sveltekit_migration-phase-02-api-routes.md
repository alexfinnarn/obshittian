# Phase 02: File System API Routes

**Status:** Completed
**Output:** Server routes for all file operations at `/api/files/*`

## Objective

Create SvelteKit server routes that use Node.js `fs` module to perform file operations.

## Tasks

- [x] Create `/api/files/read/+server.ts` - Read file content
- [x] Create `/api/files/write/+server.ts` - Write file content
- [x] Create `/api/files/list/+server.ts` - List directory entries
- [x] Create `/api/files/create/+server.ts` - Create file or directory
- [x] Create `/api/files/delete/+server.ts` - Delete file or directory
- [x] Create `/api/files/rename/+server.ts` - Rename file or directory
- [x] Create `/api/files/exists/+server.ts` - Check if path exists
- [x] Create `/api/files/stat/+server.ts` - Get file/directory metadata
- [x] Add path validation and security checks (prevent path traversal)
- [x] Add error handling with appropriate HTTP status codes
- [x] Create shared types for API request/response

## API Routes

### POST /api/files/read
```typescript
// Request
{ path: string }

// Response
{ content: string }
// OR binary for non-text files
```

### POST /api/files/write
```typescript
// Request
{ path: string, content: string }

// Response
{ success: true }
```

### POST /api/files/list
```typescript
// Request
{ path: string }

// Response
{
  entries: Array<{
    name: string,
    kind: 'file' | 'directory',
    size?: number,
    modified?: string
  }>
}
```

### POST /api/files/create
```typescript
// Request
{ path: string, kind: 'file' | 'directory', content?: string }

// Response
{ success: true }
```

### POST /api/files/delete
```typescript
// Request
{ path: string, recursive?: boolean }

// Response
{ success: true }
```

### POST /api/files/rename
```typescript
// Request
{ oldPath: string, newPath: string }

// Response
{ success: true }
```

### POST /api/files/exists
```typescript
// Request
{ path: string }

// Response
{ exists: boolean, kind?: 'file' | 'directory' }
```

## Security Considerations

```typescript
// src/lib/server/pathUtils.ts
import path from 'path';

/**
 * Validate path is within allowed vault directory
 */
export function validatePath(requestedPath: string, vaultRoot: string): string {
  const resolved = path.resolve(vaultRoot, requestedPath);

  // Prevent path traversal attacks
  if (!resolved.startsWith(path.resolve(vaultRoot))) {
    throw new Error('Path traversal detected');
  }

  return resolved;
}
```

## File Structure

```
src/routes/api/files/
├── read/+server.ts
├── write/+server.ts
├── list/+server.ts
├── create/+server.ts
├── delete/+server.ts
├── rename/+server.ts
├── exists/+server.ts
└── stat/+server.ts

src/lib/server/
├── pathUtils.ts      # Path validation utilities
└── fileTypes.ts      # Shared API types
```

## Dependencies

- Phase 01 complete (SvelteKit project setup)

## Acceptance Criteria

- [x] All API routes return proper JSON responses
- [x] Path traversal attempts return 403 Forbidden
- [x] Invalid paths return 400 Bad Request
- [x] File not found returns 404 Not Found
- [x] Write permission errors return 403 Forbidden
- [x] Routes work with curl/Postman testing
- [x] TypeScript types are properly defined

## Notes

- Vault path is configured via `VAULT_PATH` environment variable
- All routes use POST method for consistency (body contains path)
- List route filters hidden files (starting with `.`)
- List route sorts directories first, then alphabetically
- Write route auto-creates parent directories
- Error responses include `code` field for programmatic handling
