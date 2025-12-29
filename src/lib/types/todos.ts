/**
 * Todo types and interfaces for the global todo list component.
 * Todos are stored in {vault}/data/todos.json.
 */

export type TodoStatus = 'new' | 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'complete';

export interface Todo {
  /** Unique identifier */
  id: string;
  /** Task text */
  text: string;
  /** Current status in the workflow */
  status: TodoStatus;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last updated */
  updatedAt: string;
}

/** Storage format for todos.json */
export interface TodosData {
  todos: Todo[];
  version: number;
}

/** Human-readable labels for each status */
export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  'new': 'New',
  'backlog': 'Backlog',
  'todo': 'Todo',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  'complete': 'Complete',
};

/** Status order for workflow progression */
export const TODO_STATUS_ORDER: TodoStatus[] = [
  'new',
  'backlog',
  'todo',
  'in-progress',
  'in-review',
  'complete',
];

/**
 * Create a new Todo object.
 * Uses crypto.randomUUID() for unique IDs.
 */
export function createTodo(text: string, status: TodoStatus = 'new'): Todo {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    text,
    status,
    createdAt: now,
    updatedAt: now,
  };
}
