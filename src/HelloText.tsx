import { Fragment } from 'react';
import './HelloText.css';

/*
 * Small Web Animations adaptation of React Bits' homepage lh-rise entrance,
 * with the per-word timing used by its BlurText component.
 * Sources:
 * https://github.com/DavidHDev/react-bits/blob/main/src/components/landingnew/Hero/HeroFrame.css
 * https://reactbits.dev/text-animations/blur-text
 *
 * MIT + Commons Clause License Condition v1.0
 * Copyright (c) 2026 David Haz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, and distribute the Software as part of
 * an application, website, or product, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * Commons Clause Restriction
 * You may use this Software, including for any commercial purpose, so long as
 * you do not sell, sublicense, or redistribute the components themselves,
 * whether alone, in a bundle, or as a ported version.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

interface HelloTextProps {
  id?: string;
  text?: string;
  className?: string;
}

export default function HelloText({ id, text = "Hello, I'm Rouvin", className = '' }: HelloTextProps) {
  const words = text.split(' ');

  return (
    <h1 id={id} className={`hello-text ${className}`} aria-label={text}>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <Fragment key={`${index}-${word}`}>
            <span className="hello-text__word" data-hello-word>{word}</span>
            {index < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </h1>
  );
}
