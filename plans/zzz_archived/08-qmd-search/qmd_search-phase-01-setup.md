# Phase 01: Server-side QMD Setup and Indexing

**Status:** Pending
**Output:** QMD running as HTTP daemon, vault indexed with embeddings

## Objective

Install QMD, configure it to run as an HTTP MCP server, and create initial index of the vault with vector embeddings.

## Tasks

- [ ] Add `@tobilu/qmd` to package.json dependencies
- [ ] Create server-side utility to spawn QMD HTTP daemon
- [ ] Create `/api/search/status` endpoint to check if QMD is running
- [ ] Create `/api/search/setup` endpoint to:
  - Check if QMD is installed
  - Start QMD HTTP daemon if not running
  - Wait for models to download (first-time setup)
  - Create QMD collection for vault
- [ ] Create `/api/search/index` endpoint to:
  - Trigger full vault reindex
  - Generate embeddings for all documents
  - Return indexing progress/status
- [ ] Add environment variable `QMD_PORT` (default: 8181)
- [ ] Update `.env.example` with QMD configuration

## Content Outline

### 1. Install QMD Dependency

```bash
npm install @tobilu/qmd
```

Add to package.json:
```json
{
  "dependencies": {
    "@tobilu/qmd": "^1.1.0"
  }
}
```

### 2. QMD Process Manager (src/lib/server/qmdService.ts)

Create a service to manage the QMD HTTP daemon:

```typescript
// Pseudocode structure
export class QMDService {
  private process: ChildProcess | null = null;
  
  async start(): Promise<void> {
    // Spawn: qmd mcp --http --port 8181 --daemon
    // Check if already running via health endpoint
    // Wait for models to download on first run
  }
  
  async stop(): Promise<void> {
    // Kill process or call: qmd stop
  }
  
  async isHealthy(): Promise<boolean> {
    // GET http://localhost:8181/health
  }
  
  async createCollection(vaultPath: string): Promise<void> {
    // Call QMD collection add via subprocess
    // qmd collection add {vaultPath} --name vault
  }
  
  async generateEmbeddings(): Promise<void> {
    // Call: qmd embed
  }
}
```

### 3. API Routes

**POST /api/search/status**
- Check if QMD process is running
- Return: `{ running: boolean, port: number, healthy: boolean }`

**POST /api/search/setup**
- Start QMD daemon if not running
- Create collection if not exists
- Return: `{ success: boolean, message: string }`

**POST /api/search/index**
- Trigger `qmd embed` to generate embeddings
- Return: `{ success: boolean, message: string, progress?: number }`

### 4. Vault Validation Integration

Update `/api/vault/validate` to also call `/api/search/setup` when vault is validated successfully.

### 5. First-time Setup Flow

1. User opens vault via vault picker
2. Server validates vault path
3. Server calls `qmd collection add {vaultPath}`
4. Server calls `qmd embed` (runs in background)
5. Client shows "Building search index..." with progress
6. Models download to `~/.cache/qmd/models/` first time (~2GB)

## Dependencies

- Node 22+ (already required)
- QMD models will download automatically on first use
- SQLite with FTS5 support (built into Node)

## Acceptance Criteria

- [ ] `npm run build` succeeds with QMD dependency
- [ ] `/api/search/status` returns correct status
- [ ] `/api/search/setup` starts QMD daemon successfully
- [ ] QMD collection created for vault path
- [ ] Embeddings can be generated via `/api/search/index`
- [ ] QMD process persists across API calls (daemon mode)
- [ ] Health check endpoint responds at `http://localhost:8181/health`
- [ ] Models download automatically on first run
- [ ] Error handling for missing models, failed downloads
- [ ] Graceful shutdown of QMD process when server stops