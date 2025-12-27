/**
 * Event Bus - Simple pub/sub for app-wide communication
 *
 * Used for cross-component communication where prop drilling would be cumbersome.
 * Example: QuickFiles emitting "openFile" events that App.svelte handles.
 */

import type { ReindexEventData } from '$lib/stores/tags.svelte';

type EventCallback<T = unknown> = (data: T) => void;
type Unsubscribe = () => void;

interface EventBus {
  on<T = unknown>(event: string, callback: EventCallback<T>): Unsubscribe;
  emit<T = unknown>(event: string, data: T): void;
  off(event: string, callback: EventCallback): void;
  clear(): void;
}

/**
 * Known event types for type safety
 */
export interface AppEvents {
  'file:open': { path: string; pane?: 'left' | 'right'; openInNewTab?: boolean };
  'file:save': { pane: 'left' | 'right' };
  'file:created': { path: string };
  'file:renamed': { oldPath: string; newPath: string };
  'file:deleted': { path: string };
  'dailynote:open': { date: Date };
  'tree:refresh': void;
  'modal:open': { id: string };
  'modal:close': { id: string };
  'tags:reindex': ReindexEventData;
}

// Event listeners storage
const listeners = new Map<string, Set<EventCallback>>();

/**
 * Subscribe to an event
 * @returns Unsubscribe function
 */
export function on<K extends keyof AppEvents>(
  event: K,
  callback: EventCallback<AppEvents[K]>
): Unsubscribe;
export function on<T = unknown>(event: string, callback: EventCallback<T>): Unsubscribe;
export function on<T = unknown>(event: string, callback: EventCallback<T>): Unsubscribe {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback as EventCallback);

  // Return unsubscribe function
  return () => off(event, callback as EventCallback);
}

/**
 * Emit an event with data
 */
export function emit<K extends keyof AppEvents>(event: K, data: AppEvents[K]): void;
export function emit<T = unknown>(event: string, data: T): void;
export function emit<T = unknown>(event: string, data: T): void {
  const eventListeners = listeners.get(event);
  if (eventListeners) {
    eventListeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    });
  }
}

/**
 * Unsubscribe from an event
 */
export function off(event: string, callback: EventCallback): void {
  const eventListeners = listeners.get(event);
  if (eventListeners) {
    eventListeners.delete(callback);
    if (eventListeners.size === 0) {
      listeners.delete(event);
    }
  }
}

/**
 * Clear all listeners (useful for testing)
 */
export function clear(): void {
  listeners.clear();
}

/**
 * Event bus singleton with all methods
 */
export const eventBus: EventBus = {
  on,
  emit,
  off,
  clear,
};

export default eventBus;
