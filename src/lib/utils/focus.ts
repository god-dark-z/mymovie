/**
 * Focus containment helpers for modal surfaces.
 *
 * `aria-modal="true"` is a promise to assistive technology that nothing outside
 * the dialog is reachable. Keeping the selector and the visibility filter in one
 * place means the sheet and the search overlay cannot drift apart on what
 * "focusable" means.
 */

export const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Tabbable descendants in DOM order.
 *
 * `offsetParent` filters out anything hidden by a breakpoint — the search
 * overlay's mobile-only back button, for instance, is in the markup at every
 * width but only tabbable on a handset.
 */
export function focusablesIn(node: HTMLElement | null): HTMLElement[] {
  if (!node) return [];
  return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null,
  );
}

/**
 * Wraps Tab and Shift+Tab at the edges of a container. Returns `true` when focus
 * was moved, so callers can skip their own handling.
 */
export function wrapTabFocus(event: React.KeyboardEvent, container: HTMLElement | null): boolean {
  const targets = focusablesIn(container);
  if (targets.length === 0) return false;

  const first = targets[0];
  const last = targets[targets.length - 1];
  const activeElement = document.activeElement;

  if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
    return true;
  }

  if (event.shiftKey && (activeElement === first || activeElement === container)) {
    event.preventDefault();
    last.focus();
    return true;
  }

  return false;
}
