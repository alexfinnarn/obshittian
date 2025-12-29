/**
 * Todos Store - Svelte 5 runes-based store for global todo list
 *
 * Stores todos in {vault}/data/todos.json with auto-save on mutations.
 */

import { vault } from './vault.svelte';
import { getOrCreateDirectory } from '../utils/filesystem';
import type { Todo, TodosData, TodoStatus } from '../types/todos';
import { createTodo } from '../types/todos';

const DATA_FOLDER = 'data';
const TODOS_FILENAME = 'todos.json';
const CURRENT_VERSION = 1;
const SHOW_COMPLETED_KEY = 'todosShowCompleted';

interface TodosState {
  todos: Todo[];
  isLoading: boolean;
  showCompleted: boolean;
}

/**
 * The todos state - reactive via Svelte 5 runes.
 */
export const todosStore = $state<TodosState>({
  todos: [],
  isLoading: false,
  showCompleted: false,
});

// ============================================================================
// Getters
// ============================================================================

/**
 * Get all todos
 */
export function getTodos(): Todo[] {
  return todosStore.todos;
}

/**
 * Get todos filtered by status
 */
export function getTodosByStatus(status: TodoStatus): Todo[] {
  return todosStore.todos.filter((t) => t.status === status);
}

/**
 * Get active todos (not complete)
 */
export function getActiveTodos(): Todo[] {
  return todosStore.todos.filter((t) => t.status !== 'complete');
}

/**
 * Get completed todos
 */
export function getCompletedTodos(): Todo[] {
  return todosStore.todos.filter((t) => t.status === 'complete');
}

/**
 * Get visible todos (respects showCompleted setting)
 */
export function getVisibleTodos(): Todo[] {
  if (todosStore.showCompleted) {
    return todosStore.todos;
  }
  return todosStore.todos.filter((t) => t.status !== 'complete');
}

/**
 * Get showCompleted setting
 */
export function getShowCompleted(): boolean {
  return todosStore.showCompleted;
}

/**
 * Set showCompleted and persist to localStorage
 */
export function setShowCompleted(show: boolean): void {
  todosStore.showCompleted = show;
  try {
    localStorage.setItem(SHOW_COMPLETED_KEY, JSON.stringify(show));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load showCompleted from localStorage
 */
export function loadShowCompleted(): void {
  try {
    const stored = localStorage.getItem(SHOW_COMPLETED_KEY);
    if (stored !== null) {
      todosStore.showCompleted = JSON.parse(stored);
    }
  } catch {
    // Ignore errors, use default
  }
}

// ============================================================================
// CRUD Operations (auto-save)
// ============================================================================

/**
 * Add a new todo and save
 */
export async function addTodo(
  text: string,
  status: TodoStatus = 'new'
): Promise<Todo | null> {
  const todo = createTodo(text, status);
  todosStore.todos = [...todosStore.todos, todo];

  const saved = await saveTodos();
  if (!saved) {
    // Rollback on save failure
    todosStore.todos = todosStore.todos.filter((t) => t.id !== todo.id);
    return null;
  }

  return todo;
}

/**
 * Remove a todo by ID and save
 */
export async function removeTodo(id: string): Promise<boolean> {
  const index = todosStore.todos.findIndex((t) => t.id === id);
  if (index === -1) return false;

  const removed = todosStore.todos[index];
  todosStore.todos = todosStore.todos.filter((t) => t.id !== id);

  const saved = await saveTodos();
  if (!saved) {
    // Rollback on save failure
    todosStore.todos = [...todosStore.todos.slice(0, index), removed, ...todosStore.todos.slice(index)];
    return false;
  }

  return true;
}

/**
 * Update a todo's text and save
 */
export async function updateTodoText(id: string, text: string): Promise<boolean> {
  const todo = todosStore.todos.find((t) => t.id === id);
  if (!todo) return false;

  const oldText = todo.text;
  const oldUpdatedAt = todo.updatedAt;

  todo.text = text;
  todo.updatedAt = new Date().toISOString();

  const saved = await saveTodos();
  if (!saved) {
    // Rollback on save failure
    todo.text = oldText;
    todo.updatedAt = oldUpdatedAt;
    return false;
  }

  return true;
}

/**
 * Update a todo's status and save
 */
export async function updateTodoStatus(id: string, status: TodoStatus): Promise<boolean> {
  const todo = todosStore.todos.find((t) => t.id === id);
  if (!todo) return false;

  const oldStatus = todo.status;
  const oldUpdatedAt = todo.updatedAt;

  todo.status = status;
  todo.updatedAt = new Date().toISOString();

  const saved = await saveTodos();
  if (!saved) {
    // Rollback on save failure
    todo.status = oldStatus;
    todo.updatedAt = oldUpdatedAt;
    return false;
  }

  return true;
}

// ============================================================================
// Persistence
// ============================================================================

/**
 * Get the data directory handle, creating it if needed
 */
async function getDataDirectory(
  rootDirHandle: FileSystemDirectoryHandle
): Promise<FileSystemDirectoryHandle> {
  return getOrCreateDirectory(rootDirHandle, DATA_FOLDER);
}

/**
 * Load todos from {vault}/data/todos.json
 * Creates the file with empty array if it doesn't exist.
 */
export async function loadTodos(
  rootDirHandle?: FileSystemDirectoryHandle
): Promise<Todo[]> {
  const dirHandle = rootDirHandle ?? vault.rootDirHandle;

  if (!dirHandle) {
    // No vault open, use empty state
    todosStore.todos = [];
    todosStore.isLoading = false;
    return [];
  }

  todosStore.isLoading = true;

  try {
    const dataDir = await getDataDirectory(dirHandle);

    try {
      const fileHandle = await dataDir.getFileHandle(TODOS_FILENAME);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text) as TodosData;

      todosStore.todos = parsed.todos ?? [];
    } catch (err) {
      // File doesn't exist - create it with empty array
      if ((err as DOMException)?.name === 'NotFoundError') {
        todosStore.todos = [];
        await saveTodos(dirHandle);
      } else {
        console.warn('Error reading todos:', (err as Error).message);
        todosStore.todos = [];
      }
    }
  } catch (err) {
    console.error('Error accessing data directory:', err);
    todosStore.todos = [];
  }

  todosStore.isLoading = false;
  return todosStore.todos;
}

/**
 * Save todos to {vault}/data/todos.json
 */
export async function saveTodos(
  rootDirHandle?: FileSystemDirectoryHandle
): Promise<boolean> {
  const dirHandle = rootDirHandle ?? vault.rootDirHandle;

  if (!dirHandle) {
    console.error('Cannot save todos: no vault open');
    return false;
  }

  try {
    const dataDir = await getDataDirectory(dirHandle);
    const fileHandle = await dataDir.getFileHandle(TODOS_FILENAME, { create: true });
    const writable = await fileHandle.createWritable();

    const data: TodosData = {
      todos: todosStore.todos,
      version: CURRENT_VERSION,
    };

    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    return true;
  } catch (err) {
    console.error('Error saving todos:', err);
    return false;
  }
}

/**
 * Reset todos to empty state (does not save)
 */
export function resetTodos(): void {
  todosStore.todos = [];
  todosStore.isLoading = false;
  todosStore.showCompleted = false;
}
