/**
 * Tests for todos store
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  todosStore,
  getTodos,
  getTodosByStatus,
  getActiveTodos,
  getCompletedTodos,
  getVisibleTodos,
  getShowCompleted,
  setShowCompleted,
  loadShowCompleted,
  addTodo,
  removeTodo,
  updateTodoText,
  updateTodoStatus,
  resetTodos,
  loadTodos,
  saveTodos,
} from './todos.svelte';
import { vault } from './vault.svelte';
import * as filesystem from '../utils/filesystem';
import type { Todo } from '../types/todos';

// Mock the vault store
vi.mock('./vault.svelte', () => ({
  vault: {
    rootDirHandle: null,
  },
}));

// Mock the filesystem utility
vi.mock('../utils/filesystem', () => ({
  getOrCreateDirectory: vi.fn(),
}));

// Helper to create a mock todo for testing
function createMockTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: crypto.randomUUID(),
    text: 'Test todo',
    status: 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to set up file system mocks for successful saves
function setupSuccessfulSaveMocks() {
  const mockWritable = {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockFileHandle = {
    getFile: vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(JSON.stringify({ todos: [], version: 1 })),
    }),
    createWritable: vi.fn().mockResolvedValue(mockWritable),
  };

  const mockDataDir = {
    getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
  };

  const mockRootHandle = {
    getDirectoryHandle: vi.fn().mockResolvedValue(mockDataDir),
  };

  // Set up vault with mock handle
  (vault as { rootDirHandle: FileSystemDirectoryHandle | null }).rootDirHandle =
    mockRootHandle as unknown as FileSystemDirectoryHandle;

  // Mock getOrCreateDirectory to return the data directory
  vi.mocked(filesystem.getOrCreateDirectory).mockResolvedValue(
    mockDataDir as unknown as FileSystemDirectoryHandle
  );

  return { mockRootHandle, mockDataDir, mockFileHandle, mockWritable };
}

// Helper to set up file system mocks for failed saves
function setupFailedSaveMocks() {
  const mockDataDir = {
    getFileHandle: vi.fn().mockRejectedValue(new Error('Save failed')),
  };

  const mockRootHandle = {
    getDirectoryHandle: vi.fn().mockResolvedValue(mockDataDir),
  };

  (vault as { rootDirHandle: FileSystemDirectoryHandle | null }).rootDirHandle =
    mockRootHandle as unknown as FileSystemDirectoryHandle;

  vi.mocked(filesystem.getOrCreateDirectory).mockResolvedValue(
    mockDataDir as unknown as FileSystemDirectoryHandle
  );

  return { mockRootHandle, mockDataDir };
}

describe('todos store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetTodos();
    vi.clearAllMocks();
    (vault as { rootDirHandle: FileSystemDirectoryHandle | null }).rootDirHandle = null;
  });

  describe('initial state', () => {
    it('has empty todos array', () => {
      expect(todosStore.todos).toEqual([]);
    });

    it('has isLoading false', () => {
      expect(todosStore.isLoading).toBe(false);
    });

    it('has showCompleted false', () => {
      expect(todosStore.showCompleted).toBe(false);
    });
  });

  describe('getTodos', () => {
    it('returns all todos', () => {
      const todo1 = createMockTodo({ id: '1', text: 'Todo 1' });
      const todo2 = createMockTodo({ id: '2', text: 'Todo 2' });
      todosStore.todos = [todo1, todo2];

      expect(getTodos()).toEqual([todo1, todo2]);
    });

    it('returns empty array when no todos', () => {
      expect(getTodos()).toEqual([]);
    });
  });

  describe('getTodosByStatus', () => {
    it('filters todos by status', () => {
      const newTodo = createMockTodo({ id: '1', status: 'new' });
      const inProgressTodo = createMockTodo({ id: '2', status: 'in-progress' });
      const completeTodo = createMockTodo({ id: '3', status: 'complete' });
      todosStore.todos = [newTodo, inProgressTodo, completeTodo];

      expect(getTodosByStatus('new')).toEqual([newTodo]);
      expect(getTodosByStatus('in-progress')).toEqual([inProgressTodo]);
      expect(getTodosByStatus('complete')).toEqual([completeTodo]);
    });

    it('returns empty array when no todos match status', () => {
      const newTodo = createMockTodo({ status: 'new' });
      todosStore.todos = [newTodo];

      expect(getTodosByStatus('complete')).toEqual([]);
    });
  });

  describe('getActiveTodos', () => {
    it('returns todos that are not complete', () => {
      const newTodo = createMockTodo({ id: '1', status: 'new' });
      const inProgressTodo = createMockTodo({ id: '2', status: 'in-progress' });
      const completeTodo = createMockTodo({ id: '3', status: 'complete' });
      todosStore.todos = [newTodo, inProgressTodo, completeTodo];

      const active = getActiveTodos();
      expect(active).toHaveLength(2);
      expect(active).toContainEqual(newTodo);
      expect(active).toContainEqual(inProgressTodo);
      expect(active).not.toContainEqual(completeTodo);
    });
  });

  describe('getCompletedTodos', () => {
    it('returns only completed todos', () => {
      const newTodo = createMockTodo({ id: '1', status: 'new' });
      const completeTodo = createMockTodo({ id: '2', status: 'complete' });
      todosStore.todos = [newTodo, completeTodo];

      expect(getCompletedTodos()).toEqual([completeTodo]);
    });
  });

  describe('getVisibleTodos', () => {
    it('returns all todos when showCompleted is true', () => {
      const newTodo = createMockTodo({ id: '1', status: 'new' });
      const completeTodo = createMockTodo({ id: '2', status: 'complete' });
      todosStore.todos = [newTodo, completeTodo];
      todosStore.showCompleted = true;

      expect(getVisibleTodos()).toHaveLength(2);
    });

    it('excludes completed todos when showCompleted is false', () => {
      const newTodo = createMockTodo({ id: '1', status: 'new' });
      const completeTodo = createMockTodo({ id: '2', status: 'complete' });
      todosStore.todos = [newTodo, completeTodo];
      todosStore.showCompleted = false;

      const visible = getVisibleTodos();
      expect(visible).toHaveLength(1);
      expect(visible[0]).toEqual(newTodo);
    });
  });

  describe('showCompleted setting', () => {
    it('getShowCompleted returns current value', () => {
      expect(getShowCompleted()).toBe(false);
      todosStore.showCompleted = true;
      expect(getShowCompleted()).toBe(true);
    });

    it('setShowCompleted updates state and persists to localStorage', () => {
      setShowCompleted(true);
      expect(todosStore.showCompleted).toBe(true);
      expect(localStorage.getItem('todosShowCompleted')).toBe('true');

      setShowCompleted(false);
      expect(todosStore.showCompleted).toBe(false);
      expect(localStorage.getItem('todosShowCompleted')).toBe('false');
    });

    it('loadShowCompleted restores from localStorage', () => {
      localStorage.setItem('todosShowCompleted', 'true');
      loadShowCompleted();
      expect(todosStore.showCompleted).toBe(true);
    });

    it('loadShowCompleted uses default when localStorage is empty', () => {
      loadShowCompleted();
      expect(todosStore.showCompleted).toBe(false);
    });

    it('loadShowCompleted handles invalid JSON gracefully', () => {
      localStorage.setItem('todosShowCompleted', 'not valid json');
      loadShowCompleted();
      // Should not throw, uses default
      expect(todosStore.showCompleted).toBe(false);
    });
  });

  describe('resetTodos', () => {
    it('clears todos array', () => {
      todosStore.todos = [createMockTodo()];
      resetTodos();
      expect(todosStore.todos).toEqual([]);
    });

    it('sets isLoading to false', () => {
      todosStore.isLoading = true;
      resetTodos();
      expect(todosStore.isLoading).toBe(false);
    });

    it('sets showCompleted to false', () => {
      todosStore.showCompleted = true;
      resetTodos();
      expect(todosStore.showCompleted).toBe(false);
    });
  });

  describe('addTodo', () => {
    it('adds a new todo with default status', async () => {
      setupSuccessfulSaveMocks();

      const result = await addTodo('New task');

      expect(result).not.toBeNull();
      expect(result?.text).toBe('New task');
      expect(result?.status).toBe('new');
      expect(todosStore.todos).toHaveLength(1);
    });

    it('adds a new todo with specified status', async () => {
      setupSuccessfulSaveMocks();

      const result = await addTodo('Backlog task', 'backlog');

      expect(result?.status).toBe('backlog');
    });

    it('assigns unique ID and timestamps', async () => {
      setupSuccessfulSaveMocks();

      const result = await addTodo('Task');

      expect(result?.id).toBeDefined();
      expect(result?.createdAt).toBeDefined();
      expect(result?.updatedAt).toBeDefined();
    });

    it('rolls back on save failure', async () => {
      setupFailedSaveMocks();

      const result = await addTodo('Will fail');

      expect(result).toBeNull();
      expect(todosStore.todos).toHaveLength(0);
    });

    it('returns null when no vault is open', async () => {
      // vault.rootDirHandle is already null from beforeEach
      const result = await addTodo('No vault');

      expect(result).toBeNull();
      expect(todosStore.todos).toHaveLength(0);
    });
  });

  describe('removeTodo', () => {
    it('removes a todo by ID', async () => {
      setupSuccessfulSaveMocks();
      const todo = createMockTodo({ id: 'todo-1' });
      todosStore.todos = [todo];

      const result = await removeTodo('todo-1');

      expect(result).toBe(true);
      expect(todosStore.todos).toHaveLength(0);
    });

    it('returns false for non-existent ID', async () => {
      setupSuccessfulSaveMocks();
      todosStore.todos = [createMockTodo({ id: 'todo-1' })];

      const result = await removeTodo('non-existent');

      expect(result).toBe(false);
      expect(todosStore.todos).toHaveLength(1);
    });

    it('rolls back on save failure', async () => {
      setupFailedSaveMocks();
      const todo = createMockTodo({ id: 'todo-1' });
      todosStore.todos = [todo];

      const result = await removeTodo('todo-1');

      expect(result).toBe(false);
      expect(todosStore.todos).toHaveLength(1);
      expect(todosStore.todos[0].id).toBe('todo-1');
    });
  });

  describe('updateTodoText', () => {
    it('updates todo text', async () => {
      setupSuccessfulSaveMocks();
      const todo = createMockTodo({ id: 'todo-1', text: 'Original' });
      todosStore.todos = [todo];

      const result = await updateTodoText('todo-1', 'Updated');

      expect(result).toBe(true);
      expect(todosStore.todos[0].text).toBe('Updated');
    });

    it('updates updatedAt timestamp', async () => {
      setupSuccessfulSaveMocks();
      const oldTimestamp = '2024-01-01T00:00:00.000Z';
      const todo = createMockTodo({ id: 'todo-1', updatedAt: oldTimestamp });
      todosStore.todos = [todo];

      await updateTodoText('todo-1', 'Updated');

      expect(todosStore.todos[0].updatedAt).not.toBe(oldTimestamp);
    });

    it('returns false for non-existent ID', async () => {
      setupSuccessfulSaveMocks();

      const result = await updateTodoText('non-existent', 'Text');

      expect(result).toBe(false);
    });

    it('rolls back on save failure', async () => {
      setupFailedSaveMocks();
      const originalText = 'Original';
      const todo = createMockTodo({ id: 'todo-1', text: originalText });
      todosStore.todos = [todo];

      const result = await updateTodoText('todo-1', 'Updated');

      expect(result).toBe(false);
      expect(todosStore.todos[0].text).toBe(originalText);
    });
  });

  describe('updateTodoStatus', () => {
    it('updates todo status', async () => {
      setupSuccessfulSaveMocks();
      const todo = createMockTodo({ id: 'todo-1', status: 'new' });
      todosStore.todos = [todo];

      const result = await updateTodoStatus('todo-1', 'in-progress');

      expect(result).toBe(true);
      expect(todosStore.todos[0].status).toBe('in-progress');
    });

    it('updates updatedAt timestamp', async () => {
      setupSuccessfulSaveMocks();
      const oldTimestamp = '2024-01-01T00:00:00.000Z';
      const todo = createMockTodo({ id: 'todo-1', updatedAt: oldTimestamp });
      todosStore.todos = [todo];

      await updateTodoStatus('todo-1', 'complete');

      expect(todosStore.todos[0].updatedAt).not.toBe(oldTimestamp);
    });

    it('returns false for non-existent ID', async () => {
      setupSuccessfulSaveMocks();

      const result = await updateTodoStatus('non-existent', 'complete');

      expect(result).toBe(false);
    });

    it('rolls back on save failure', async () => {
      setupFailedSaveMocks();
      const todo = createMockTodo({ id: 'todo-1', status: 'new' });
      todosStore.todos = [todo];

      const result = await updateTodoStatus('todo-1', 'complete');

      expect(result).toBe(false);
      expect(todosStore.todos[0].status).toBe('new');
    });
  });

  describe('loadTodos', () => {
    it('sets isLoading while loading', async () => {
      const { mockDataDir, mockFileHandle } = setupSuccessfulSaveMocks();

      // Make getFile return a promise that we can control
      let resolveFile: (value: { text: () => Promise<string> }) => void;
      const filePromise = new Promise<{ text: () => Promise<string> }>((resolve) => {
        resolveFile = resolve;
      });
      mockFileHandle.getFile = vi.fn().mockReturnValue(filePromise);

      const loadPromise = loadTodos();

      // Should be loading
      expect(todosStore.isLoading).toBe(true);

      // Resolve the file read
      resolveFile!({ text: () => Promise.resolve(JSON.stringify({ todos: [], version: 1 })) });
      await loadPromise;

      // Should no longer be loading
      expect(todosStore.isLoading).toBe(false);
    });

    it('loads todos from file', async () => {
      const { mockDataDir, mockFileHandle } = setupSuccessfulSaveMocks();
      const savedTodos = [createMockTodo({ id: '1', text: 'Saved todo' })];
      mockFileHandle.getFile = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(JSON.stringify({ todos: savedTodos, version: 1 })),
      });

      await loadTodos();

      expect(todosStore.todos).toHaveLength(1);
      expect(todosStore.todos[0].text).toBe('Saved todo');
    });

    it('creates empty file if not found', async () => {
      const { mockDataDir, mockWritable } = setupSuccessfulSaveMocks();
      const mockFileHandle = {
        getFile: vi.fn().mockRejectedValue({ name: 'NotFoundError' }),
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      };
      mockDataDir.getFileHandle = vi
        .fn()
        .mockRejectedValueOnce({ name: 'NotFoundError' })
        .mockResolvedValue(mockFileHandle);

      await loadTodos();

      expect(todosStore.todos).toEqual([]);
    });

    it('returns empty array when no vault open', async () => {
      // vault.rootDirHandle is null from beforeEach

      const result = await loadTodos();

      expect(result).toEqual([]);
      expect(todosStore.todos).toEqual([]);
    });
  });

  describe('saveTodos', () => {
    it('saves todos to file', async () => {
      const { mockWritable } = setupSuccessfulSaveMocks();
      todosStore.todos = [createMockTodo({ text: 'Test' })];

      const result = await saveTodos();

      expect(result).toBe(true);
      expect(mockWritable.write).toHaveBeenCalled();
      expect(mockWritable.close).toHaveBeenCalled();
    });

    it('returns false when no vault open', async () => {
      // vault.rootDirHandle is null from beforeEach

      const result = await saveTodos();

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      setupFailedSaveMocks();

      const result = await saveTodos();

      expect(result).toBe(false);
    });
  });
});
