<script lang="ts">
  import {
    todosStore,
    getVisibleTodos,
    addTodo,
    removeTodo,
    updateTodoText,
    updateTodoStatus,
    setShowCompleted,
  } from '$lib/stores/todos.svelte';
  import { TODO_STATUS_LABELS, TODO_STATUS_ORDER, type TodoStatus } from '$lib/types/todos';

  let newTodoText = $state('');
  let editingId = $state<string | null>(null);
  let editingText = $state('');

  async function handleAddTodo() {
    const text = newTodoText.trim();
    if (!text) return;

    await addTodo(text);
    newTodoText = '';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleAddTodo();
    }
  }

  function startEditing(id: string, text: string) {
    editingId = id;
    editingText = text;
  }

  function cancelEditing() {
    editingId = null;
    editingText = '';
  }

  async function saveEditing() {
    if (editingId && editingText.trim()) {
      await updateTodoText(editingId, editingText.trim());
    }
    cancelEditing();
  }

  function handleEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      saveEditing();
    } else if (event.key === 'Escape') {
      cancelEditing();
    }
  }

  async function handleStatusChange(id: string, status: TodoStatus) {
    await updateTodoStatus(id, status);
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this todo?')) {
      await removeTodo(id);
    }
  }

  function handleToggleShowCompleted() {
    setShowCompleted(!todosStore.showCompleted);
  }
</script>

<div class="todo-list" data-testid="todo-list">
  <header class="todo-header">
    <h3>Todos</h3>
    <label class="show-completed-toggle">
      <input
        type="checkbox"
        checked={todosStore.showCompleted}
        onchange={handleToggleShowCompleted}
        data-testid="show-completed-toggle"
      />
      <span>Show completed</span>
    </label>
  </header>

  <div class="todo-input-row">
    <input
      type="text"
      class="todo-input"
      placeholder="Add a todo..."
      bind:value={newTodoText}
      onkeydown={handleKeydown}
      data-testid="todo-input"
    />
    <button
      class="add-btn"
      onclick={handleAddTodo}
      disabled={!newTodoText.trim()}
      data-testid="add-todo-btn"
    >
      +
    </button>
  </div>

  <div class="todo-items" data-testid="todo-items">
    {#each getVisibleTodos() as todo (todo.id)}
      <div
        class="todo-item"
        class:completed={todo.status === 'complete'}
        data-testid="todo-item-{todo.id}"
      >
        {#if editingId === todo.id}
          <input
            type="text"
            class="todo-edit-input"
            bind:value={editingText}
            onkeydown={handleEditKeydown}
            onblur={saveEditing}
            data-testid="todo-edit-input"
          />
        {:else}
          <span
            class="todo-text"
            role="button"
            tabindex="0"
            ondblclick={() => startEditing(todo.id, todo.text)}
            title="Double-click to edit"
            data-testid="todo-text-{todo.id}"
          >
            {todo.text}
          </span>
        {/if}

        <select
          class="todo-status"
          value={todo.status}
          onchange={(e) => handleStatusChange(todo.id, e.currentTarget.value as TodoStatus)}
          data-testid="todo-status-{todo.id}"
        >
          {#each TODO_STATUS_ORDER as status}
            <option value={status}>{TODO_STATUS_LABELS[status]}</option>
          {/each}
        </select>

        <button
          class="delete-btn"
          onclick={() => handleDelete(todo.id)}
          title="Delete"
          data-testid="todo-delete-{todo.id}"
        >
          &times;
        </button>
      </div>
    {:else}
      <p class="empty-message" data-testid="empty-message">No todos yet</p>
    {/each}
  </div>
</div>

<style>
  .todo-list {
    height: 150px;
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--border-color, #444);
    background: var(--bg-secondary, #252526);
  }

  .todo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.5rem;
    flex-shrink: 0;
  }

  .todo-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted, #888);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .show-completed-toggle {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-muted, #888);
    cursor: pointer;
  }

  .show-completed-toggle input {
    cursor: pointer;
  }

  .todo-input-row {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    flex-shrink: 0;
  }

  .todo-input {
    flex: 1;
    padding: 0.25rem 0.5rem;
    background: var(--input-bg, #1e1e1e);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    color: var(--text-color, #fff);
    font-size: 0.75rem;
  }

  .todo-input:focus {
    outline: none;
    border-color: var(--accent-color, #0078d4);
  }

  .add-btn {
    background: var(--accent-color, #0078d4);
    border: none;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: bold;
  }

  .add-btn:hover:not(:disabled) {
    background: var(--accent-color-hover, #006cbd);
  }

  .add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .todo-items {
    flex: 1;
    overflow-y: auto;
    padding: 0.25rem 0.5rem;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
    border-radius: 4px;
  }

  .todo-item:hover {
    background: var(--hover-bg, #3a3a3a);
  }

  .todo-item:hover .delete-btn {
    opacity: 1;
  }

  .todo-item.completed .todo-text {
    text-decoration: line-through;
    color: var(--text-muted, #888);
  }

  .todo-text {
    flex: 1;
    font-size: 0.75rem;
    color: var(--text-color, #fff);
    cursor: pointer;
    padding: 0.125rem 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .todo-edit-input {
    flex: 1;
    padding: 0.125rem 0.25rem;
    background: var(--input-bg, #1e1e1e);
    border: 1px solid var(--accent-color, #0078d4);
    border-radius: 4px;
    color: var(--text-color, #fff);
    font-size: 0.75rem;
  }

  .todo-edit-input:focus {
    outline: none;
  }

  .todo-status {
    background: var(--input-bg, #1e1e1e);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    color: var(--text-color, #fff);
    font-size: 0.625rem;
    padding: 0.125rem 0.25rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  .todo-status:focus {
    outline: none;
    border-color: var(--accent-color, #0078d4);
  }

  .delete-btn {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    font-size: 1rem;
    cursor: pointer;
    padding: 0 0.25rem;
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }

  .delete-btn:hover {
    color: var(--error-color, #f44);
  }

  .empty-message {
    color: var(--text-muted, #666);
    font-size: 0.75rem;
    font-style: italic;
    margin: 0;
    text-align: center;
    padding: 1rem;
  }
</style>
