# Actions

Svelte actions are reusable behaviors that can be attached to DOM elements using the `use:` directive. They provide a way to encapsulate DOM-related logic and side effects.

## Architecture Layer

```
┌─────────────────────────────────────────────┐
│  Components (UI + event handlers)           │
├─────────────────────────────────────────────┤
│  Actions (DOM behavior)                     │  ← You are here
├─────────────────────────────────────────────┤
│  Services / Stores / Utilities              │
└─────────────────────────────────────────────┘
```

Actions sit between components and the core logic layers. They attach behavior to DOM elements and can interact with stores and utilities.

## When to Create an Action

Use this decision tree:

```
Does it attach behavior to a specific DOM element?
  └─ NO  → Not an action (use component, store, or service)
  └─ YES → Continue...

Is the behavior reusable across multiple components?
  └─ YES → Create an action in actions/
  └─ NO  → Keep inline in the component

Does it need lifecycle cleanup (event listeners, subscriptions)?
  └─ YES → Action is a good fit (provides destroy() method)
  └─ NO  → Could be inline, but action still works
```

### Action Characteristics

- **Element-scoped** - attaches to a specific DOM element
- **Lifecycle-aware** - setup on mount, cleanup on destroy
- **Reusable** - can be used on any element via `use:action`
- **Updatable** - can respond to parameter changes

### Not an Action

- Global keyboard shortcuts that don't need element scope → use window event listeners
- State management → `stores/`
- Business logic orchestration → `services/`
- Pure data transformations → `utils/`

## Existing Actions

### clickOutside

Detects clicks outside an element, useful for closing dropdowns and menus.

**Location:** `src/lib/actions/clickOutside.ts`

#### Usage

```svelte
<script>
  import { clickOutside } from '$lib/actions/clickOutside';
</script>

<!-- Simple callback -->
<div use:clickOutside={handleClose}>
  Dropdown content
</div>

<!-- With options -->
<div use:clickOutside={{ callback: handleClose, enabled: isOpen }}>
  Dropdown content
</div>
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `callback` | `() => void` | required | Called when click occurs outside |
| `enabled` | `boolean` | `true` | Whether the action is active |

---

### shortcut

Declarative keyboard shortcuts with blocking contexts and focus conditions.

**Location:** `src/lib/actions/shortcut.ts`

#### Why Use This Action

1. **Blocking contexts** - Shortcuts automatically disabled when modals are open
2. **Focus conditions** - Shortcuts can require specific pane focus
3. **Declarative** - Define shortcuts where the UI logic lives
4. **Automatic cleanup** - Listeners removed when element unmounts

#### Usage

```svelte
<script>
  import { shortcut } from '$lib/actions/shortcut';
  import { handleSave, handleToggleView, handleCloseTab } from '$lib/services/shortcutHandlers';
</script>

<!-- Basic shortcut -->
<div use:shortcut={{ binding: 'save', handler: handleSave }}>
  App content
</div>

<!-- Shortcut with focus condition -->
<div use:shortcut={{
  binding: 'toggleView',
  handler: handleToggleView,
  when: { focusedPane: 'right' }
}}>
  App content
</div>

<!-- Multiple shortcuts on one element -->
<div
  use:shortcut={{ binding: 'save', handler: handleSave }}
  use:shortcut={{ binding: 'toggleView', handler: handleToggleView }}
  use:shortcut={{ binding: 'closeTab', handler: handleCloseTab }}
>
  App content
</div>
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `binding` | `ShortcutName` | required | Key from config.shortcuts (e.g., 'save', 'toggleView') |
| `handler` | `(event: KeyboardEvent) => void` | required | Called when shortcut fires |
| `when.focusedPane` | `'left' \| 'right'` | - | Only fire when this pane is focused |
| `when.check` | `() => boolean` | - | Custom condition function |
| `ignoreBlocking` | `boolean` | `false` | Fire even when shortcuts are blocked |
| `scope` | `'global' \| 'element'` | `'global'` | Where to attach the listener |

#### Blocking Contexts

Modals and other UI elements can block shortcuts to prevent accidental actions:

