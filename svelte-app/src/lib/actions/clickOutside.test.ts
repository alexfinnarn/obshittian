import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clickOutside } from './clickOutside';
import type { ActionReturn } from 'svelte/action';

// Helper type for action return that we know has destroy/update
type ActionResult = NonNullable<ActionReturn<Parameters<typeof clickOutside>[1]>>;

describe('clickOutside action', () => {
  let container: HTMLDivElement;
  let targetElement: HTMLDivElement;
  let outsideElement: HTMLDivElement;
  let callback: () => void;

  beforeEach(() => {
    // Set up DOM structure
    container = document.createElement('div');
    targetElement = document.createElement('div');
    targetElement.setAttribute('data-testid', 'target');
    outsideElement = document.createElement('div');
    outsideElement.setAttribute('data-testid', 'outside');

    container.appendChild(targetElement);
    container.appendChild(outsideElement);
    document.body.appendChild(container);

    callback = vi.fn();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('calls callback when clicking outside element', () => {
    const action = clickOutside(targetElement, callback) as ActionResult;

    // Simulate click outside
    outsideElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(callback).toHaveBeenCalledTimes(1);

    action.destroy?.();
  });

  it('does not call callback when clicking inside element', () => {
    const action = clickOutside(targetElement, callback) as ActionResult;

    // Simulate click inside
    targetElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(callback).not.toHaveBeenCalled();

    action.destroy?.();
  });

  it('does not call callback when clicking on child of element', () => {
    const child = document.createElement('span');
    targetElement.appendChild(child);

    const action = clickOutside(targetElement, callback) as ActionResult;

    // Simulate click on child
    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(callback).not.toHaveBeenCalled();

    action.destroy?.();
  });

  it('supports options object with enabled flag', () => {
    const action = clickOutside(targetElement, { callback, enabled: false }) as ActionResult;

    // Click outside when disabled
    outsideElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(callback).not.toHaveBeenCalled();

    action.destroy?.();
  });

  it('update method changes options', () => {
    const action = clickOutside(targetElement, { callback, enabled: false }) as ActionResult;

    // Click when disabled
    outsideElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(callback).not.toHaveBeenCalled();

    // Enable via update
    action.update?.({ callback, enabled: true });

    // Click when enabled
    outsideElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(callback).toHaveBeenCalledTimes(1);

    action.destroy?.();
  });

  it('stops listening after destroy', () => {
    const action = clickOutside(targetElement, callback) as ActionResult;
    action.destroy?.();

    // Simulate click outside after destroy
    outsideElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(callback).not.toHaveBeenCalled();
  });
});
