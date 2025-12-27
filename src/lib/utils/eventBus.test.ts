import { describe, it, expect, beforeEach, vi } from 'vitest';
import { on, emit, off, clear } from './eventBus';

describe('eventBus', () => {
  beforeEach(() => {
    clear();
  });

  describe('on/emit', () => {
    it('calls callback when event is emitted', () => {
      const callback = vi.fn();
      on('test', callback);
      emit('test', { foo: 'bar' });
      expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('supports multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      on('test', callback1);
      on('test', callback2);
      emit('test', 'data');
      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('does not call listeners for other events', () => {
      const callback = vi.fn();
      on('test', callback);
      emit('other', 'data');
      expect(callback).not.toHaveBeenCalled();
    });

    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = on('test', callback);
      unsubscribe();
      emit('test', 'data');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('removes specific listener', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      on('test', callback1);
      on('test', callback2);
      off('test', callback1);
      emit('test', 'data');
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('data');
    });
  });

  describe('clear', () => {
    it('removes all listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      on('test1', callback1);
      on('test2', callback2);
      clear();
      emit('test1', 'data');
      emit('test2', 'data');
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('typed events', () => {
    it('works with file:open event type', () => {
      const callback = vi.fn();
      on('file:open', callback);
      emit('file:open', { path: 'test.md', pane: 'left' });
      expect(callback).toHaveBeenCalledWith({ path: 'test.md', pane: 'left' });
    });
  });

  describe('error handling', () => {
    it('continues calling other listeners if one throws', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('test error');
      });
      const callback = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      on('test', errorCallback);
      on('test', callback);
      emit('test', 'data');

      expect(errorCallback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith('data');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