```typescript
import { blockShortcuts } from '$lib/stores/shortcuts.svelte';

// Block shortcuts (e.g., when modal opens)
const unblock = blockShortcuts('modal');

// Later, unblock (e.g., when modal closes)
unblock();
```

The Modal component automatically blocks shortcuts when visible:

```svelte
<!-- Modal.svelte - shortcuts blocked automatically -->
<script>
  import { blockShortcuts } from '$lib/stores/shortcuts.svelte';

  $effect(() => {
    if (visible) {
      unblock = blockShortcuts('modal');
    } else if (unblock) {
      unblock();
    }
  });
</script>
```

#### Available Shortcuts

Shortcuts are defined in `src/lib/config.ts`:

| Name | Default Binding | Description |
|------|----------------|-------------|
| `save` | Cmd/Ctrl+S | Save focused pane |
| `toggleView` | Cmd/Ctrl+E | Toggle edit/view mode |
| `closeTab` | Cmd/Ctrl+W | Close current tab |
| `nextTab` | Cmd/Ctrl+Tab | Next tab |
| `prevTab` | Cmd/Ctrl+Shift+Tab | Previous tab |

## Creating New Actions

1. Create file in `src/lib/actions/` (e.g., `myAction.ts`)
2. Use the `Action<HTMLElement, Parameter>` type from `svelte/action`
3. Return an object with `update()` and `destroy()` methods
4. Create tests in the same directory (e.g., `myAction.test.ts`)
5. Document in this file

### Action Template

```typescript
import type { Action } from 'svelte/action';

interface MyActionOptions {
  // Define your options
}

export const myAction: Action<HTMLElement, MyActionOptions> = (
  node: HTMLElement,
  options: MyActionOptions
) => {
  let currentOptions = options;

  // Setup: attach event listeners, etc.
  function handleEvent(event: Event) {
    // Handle the event
  }

  node.addEventListener('someEvent', handleEvent);

  return {
    update(newOptions: MyActionOptions) {
      // Called when options change
      currentOptions = newOptions;
    },
    destroy() {
      // Cleanup: remove event listeners, etc.
      node.removeEventListener('someEvent', handleEvent);
    },
  };
};
```

### Testing Actions

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { myAction } from './myAction';
import type { ActionReturn } from 'svelte/action';

type ActionResult = NonNullable<ActionReturn<Parameters<typeof myAction>[1]>>;

describe('myAction', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('does something when triggered', () => {
    const action = myAction(element, options) as ActionResult;

    // Test your action behavior

    action.destroy?.();
  });
});
```

## Shortcuts Store

The shortcuts store (`src/lib/stores/shortcuts.svelte.ts`) manages blocking contexts for the shortcut action.

### Functions

| Function | Purpose |
|----------|---------|
| `blockShortcuts(reason)` | Block shortcuts, returns unblock function |
| `areShortcutsBlocked()` | Check if any blockers are active |
| `getBlockingReasons()` | Get list of current blocking reasons (debugging) |
| `clearAllBlocks()` | Remove all blockers (testing) |

### Example: Blocking in a Component

```svelte
<script>
  import { onDestroy } from 'svelte';
  import { blockShortcuts } from '$lib/stores/shortcuts.svelte';

  let unblock: (() => void) | null = null;

  $effect(() => {
    if (shouldBlock) {
      unblock = blockShortcuts('my-component');
    } else if (unblock) {
      unblock();
      unblock = null;
    }
  });

  onDestroy(() => {
    unblock?.();
  });
</script>
```

## Shortcut Handlers Service

Handler functions for keyboard shortcuts live in `src/lib/services/shortcutHandlers.ts`.

### Functions

| Function | Purpose |
|----------|---------|
| `handleSave()` | Save focused pane or both if none focused |
| `handleToggleView()` | Emit `pane:toggleView` event |
| `handleCloseTab()` | Close current tab (left pane focused) |
| `handleNextTab()` | Switch to next tab |
| `handlePrevTab()` | Switch to previous tab |

### Usage

```typescript
import {
  handleSave,
  handleToggleView,
} from '$lib/services/shortcutHandlers';

// In App.svelte with use:shortcut
use:shortcut={{ binding: 'save', handler: handleSave }}
use:shortcut={{ binding: 'toggleView', handler: handleToggleView }}
```
