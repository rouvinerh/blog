import { createElement, useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { Link2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { remarkHeadingIds } from './markdown-headings.ts';
import type { ArticleSection } from './markdown-headings.ts';
import ArticleContents from './ArticleContents.tsx';
import './Markdown.css';

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
                        img: ({ src, alt, title }) => (
                            <img
                                src={src}
                                alt={alt ?? ''}
                                title={title}
                                loading="lazy"
                                decoding="async"
                            />
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}
