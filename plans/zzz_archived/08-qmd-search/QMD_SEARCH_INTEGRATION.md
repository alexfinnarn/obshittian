# QMD Search Integration

Integrate QMD (Query Markup Documents) to add semantic search capabilities alongside existing tag search. QMD provides BM25 full-text search, vector semantic search, and LLM re-ranking for better search quality.

## Goals

1. Add "Global Search" tab to sidebar with QMD-powered semantic search
2. Maintain existing tag search functionality unchanged
3. Index all markdown files and journal entries for comprehensive search
4. Deploy QMD as HTTP MCP server for optimal performance

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Server-side QMD setup and indexing | Pending |
| 02 | API routes for search operations | Pending |
| 03 | Client UI (GlobalSearch component) | Pending |
| 04 | Journal entry synchronization | Pending |
| 05 | Testing and documentation | Pending |

## Background

Current search implementation uses Fuse.js for tag-based search (src/lib/utils/tags.ts). This works well for finding files by tags but cannot search document content or handle semantic queries.

QMD provides:
- **BM25 full-text search** across entire document content
- **Vector semantic search** using embedding models (embeddinggemma-300M)
- **LLM re-ranking** for improved relevance (qwen3-reranker-0.6b)
- **Query expansion** for better recall (qmd-query-expansion-1.7B)

Integration approach: **HTTP MCP Server**
- Run `qmd mcp --http --daemon` as background process
- Models stay loaded in memory for fast searches
- API routes call `POST http://localhost:8181/mcp` endpoint
- ~2GB model download on first use

Search mode: **query** (hybrid + rerank)
- Best search quality combining all QMD features
- Tradeoff: requires model download and slightly slower than pure BM25

## Deliverables

- New npm dependency: `@tobilu/qmd`
- New API routes: `/api/search/setup`, `/api/search/index`, `/api/search/query`
- New component: `GlobalSearch.svelte`
- Modified: `SidebarTabs.svelte` (add Global tab)
- New utilities: journal → markdown conversion for indexing
- Updated tests for search functionality

## Architecture

```
Browser                          Server                    QMD Process
┌──────────────────┐            ┌──────────────────────┐  ┌─────────────────┐
│ GlobalSearch     │            │ /api/search/query    │  │ qmd mcp --http  │
│   ↓              │   HTTP     │   ↓                  │  │  (localhost:8181)
│ searchService ───┼───────────▶│ proxy to QMD         │  │    ↓            │
└──────────────────┘            └──────────────────────┘  │  Embed + Rerank │
                                          │               │    ↓            │
                                          └──────────────▶│  Search Results│
                                                          └─────────────────┘
                                                                  ↓
                                                           VAULT_PATH/*.md
```

## Journal Entry Indexing

Journal entries are stored as YAML in `{dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.yaml`. To include in global search:

1. Convert journal entries to temporary markdown files in `.qmd-journals/` cache directory
2. Format: `YYYY-MM-DD#entry-id.md` with frontmatter preserving metadata
3. Include in QMD collection alongside vault markdown files
4. Auto-sync when journal entries change (create/update/delete)

Example conversion:
```yaml
# Original YAML (2025-01-15.yaml)
entries:
  - id: abc123
    text: "Discussed API design patterns"
    tags: [architecture, planning]
```

```markdown
# Converted MD (.qmd-journals/2025-01-15#abc123.md)
---
date: 2025-01-15
entryId: abc123
tags: [architecture, planning]
type: journal
---

Discussed API design patterns
```

## Future Work (Out of Scope)

- Keyboard shortcut for global search (Cmd+K)
- Search result caching in localStorage
- Multiple collection support (separate indexes for different vaults)
- Configurable search modes in UI (toggle BM25/vectors/hybrid)
- Search filters by date, file type, tags
- Search history
- "Did you mean" suggestions from query expansion