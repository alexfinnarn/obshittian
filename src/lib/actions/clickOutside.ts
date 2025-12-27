/**
 * Click Outside Action - Svelte action for detecting clicks outside an element
 *
 * Usage:
 * <div use:clickOutside={handleClickOutside}>...</div>
 * <div use:clickOutside={{ callback: handleClickOutside, enabled: true }}>...</div>
 */

import type { Action } from 'svelte/action';

export interface ClickOutsideOptions {
  callback: () => void;
  enabled?: boolean;
}

type ClickOutsideParameter = (() => void) | ClickOutsideOptions;

/**
 * Svelte action for detecting clicks outside an element
 */
export const clickOutside: Action<HTMLElement, ClickOutsideParameter> = (
  node: HTMLElement,
  parameter: ClickOutsideParameter
) => {
  const getOptions = (param: ClickOutsideParameter): ClickOutsideOptions => {
    if (typeof param === 'function') {
      return { callback: param, enabled: true };
    }
    return { enabled: true, ...param };
  };

  let options = getOptions(parameter);

  const handleClick = (event: MouseEvent) => {
    if (!options.enabled) return;

    // Check if click is outside the node
    if (node && !node.contains(event.target as Node)) {
      options.callback();
    }
  };

  // Use capture phase to detect clicks before they bubble
  document.addEventListener('click', handleClick, true);

  return {
    update(newParameter: ClickOutsideParameter) {
      options = getOptions(newParameter);
    },
    destroy() {
      document.removeEventListener('click', handleClick, true);
    },
  };
};

export default clickOutside;
