import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

// Local pointer light adapted from React Bits SpotlightCard.
// https://reactbits.dev/components/spotlight-card
// Copyright (c) 2026 David Haz. MIT + Commons Clause.
// The full applicable notice is retained in FadeContent.tsx.
export default function PathCard({ kind, delay, children }: { kind: 'blog' | 'bugs'; delay: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <a
      className="path-card"
      data-kind={kind}
      data-home-reveal
      data-home-delay={delay}
      href={`/${kind}/`}
      onPointerMove={event => {
        if (reduceMotion || event.pointerType !== 'mouse') return;
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
        event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
      }}
      onPointerLeave={event => {
        event.currentTarget.style.removeProperty('--pointer-x');
        event.currentTarget.style.removeProperty('--pointer-y');
      }}
    >
      {children}
    </a>
  );
}
