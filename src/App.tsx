import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, MouseEvent as ReactMouseEvent } from 'react';
import { ArrowLeft, ArrowUpRight, Info, Mail, Moon, Sun } from 'lucide-react';
import { GitHubIcon, LinkedInIcon } from './BrandIcons.tsx';
import PageTransition from './PageTransition.tsx';
import HomeEntrance from './HomeEntrance.tsx';
import PathCard from './PathCard.tsx';
import HelloText from './HelloText.tsx';
import { PixelCharacter, PixelScene } from './PixelCharacters.tsx';
import { getLatestPosts, getPost, getPosts } from './content.ts';
import type { Post } from './content.ts';
import About from './About.tsx';
import type { MarkdownProps } from './Markdown.tsx';
import { canonicalPath, isKnownPathname, parseRoute, routePath } from './routes.ts';
import type { Page, Route } from './routes.ts';

const LazyMarkdown = lazy(() => import('./Markdown.tsx'));

type Theme = 'light' | 'dark';
export interface AppProps {
    initialPath?: string;
    MarkdownComponent?: ComponentType<MarkdownProps>;
}

const themeKey = 'rouvin-theme-v2';
const pageNames: Record<Page, string> = {
    home: 'Home',
    about: 'About',
    blog: 'Blog',
    bugs: 'Bugs',
};

