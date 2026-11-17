import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

// Small local-pointer adaptation of React Bits Magnet, limited to three pixels.
// Source: https://reactbits.dev/animations/magnet
// https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Animations/Magnet/Magnet.tsx
// Copyright (c) 2026 David Haz. MIT + Commons Clause.
// The full applicable notice is retained in FadeContent.tsx.

export default function TinyMagnet({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotion.current = preference.matches;
      if (preference.matches && innerRef.current) innerRef.current.style.transform = '';
    };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  return (
    <span className="tiny-magnet" onPointerMove={event => {
      if (reducedMotion.current || event.pointerType !== 'mouse' || !innerRef.current) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.round(Math.max(-3, Math.min(3, (event.clientX - rect.left - rect.width / 2) / 8)));
      const y = Math.round(Math.max(-3, Math.min(3, (event.clientY - rect.top - rect.height / 2) / 8)));
      innerRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }} onPointerLeave={() => { if (innerRef.current) innerRef.current.style.transform = ''; }}>
      <span ref={innerRef} className="tiny-magnet-content">{children}</span>
    </span>
  );
}
