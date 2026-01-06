# Phase 01: Core Logger Service

**Status:** Pending
**Output:** `src/lib/services/activityLogger.ts`, `src/lib/types/activity.ts`

## Objective

Create the core activity logging service and type definitions.

## Tasks

- [ ] Create `src/lib/types/activity.ts` with event type definitions
- [ ] Create `src/lib/services/activityLogger.ts` with logging functions
- [ ] Implement JSONL file writing via fileService
- [ ] Implement activity reading functions for report generation

## Content Outline

### Types (activity.ts)

```typescript
type ActivityEventType =
  | 'file.opened'
  | 'file.saved'
  | 'file.created'
  | 'file.renamed'
  | 'file.deleted'
  | 'vault.opened'
  | 'dailynote.opened';

interface ActivityLogEntry {
  ts: string;           // ISO 8601 timestamp
  event: ActivityEventType;
  data: Record<string, unknown>;
}

// Event-specific data interfaces
interface FileOpenedData {
  path: string;
  pane: 'left' | 'right';
  source: 'tree' | 'tab' | 'quickfile' | 'search';
}
// ... etc for each event type
```

### Logger Service (activityLogger.ts)

```typescript
// Log an activity event
async function logActivity(event: ActivityEventType, data: object): Promise<void>

// Read activities for a specific date
async function getActivities(date: Date): Promise<ActivityLogEntry[]>

// Read activities for a date range
async function getActivitiesInRange(start: Date, end: Date): Promise<ActivityLogEntry[]>

// Get log file path for a date
function getLogPath(date: Date): string  // Returns "_reports/logs/YYYY-MM-DD.jsonl"
```

### Storage Format

Location: `_reports/logs/YYYY-MM-DD.jsonl`

Each line is a JSON object:
```json
{"ts":"2026-01-04T10:30:15.123Z","event":"file.opened","data":{"path":"notes/todo.md","pane":"left","source":"tree"}}
```

## Dependencies

- fileService must be available (already exists)
- Vault must be open for logging to work

## Acceptance Criteria

- [ ] ActivityLogEntry type correctly models all event types
- [ ] logActivity() appends to correct daily log file
- [ ] getActivities() parses JSONL and returns typed entries
- [ ] Log files are created in _reports/logs/ directory