function browserPath(): string {
    return typeof window === 'undefined'
        ? '/'
        : `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function sameRoute(left: Route, right: Route): boolean {
    return left.page === right.page
        && left.slug === right.slug
        && left.section === right.section;
}

function setHistoryEntry(method: 'pushState' | 'replaceState', path: string, index: number) {
    const existing = window.history.state;
    window.history[method](
        {
            ...(existing && typeof existing === 'object' ? existing : {}),
            rouvinIndex: index,
        },
        '',
        path,
    );
}

function PostMeta({
    post,
    showKind = false,
}: {
    post: Post;
    showKind?: boolean;
}) {
    return (
        <div className="post-meta">
            {showKind && (
                <span className="post-kind">
                    {post.kind === 'bugs' ? 'Bug' : 'Blog'}
                </span>
            )}
            {post.status === 'wip' ? (
                <span className="post-status">Work in progress</span>
            ) : (
                <span className="post-reading-time">
                    {post.readingMinutes} min read
                </span>
            )}
        </div>
    );
}

function PostList({
    posts,
    showKind = false,
}: {
    posts: Post[];
    showKind?: boolean;
}) {
    return (
        <ul className="post-list">
            {posts.map((post) => (
                <li key={`${post.kind}/${post.slug}`}>
                    <article>
                        <a
                            className="post-link"
                            href={routePath({ page: post.kind, slug: post.slug })}
                            aria-labelledby={`post-${post.kind}-${post.slug}`}
                        >
                            <PostMeta post={post} showKind={showKind} />
                            <h3 id={`post-${post.kind}-${post.slug}`}>
                                {post.title}
                            </h3>
                            {post.description && <p>{post.description}</p>}
                        </a>
                    </article>
                </li>
            ))}
        </ul>
    );
}

function App({ initialPath, MarkdownComponent }: AppProps = {}) {
    const [{ route, direction }, setNavigation] = useState(() => ({
        route: parseRoute(initialPath ?? browserPath()) ?? { page: 'home' } as Route,
        direction: 1,
    }));
    const visibleRoute = useRef(route);
    const currentRoute = useRef(route);
    const restoreContentFocus = useRef(false);
    const lastLocation = useRef('');
    const historyIndex = useRef<number>(
        typeof window !== 'undefined' && typeof window.history.state?.rouvinIndex === 'number'
            ? window.history.state.rouvinIndex
            : 0,
    );
    const [theme, setTheme] = useState<Theme>(() =>
        typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
            ? 'light'
            : 'dark',
    );
    const kind =
        route.page === 'blog' || route.page === 'bugs' ? route.page : undefined;
    const post = kind && route.slug ? getPost(kind, route.slug) : undefined;
    const homePosts = getLatestPosts(4);
    const ArticleMarkdown = MarkdownComponent ?? LazyMarkdown;

    const navigate = useCallback((nextRoute: Route, nextIndex: number) => {
        const previousIndex = historyIndex.current;
        const sameDocument = nextRoute.page === currentRoute.current.page
            && nextRoute.slug === currentRoute.current.slug;
        const main = document.getElementById('main');
        if (sameDocument) restoreContentFocus.current = false;
        else if (main?.contains(document.activeElement)) restoreContentFocus.current = true;
        else if (document.activeElement !== document.body) restoreContentFocus.current = false;

        const pageOrder: Page[] = ['home', 'about', 'blog', 'bugs'];
        const difference = pageOrder.indexOf(nextRoute.page)
            - pageOrder.indexOf(visibleRoute.current.page);
        historyIndex.current = nextIndex;
        currentRoute.current = nextRoute;
        setNavigation(previous => ({
            route: nextRoute,
            direction: sameDocument
                ? previous.direction
                : difference === 0
                    ? Math.sign(nextIndex - previousIndex) || 1
                    : Math.sign(difference),
        }));
        if (!sameDocument) window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const initialLocation = browserPath();
        const initialRoute = parseRoute(initialLocation) ?? { page: 'home' } as Route;
        const initialCanonical = canonicalPath(initialLocation) ?? initialLocation;
        setHistoryEntry('replaceState', initialCanonical, historyIndex.current);
        lastLocation.current = initialCanonical;
        if (!sameRoute(initialRoute, currentRoute.current)) {
            navigate(initialRoute, historyIndex.current);
        }

        const changePage = () => {
            const location = browserPath();
            const storedIndex = window.history.state?.rouvinIndex;
            if (location === lastLocation.current && storedIndex === historyIndex.current) return;
            const nextIndex = typeof storedIndex === 'number' && storedIndex !== historyIndex.current
                ? storedIndex
                : historyIndex.current + 1;
            const nextRoute = parseRoute(location) ?? { page: 'home' } as Route;
            const canonical = canonicalPath(location) ?? location;
            setHistoryEntry('replaceState', canonical, nextIndex);
            lastLocation.current = canonical;
            navigate(nextRoute, nextIndex);
        };
        window.addEventListener('popstate', changePage);
        window.addEventListener('hashchange', changePage);
        return () => {
            window.removeEventListener('popstate', changePage);
            window.removeEventListener('hashchange', changePage);
        };
    }, [navigate]);

    const handleSiteClick = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey
            || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = event.target instanceof Element
            ? event.target.closest('a[href]')
            : null;
        if (!(anchor instanceof HTMLAnchorElement)
            || anchor.hasAttribute('target') || anchor.hasAttribute('download')) return;

        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin || !isKnownPathname(url.pathname)) return;
        const location = `${url.pathname}${url.search}${url.hash}`;
        const nextRoute = parseRoute(location);
        const canonical = canonicalPath(location);
        if (!nextRoute || !canonical) return;
        event.preventDefault();
        const currentCanonical = canonicalPath(browserPath()) ?? browserPath();
        if (canonical === currentCanonical) {
            if (nextRoute.section) {
                const heading = document.getElementById(nextRoute.section);
                const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                heading?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
                heading?.focus({ preventScroll: true });
            }
            return;
        }
        const nextIndex = historyIndex.current + 1;
        setHistoryEntry('pushState', canonical, nextIndex);
        lastLocation.current = canonical;
        navigate(nextRoute, nextIndex);
    };

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document
            .querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', theme === 'dark' ? '#0f171e' : '#fafbfc');
        try {
            localStorage.setItem(themeKey, theme);
        } catch {
            return;
        }
    }, [theme]);

    useEffect(() => {
        const title = route.slug
            ? (post?.title ?? 'Post not found')
            : pageNames[route.page];
        document.title =
            route.page === 'home' ? 'Rouvin Erh' : `${title} | Rouvin Erh`;
    }, [route, post]);

    return (
        <div className={`site${post ? ' site--article' : kind && !route.slug ? ' site--listing' : ''}`} onClick={handleSiteClick}>
            <a
                className="skip-link"
                href="#main"
                onClick={(event) => {
                    event.preventDefault();
                    document.getElementById('main')?.focus();
                }}
            >
                Skip to content
            </a>

            <header className="site-header">
                <nav className="main-nav" aria-label="Main navigation">
                    {(['home', 'about', 'blog', 'bugs'] as const).map(
                        (page) => (
                            <a
                                key={page}
                                href={routePath({ page })}
                                aria-current={
                                    route.page === page ? 'page' : undefined
                                }
                            >
                                {pageNames[page]}
                            </a>
                        ),
                    )}
                </nav>
                <div className="header-controls">
                    <a
                        className="icon-control"
                        href="https://github.com/rouvinerh"
                        aria-label="GitHub"
                        title="GitHub"
                    >
                        <GitHubIcon />
                    </a>
                    <a
                        className="icon-control"
                        href="https://linkedin.com/in/rouvinerh"
                        aria-label="LinkedIn"
                        title="LinkedIn"
                    >
                        <LinkedInIcon />
                    </a>
                    <span className="control-divider" aria-hidden="true" />
                    <button
                        className="icon-control theme-toggle"
                        type="button"
                        onClick={() =>
                            setTheme(theme === 'light' ? 'dark' : 'light')
                        }
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                    >
                        {theme === 'light' ? (
                            <Moon size={18} strokeWidth={1.7} />
                        ) : (
                            <Sun size={18} strokeWidth={1.7} />
                        )}
                    </button>
                </div>
            </header>

            <PageTransition
                pageKey={`${route.page}/${route.slug ?? ''}`}
                direction={direction}
                onEnter={() => {
                    visibleRoute.current = route;
                }}
                onEntered={() => {
                    if (restoreContentFocus.current)
                        document
                            .getElementById('main')
                            ?.focus({ preventScroll: true });
                    restoreContentFocus.current = false;
                }}
            >
                <main id="main" tabIndex={-1}>
                    {route.page === 'home' && (
                        <HomeEntrance>
                            <section
                                className="home-intro"
                                aria-labelledby="home-title"
                            >
                                <div className="home-heading">
                                    <HelloText id="home-title" />
                                    <span
                                        className="home-character"
                                        data-home-reveal
                                        data-home-delay="80"
                                    >
                                        <PixelCharacter
                                            kind="human"
                                            size={54}
                                            className="pixel-greeting"
                                        />
                                    </span>
                                </div>
                                <p data-home-reveal data-home-delay="70">
                                    I work in security, and like to find bugs and
                                    build tools to find more bugs.
                                </p>
                                <p data-home-reveal data-home-delay="100">
                                    Sometimes I write blogs here about what I feel is interesting.
                                </p>
                            </section>

                            <div className="home-paths">
                                <PathCard kind="blog" delay={120}>
                                    <div className="path-card-top">
                                        <h2>
                                            Blog{' '}
                                            <ArrowUpRight
                                                size={18}
                                                strokeWidth={1.6}
                                            />
                                        </h2>
                                        <PixelScene variant="blog" />
                                    </div>
                                    <p>
                                        Things I build, learn about, or think of
                                    </p>
                                </PathCard>
                                <PathCard kind="bugs" delay={180}>
                                    <div className="path-card-top">
                                        <h2>
                                            Bugs{' '}
                                            <ArrowUpRight
                                                size={18}
                                                strokeWidth={1.6}
                                            />
                                        </h2>
                                        <PixelScene variant="bugs" />
                                    </div>
                                    <p>Interesting issues I have come across</p>
                                </PathCard>
                            </div>

                            {homePosts.length > 0 && (
                                <section
                                    className="recent-writing"
                                    aria-labelledby="recent-title"
                                    data-home-reveal
                                    data-home-delay="220"
                                >
                                    <h2 id="recent-title">Latest</h2>
                                    <PostList posts={homePosts} showKind />
                                </section>
                            )}

                            <aside
                                className="home-note"
                                data-home-reveal
                                data-home-delay="260"
                            >
                                <Info size={17} strokeWidth={1.8} aria-hidden="true" />
                                <p>
                                    My old CTF writeups and course reviews are still in my{' '}
                                    <a href="https://rouvin.gitbook.io/ibreakstuff/">GitBook</a>.
                                </p>
                            </aside>
                        </HomeEntrance>
                    )}

                    {kind && !route.slug && (
                        <>
                            <div className="page-heading">
                                <div>
                                    <h1>{pageNames[kind]}</h1>
                                </div>
                                <PixelScene variant={kind} />
                            </div>
                            {getPosts(kind).length > 0 ? (
                                <PostList posts={getPosts(kind)} />
                            ) : (
                                <div className="empty-state">
                                    <p>
                                        {kind === 'blog'
                                            ? "No posts yet. I'll put them here when they're ready."
                                            : "No reports here yet. I'll add them when they're ready."}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {kind &&
                        route.slug &&
                        (post ? (
                            <article
                                className={`article article--${kind}${post.status === 'wip' ? ' article--wip' : ''}`}
                            >
                                <a className="back-link" href={routePath({ page: kind })}>
                                    <ArrowLeft size={15} /> Back to{' '}
                                    {pageNames[kind]}
                                </a>
                                <header className="article-heading">
                                    <PostMeta post={post} />
                                    <h1>{post.title}</h1>
                                    {post.description && (
                                        <p className="article-description">
                                            {post.description}
                                        </p>
                                    )}
                                </header>
                                <Suspense
                                    fallback={
                                        <p className="muted">Loading...</p>
                                    }
                                >
                                    <ArticleMarkdown
                                        content={post.content}
                                        sections={post.sections}
                                        path={routePath({ page: kind, slug: post.slug })}
                                        section={route.section}
                                    />
                                </Suspense>
                            </article>
                        ) : (
                            <div className="not-found">
                                <h1>Couldn't find that post.</h1>
                                <p>
                                    The link might be old, or the post may have
                                    moved.
                                </p>
                                <a className="back-link" href={routePath({ page: kind })}>
                                    <ArrowLeft size={15} /> Back to{' '}
                                    {pageNames[kind]}
                                </a>
                            </div>
                        ))}

                    {route.page === 'about' && <About />}
                </main>
            </PageTransition>

            <footer className="site-footer">
                <span>&copy; {new Date().getFullYear()} Rouvin Erh</span>
                <a href="mailto:erhrouvin@gmail.com">
                    <Mail size={14} strokeWidth={1.7} /> Email
                </a>
            </footer>
        </div>
    );
}

export default App;
