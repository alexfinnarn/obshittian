# Phase 03: App Integration

**Status:** Completed
**Output:** Modified `src/App.svelte`, `src/lib/utils/dailyNotes.ts`

## Objective

Integrate TodoList into the right pane and simplify the daily note template.

## Tasks

- [x] Import TodoList and loadTodos in App.svelte
- [x] Call loadTodos() and loadShowCompleted() in onVaultOpened() after loadVaultConfig()
- [x] Modify right pane layout to include TodoList above EditorPane
- [x] Add CSS for right-pane-editor wrapper
- [x] Simplify daily note template in dailyNotes.ts
- [x] Update related tests for new template format

## Content Outline

**App.svelte changes (lines ~341-350):**
```svelte
<div class="pane right-pane" style="flex: {100 - leftPaneWidthPercent}">
  <TodoList />
  <div class="right-pane-editor">
    <EditorPane
      pane="right"
      mode="single"
      ...
    />
  </div>
</div>
```

**New CSS:**
```css
.right-pane-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
```

**dailyNotes.ts template change:**
```typescript
// Before: includes "## DayName" and "- [ ]" sections
// After: simplified to just metadata + date heading + Notes section
return `---
sync: delete
---

# ${dayName} - ${year}-${month}-${day}

## Notes

`;
```

## Dependencies

- Phase 01 complete (store)
- Phase 02 complete (component)

## Acceptance Criteria

- [x] TodoList appears at top of right pane
- [x] EditorPane fills remaining space below TodoList
- [x] Todos load when vault opens
- [x] TodoList always renders (shows empty state when no vault)
- [x] New daily notes use simplified template (no `- [ ]`)
