import { useEffect, useState } from 'react';
import type { ArticleSection } from './markdown-headings.ts';
import './ArticleContents.css';

interface ArticleContentsProps {
    sections: ArticleSection[];
    path: string;
    section?: string;
}

export default function ArticleContents({
    sections,
    path,
    section,
}: ArticleContentsProps) {
    const [active, setActive] = useState(section ?? sections[0]?.id);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            let current = sections[0]?.id;
            for (const { id } of sections) {
                const heading = document.getElementById(id);
                if (heading && heading.getBoundingClientRect().top <= 120)
                    current = id;
            }
            const pageHeight = document.documentElement.scrollHeight;
            if (
                pageHeight > window.innerHeight &&
                window.scrollY + window.innerHeight >= pageHeight - 2
            ) {
                current = sections.at(-1)?.id ?? current;
            }
            setActive(current);
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        schedule();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            cancelAnimationFrame(frame);
        };
    }, [sections]);

    const links = () => (
        <ol>
            {sections.map(({ id, title, depth }) => (
                <li
                    key={id}
                    className={depth === 3 ? 'contents-subsection' : undefined}
                >
                    <a
                        href={`${path}#${encodeURIComponent(id)}`}
                        aria-current={active === id ? 'location' : undefined}
                    >
                        {title}
                    </a>
                </li>
            ))}
        </ol>
    );

    return (
        <>
            <aside className="contents-rail">
                <nav
                    className="article-contents"
                    aria-label="Table of contents"
                >
                    <h2>On this page</h2>
                    {links()}
                </nav>
            </aside>
            <details className="contents-mobile">
                <summary>On this page</summary>
                <nav
                    className="article-contents"
                    aria-label="Table of contents"
                    onClick={(event) => {
                        if (
                            event.target instanceof Element &&
                            event.target.closest('a')
                        ) {
                            event.currentTarget
                                .closest('details')
                                ?.removeAttribute('open');
                        }
                    }}
                >
                    {links()}
                </nav>
            </details>
        </>
    );
}
