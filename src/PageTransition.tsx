import type { ReactNode } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';

interface PageTransitionProps {
  children: ReactNode;
  pageKey: string;
  direction: number;
  onEnter: () => void;
  onEntered: () => void;
}

export default function PageTransition({ children, pageKey, direction, onEnter, onEntered }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="page-stage">
      <LazyMotion features={domAnimation} strict>
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <m.div
            key={pageKey}
            custom={direction}
            initial="enter"
            animate="visible"
            exit="leave"
            onAnimationStart={definition => { if (definition === 'visible') onEnter(); }}
            onAnimationComplete={definition => { if (definition === 'visible') onEntered(); }}
            variants={{
              enter: (travel: number) => ({ opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : travel * 72 }),
              visible: { opacity: 1, x: 0, transition: { duration: reduceMotion ? 0 : .32, ease: [.22, 1, .36, 1] } },
              leave: (travel: number) => ({ opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : travel * -48, transition: { duration: reduceMotion ? 0 : .16, ease: [.4, 0, 1, 1] } }),
            }}
          >
            {children}
          </m.div>
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
