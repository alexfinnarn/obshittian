/**
 * Test setup file for Vitest
 * Mocks browser APIs not available in happy-dom
 */

import { afterEach } from 'vitest';
import { clearAllBlocks } from './lib/stores/shortcuts.svelte';

// Clear shortcuts store between tests to prevent state leakage
afterEach(() => {
  clearAllBlocks();
});

// Mock Web Animations API for Svelte transitions
Element.prototype.animate = function () {
  const animation = {
    cancel: () => {},
    finish: () => {
      if (animation.onfinish) {
        animation.onfinish({ currentTime: 0, timelineTime: 0 } as unknown as AnimationPlaybackEvent);
      }
    },
    pause: () => {},
    play: () => {},
    reverse: () => {},
    onfinish: null as ((event: AnimationPlaybackEvent) => void) | null,
    oncancel: null,
    finished: Promise.resolve(),
    effect: null,
    playState: 'finished' as AnimationPlayState,
    pending: false,
    replaceState: 'active' as AnimationReplaceState,
    startTime: 0,
    currentTime: 0,
    playbackRate: 1,
    id: '',
    timeline: null,
    persist: () => {},
    commitStyles: () => {},
    updatePlaybackRate: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };

  // Immediately call onfinish in next tick to simulate instant animation
  queueMicrotask(() => {
    if (animation.onfinish) {
      animation.onfinish({ currentTime: 0, timelineTime: 0 } as unknown as AnimationPlaybackEvent);
    }
  });

  return animation as unknown as Animation;
};

// Mock alert for tests
globalThis.alert = () => {};

// Mock matchMedia for responsive queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});
