import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export default function HomeEntrance({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = root.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!element || preference.matches || typeof element.animate !== 'function') return;

    const animations: Animation[] = [];
    const reveal = (target: HTMLElement, delay: number, isWord = false) => {
      animations.push(target.animate([
        { opacity: 0, transform: 'translateY(8px)', ...(isWord ? { filter: 'blur(2px)' } : {}) },
        { opacity: 1, transform: 'translateY(0)', ...(isWord ? { filter: 'blur(0px)' } : {}) },
      ], { duration: 360, delay, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' }));
    };

    try {
      element.querySelectorAll<HTMLElement>('[data-hello-word]').forEach((word, index) => reveal(word, index * 35, true));
      element.querySelectorAll<HTMLElement>('[data-home-reveal]').forEach(block => reveal(block, Number(block.dataset.homeDelay) || 0));
    } catch {
      animations.forEach(animation => animation.cancel());
      return;
    }

    const cancelForPreference = () => { if (preference.matches) animations.forEach(animation => animation.cancel()); };
    preference.addEventListener('change', cancelForPreference);
    return () => {
      animations.forEach(animation => animation.cancel());
      preference.removeEventListener('change', cancelForPreference);
    };
  }, []);

  return <div ref={root} className="home-content">{children}</div>;
}
