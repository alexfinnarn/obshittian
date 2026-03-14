# Phase 05: Testing and Documentation

**Status:** Pending
**Output:** Tested search functionality with documentation

## Objective

Write comprehensive tests for QMD integration and document the new search feature for users and developers.

## Tasks

- [ ] Write unit tests for QMD service and client
- [ ] Write integration tests for search API
- [ ] Write E2E tests for global search flow
- [ ] Mock QMD server for testing without models
- [ ] Update README with search feature documentation
- [ ] Update AGENTS.md with QMD setup instructions
- [ ] Add inline code comments for complex logic
- [ ] Create user-facing docs for search usage

## Content Outline

### 1. Unit Tests

**src/lib/server/qmdService.test.ts**
- Test QMD process starting/stopping
- Test health check
- Test collection creation
- Test embedding generation
- Mock child_process for subprocess calls

**src/lib/server/qmdClient.test.ts**
- Test MCP client request formatting
- Test search response parsing
- Test error handling (timeout, connection refused)
- Test all three search modes

**src/lib/utils/journalConverter.test.ts**
- Test YAML → MD conversion
- Test frontmatter generation
- Test edge cases (empty entries, special characters)

**src/lib/services/searchService.test.ts**
- Test API client calls
- Test error handling
- Test result formatting

### 2. Integration Tests

**src/routes/api/search/query/+server.test.ts**
- Test with mocked QMD server
- Test various query formats
- Test pagination
- Test error responses (503, 400, 504)

**src/routes/api/search/setup/+server.test.ts**
- Test QMD startup
- Test collection creation
- Test error handling

### 3. E2E Tests

**tests/e2e/search.spec.ts**
```typescript
test('global search displays results', async ({ page }) => {
  // Open vault
  // Navigate to Global tab
  // Type search query
  // Verify results appear
  // Click result
  // Verify file opens in editor
});

test('journal entries appear in search', async ({ page }) => {
  // Create journal entry with specific text
  // Wait for sync
  // Search for that text
  // Verify journal result appears
  // Click result
  // Verify navigation to journal
});

test('search handles QMD unavailable gracefully', async ({ page }) => {
  // Mock QMD down
  // Try to search
  // Verify error message appears
});
```

### 4. Mock QMD Server

Create mock server for testing without downloading models:

```typescript
// tests/mocks/qmdServer.ts
import { createServer } from 'http';

export function createMockQMDServer(port: number) {
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok' }));
    } else if (req.url === '/mcp') {
      // Handle MCP tool calls
      // Return mock search results
    }
  });
  
  return server.listen(port);
}
```

### 5. Documentation Updates

**README.md**
Add section:
```markdown
## Search Features

### Tag Search
Browse files by tags extracted from frontmatter. [... existing description]

### Global Search (QMD)
Full-text semantic search across all documents using QMD:
- **BM25 keyword search** - Fast exact matching
- **Vector semantic search** - Find related concepts
- **LLM re-ranking** - Best relevance ranking

First-time setup downloads ~2GB of AI models.

**Requirements:**
- QMD must be installed: `npm install -g @tobilu/qmd`
- First search requires embedding generation (may take a few minutes)
```

**AGENTS.md**
Add section:
```markdown
## QMD Search Integration

The app uses [QMD](https://github.com/tobi/qmd) for semantic search.

### Architecture
- QMD runs as HTTP MCP server on port 8181
- API routes proxy search requests to QMD
- Journal entries are synced to `.qmd-journals/` cache for indexing

### Development Setup
1. Install QMD: `npm install -g @tobilu/qmd`
2. Start dev server normally - QMD starts automatically
3. First search will generate embeddings

### Testing
- Tests use a mock QMD server (see `tests/mocks/qmdServer.ts`)
- No need to download real models for testing
```

### 6. Inline Code Comments

Add JSDoc comments to:
- `qmdService.ts` - Explain daemon management
- `qmdClient.ts` - Document MCP protocol usage
- `journalConverter.ts` - Clarify conversion logic
- `GlobalSearch.svelte` - Component structure

Example:
```typescript
/**
 * QMD Service - Manages QMD HTTP daemon lifecycle
 * 
 * QMD runs as a background process in daemon mode.
 * Models stay loaded in memory for fast searches.
 * First run downloads ~2GB of models to ~/.cache/qmd/models/
 */
export class QMDService { ... }
```

### 7. User-Facing Documentation

Create `/docs/search.md`:
```markdown
# Search Guide

## Tag Search
[Browse files by tags...]

## Global Search
[Search across all documents...]

### How It Works
- Semantic search understands related concepts
- Finds relevant results even without exact keyword match
- Ranks results by relevance

### Tips
- Use natural language queries
- Start broad, then narrow down
- Check the relevance score
```

## Dependencies

- All previous phases complete
- Test infrastructure (Vitest + Playwright) already in place

## Acceptance Criteria

- [ ] Unit tests cover all QMD utilities (>80% coverage)
- [ ] Integration tests cover API routes
- [ ] E2E tests cover user search flows
- [ ] Mock QMD server allows testing without models
- [ ] README updated with search features
- [ ] AGENTS.md updated with setup instructions
- [ ] Complex code has inline comments
- [ ] User docs created in /docs/search.md
- [ ] All tests pass: `npm run test:run && npm run test:e2e`
- [ ] Type checking passes: `npm run check`