'use client';
import { useEffect, useRef } from 'react';
const stack: HTMLElement[] = [];
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null), close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const node = ref.current;
    if (!open || !node) return;
    const previous = document.activeElement;
    stack.push(node);
    const focusable = () => [...node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter((el) => el.getClientRects().length > 0);
    (focusable()[0] ?? node).focus();
    const keydown = (event: KeyboardEvent) => {
      if (stack.at(-1) !== node) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key === 'Tab') {
        const controls = focusable(), index = controls.indexOf(document.activeElement as HTMLElement);
        if (!controls.length) { event.preventDefault(); node.focus(); }
        else if (event.shiftKey && index <= 0) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && (index === controls.length - 1 || index < 0)) { event.preventDefault(); controls[0].focus(); }
      }
    };
    const focusin = (event: FocusEvent) => { if (stack.at(-1) === node && !node.contains(event.target as Node)) (focusable()[0] ?? node).focus(); };
    document.addEventListener('keydown', keydown, true); document.addEventListener('focusin', focusin);
    return () => {
      stack.splice(stack.indexOf(node), 1); document.removeEventListener('keydown', keydown, true); document.removeEventListener('focusin', focusin);
      const target = previous instanceof HTMLElement && previous.isConnected && previous !== document.body && previous !== document.documentElement && !node.contains(previous) ? previous : document.querySelector<HTMLElement>('[data-dialog-return]');
      target?.focus();
    };
  }, [open]);
  return ref;
}
