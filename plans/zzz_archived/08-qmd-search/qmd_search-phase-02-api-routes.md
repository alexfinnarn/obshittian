# Phase 02: API Routes for Search Operations

**Status:** Pending
**Output:** Working search API that queries QMD via HTTP MCP

## Objective

Create API routes that communicate with QMD HTTP server to perform searches and return results to the client.

## Tasks

- [ ] Create MCP client utility for QMD communication
- [ ] Create `/api/search/query` endpoint
- [ ] Define request/response types for search API
- [ ] Handle QMD connection errors gracefully
- [ ] Add search result formatting (snippets, highlighting)
- [ ] Implement search result pagination

## Content Outline

### 1. MCP Client (src/lib/server/qmdClient.ts)

QMD's MCP server exposes tools via JSON-RPC. Need to implement MCP client:

```typescript
// Pseudocode structure
export class QMDClient {
  private endpoint: string;
  
  async call(tool: string, args: object): Promise<any> {
    // POST to http://localhost:8181/mcp
    // Format: MCP tool call request
    // Handle: qmd_search, qmd_vector_search, qmd_deep_search
  }
  
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Call qmd_search tool
    // Parse response
    // Format results
  }
  
  async query(query: string, options: QueryOptions): Promise<SearchResult[]> {
    // Call qmd_deep_search tool (hybrid + rerank)
    // Best search quality
  }
  
  async getDocument(docId: string): Promise<Document> {
    // Call qmd_get tool
    // Retrieve full document content
  }
}
```

### 2. API Types (src/lib/server/searchTypes.ts)

```typescript
export interface SearchRequest {
  query: string;
  limit?: number; // default 20
  minScore?: number; // default 0
  mode?: 'search' | 'vsearch' | 'query'; // default 'query'
}

export interface SearchResult {
  id: string; // docId from QMD
  path: string; // relative path in vault
  title: string;
  score: number; // 0.0 to 1.0
  snippet: string; // context around match
  context?: string; // context metadata
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  mode: string;
}
```

### 3. Search Endpoint (src/routes/api/search/query/+server.ts)

**POST /api/search/query**

Request body:
```json
{
  "query": "API design patterns",
  "limit": 10,
  "mode": "query"
}
```

Response:
```json
{
  "results": [
    {
      "id": "#abc123",
      "path": "docs/architecture.md",
      "title": "Architecture Overview",
      "score": 0.89,
      "snippet": "...discussed **API design patterns** for the new service...",
      "context": "Documentation"
    }
  ],
  "total": 5,
  "query": "API design patterns",
  "mode": "query"
}
```

### 4. Error Handling

- QMD not running → return 503 Service Unavailable
- Invalid query → return 400 Bad Request
- QMD timeout → return 504 Gateway Timeout
- Model not loaded → return 503 with message "Search index loading..."

### 5. Result Formatting

- Extract snippet around match (±100 characters)
- Highlight query terms in snippet (HTML `<mark>` tags)
- Resolve document titles from QMD metadata
- Map QMD docIds to vault file paths

## Dependencies

- Phase 01 must be complete (QMD running as HTTP server)
- MCP protocol understanding (QMD uses standard MCP tools)

## Acceptance Criteria

- [ ] `/api/search/query` accepts search requests
- [ ] Returns properly formatted search results
- [ ] Handles errors gracefully (QMD down, timeout, etc.)
- [ ] Supports all three search modes (search/vsearch/query)
- [ ] Respects limit and minScore parameters
- [ ] Returns HTTP 503 when QMD not available
- [ ] Unit tests for search client
- [ ] Integration test with mocked QMD server