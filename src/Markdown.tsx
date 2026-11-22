import { createElement, useEffect, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { Link2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import imageSizes from 'virtual:image-sizes';
import { remarkHeadingIds } from './markdown-headings.ts';
import type { ArticleSection } from './markdown-headings.ts';
import ArticleContents from './ArticleContents.tsx';
import './Markdown.css';

type MarkdownImageProps = Pick<ComponentPropsWithoutRef<'img'>, 'src' | 'alt' | 'title'>;

function MarkdownImage({ src, alt = '', title }: MarkdownImageProps) {
    const figure = useRef<HTMLSpanElement>(null);
    const [animate, setAnimate] = useState(false);
    const base = typeof src === 'string' && /^\/images\/.+\.svg$/.test(src)
        ? src.slice(0, -4)
        : undefined;
    const hasStill = !!base && !!imageSizes[`${base}-still.svg`];

    useEffect(() => {
        if (!hasStill || !figure.current || !('IntersectionObserver' in window)) return;

        const preference = window.matchMedia('(prefers-reduced-motion: no-preference)');
        let visible = false;
        const syncMotion = () => setAnimate(visible && preference.matches);
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            syncMotion();
        });

        observer.observe(figure.current);
        preference.addEventListener('change', syncMotion);
        return () => {
            observer.disconnect();
            preference.removeEventListener('change', syncMotion);
        };
    }, [hasStill]);

    const [width, height] = (src && imageSizes[src]) || [];
    if (!base) {
        return <img src={src} alt={alt} title={title} width={width} height={height} loading="lazy" decoding="async" />;
    }

    const still = hasStill && !animate ? '-still' : '';
    const [mobileWidth, mobileHeight] = imageSizes[`${base}-mobile.svg`] ?? [];
    return (
        <span className="themed-img" data-scroll-animation={hasStill || undefined} ref={figure}>
            {(['light', 'dark'] as const).map((theme) => (
                <picture key={theme} className={`themed-img-${theme}`}>
                    {mobileWidth && mobileHeight && (
                        <source
                            media="(max-width: 680px)"
                            srcSet={`${base}-mobile${still}.${theme}.svg`}
                            width={mobileWidth}
                            height={mobileHeight}
                        />
                    )}
                    <img
                        src={`${base}${still}.${theme}.svg`}
                        alt={alt}
                        title={title}
                        width={width}
                        height={height}
                        loading="lazy"
                        decoding="async"
                    />
                </picture>
            ))}
        </span>
    );
}

export interface MarkdownProps {
    content: string;
    sections?: ArticleSection[];
    path?: string;
    section?: string;
}

export default function Markdown({
    content,
    sections = [],
    path = '',
    section,
}: MarkdownProps) {
    const body = useRef<HTMLDivElement>(null);

    const heading =
        (level: 'h2' | 'h3' | 'h4') =>
        ({ children, id, ...props }: ComponentPropsWithoutRef<'h2'>) =>
            createElement(
                level,
                { id, ...props },
                children,
                id && (
                    <a
                        className="heading-anchor"
                        href={`${path}#${encodeURIComponent(id)}`}
                        aria-label="Link to this section"
                    >
                        <Link2 size={16} strokeWidth={2} aria-hidden="true" />
                    </a>
                ),
            );

    useEffect(() => {
        if (!section || !sections.some(({ id }) => id === section)) return;
        const frame = requestAnimationFrame(() => {
            const heading = document.getElementById(section);
            if (!heading || !body.current?.contains(heading)) return;
            const reducedMotion = window.matchMedia(
                '(prefers-reduced-motion: reduce)',
            ).matches;
            heading.scrollIntoView({
                block: 'start',
                behavior: reducedMotion ? 'auto' : 'smooth',
            });
            heading.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(frame);
    }, [section, sections]);

    return (
        <div className="article-body" ref={body}>
            {sections.length > 1 && (
                <ArticleContents
                    sections={sections}
                    path={path}
                    section={section}
                />
            )}
            <div className="markdown markdown-content">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkHeadingIds]}
                    rehypePlugins={[
                        [
                            rehypeHighlight,
                            { detect: false, plainText: ['text', 'plaintext'] },
                        ],
                    ]}
                    skipHtml
                    components={{
                        h2: heading('h2'),
                        h3: heading('h3'),
                        h4: heading('h4'),
                        table: ({ children }) => (
                            <div className="markdown-table-wrap">
                                <table>{children}</table>
                            </div>
                        ),
                        img: MarkdownImage,
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}
