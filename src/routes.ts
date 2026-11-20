export type Page = 'home' | 'about' | 'blog' | 'bugs';

export interface Route {
    page: Page;
    slug?: string;
    section?: string;
}

const base = 'https://rouvin.invalid';
const legacyPages: Record<string, Page> = {
    home: 'home',
    about: 'about',
    blog: 'blog',
    blogs: 'blog',
    writing: 'blog',
    bugs: 'bugs',
    'bug-reports': 'bugs',
};

function decode(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function fromPath(pathname: string): Route | undefined {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0 || pathname === '/index.html') {
        return { page: 'home' };
    }
    if (parts[0] === 'about' && parts.length === 1) {
        return { page: 'about' };
    }
    if (parts[0] !== 'blog' && parts[0] !== 'bugs') return undefined;
    if (parts.length === 1) return { page: parts[0] };
    if (parts.length !== 2) return undefined;
    return { page: parts[0], slug: decode(parts[1]) };
}

export function parseRoute(input: string): Route | undefined {
    let url: URL;
    try {
        url = new URL(input, base);
    } catch {
        return undefined;
    }

    const hash = url.hash.slice(1);
    const isRoot = url.pathname === '/' || url.pathname === '/index.html';
    if (isRoot && hash) {
        const [path, query = ''] = hash.replace(/^\//, '').split('?');
        const [rawPage, ...parts] = path.split('/');
        const page = Object.prototype.hasOwnProperty.call(legacyPages, rawPage)
            ? legacyPages[rawPage]
            : undefined;
        if (page) {
            const section = new URLSearchParams(query).get('section')
                ?? url.searchParams.get('section')
                ?? undefined;
            if (page === 'blog' || page === 'bugs') {
                const slug = parts.join('/').replace(/\/+$/, '');
                return slug
                    ? { page, slug: decode(slug), section }
                    : { page };
            }
            return parts.some(Boolean) ? undefined : { page };
        }
    }

    const route = fromPath(url.pathname);
    if (!route) return undefined;
    const section = hash
        ? decode(hash)
        : url.searchParams.get('section') ?? undefined;
    return section ? { ...route, section } : route;
}

export function routePath(route: Route): string {
    let path = route.page === 'home' ? '/' : `/${route.page}/`;
    if ((route.page === 'blog' || route.page === 'bugs') && route.slug) {
        path += `${encodeURIComponent(route.slug)}/`;
    }
    return route.section ? `${path}#${encodeURIComponent(route.section)}` : path;
}

export function canonicalPath(input: string): string | undefined {
    const route = parseRoute(input);
    if (!route) return undefined;
    const url = new URL(input, base);
    const query = new URLSearchParams(url.search);
    query.delete('section');
    const search = query.toString();
    const page = routePath({ ...route, section: undefined });
    const section = route.section ? `#${encodeURIComponent(route.section)}` : '';
    return `${page}${search ? `?${search}` : ''}${section}`;
}

export function isKnownPathname(pathname: string): boolean {
    return fromPath(pathname) !== undefined;
}
