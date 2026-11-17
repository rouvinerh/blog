import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
    root,
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
});
after(() => server.close());

const { parseRoute, routePath, canonicalPath, isKnownPathname } = await server.ssrLoadModule('/src/routes.ts');

test('normal page URLs work directly and keep one canonical trailing slash', () => {
    for (const [input, page, expected] of [
        ['/', 'home', '/'],
        ['/index.html', 'home', '/'],
        ['/about', 'about', '/about/'],
        ['/blog/', 'blog', '/blog/'],
        ['/bugs', 'bugs', '/bugs/'],
    ]) {
        assert.equal(parseRoute(input)?.page, page);
        assert.equal(canonicalPath(input), expected);
        assert.equal(isKnownPathname(new URL(input, 'https://example.invalid').pathname), true);
    }
});

test('post links round-trip encoded filenames and native section fragments', () => {
    const routes = [
        { page: 'blog', slug: 'café notes', section: 'first steps' },
        { page: 'bugs', slug: 'UUID & IDOR', section: 'two-accounts' },
        { page: 'bugs', slug: 'a/b', section: 'request/response' },
    ];
    for (const route of routes) {
        assert.deepEqual(parseRoute(routePath(route)), route);
    }
    assert.equal(routePath(routes[0]), '/blog/caf%C3%A9%20notes/#first%20steps');
    assert.equal(routePath(routes[1]), '/bugs/UUID%20%26%20IDOR/#two-accounts');
});

test('old root hash links and aliases redirect to normal article URLs', () => {
    for (const [input, expected] of [
        ['/#home', '/'],
        ['/#about', '/about/'],
        ['/#writing', '/blog/'],
        ['/#blogs/old-post', '/blog/old-post/'],
        ['/#/bugs/uuidv1-idors?section=two-accounts', '/bugs/uuidv1-idors/#two-accounts'],
        ['/?ref=old#bug-reports/report?section=the%20IDs', '/bugs/report/?ref=old#the%20IDs'],
        ['/index.html#blog/old/path', '/blog/old%2Fpath/'],
    ]) {
        assert.equal(canonicalPath(input), expected);
    }
});

test('section queries become fragments while unrelated query values survive', () => {
    const canonical = canonicalPath('/bugs/report?section=summary&ref=a%20b&tag=one&tag=two');
    assert.equal(canonical, '/bugs/report/?ref=a+b&tag=one&tag=two#summary');
    assert.deepEqual(parseRoute(canonical), { page: 'bugs', slug: 'report', section: 'summary' });
    assert.equal(canonicalPath('/blog/post/?section=old&ref=shared#new'), '/blog/post/?ref=shared#new');
});

test('asset paths, unknown pages, and extra path segments are not page routes', () => {
    for (const input of ['/missing/', '/assets/app.js', '/about/extra/', '/bugs/post/extra/']) {
        assert.equal(parseRoute(input), undefined);
        assert.equal(canonicalPath(input), undefined);
        assert.equal(isKnownPathname(input), false);
    }
    assert.equal(parseRoute('/#about/extra'), undefined);
    assert.equal(parseRoute('http://['), undefined);
    assert.equal(canonicalPath('http://['), undefined);
});

test('malformed percent encoding stays a literal slug without crashing or changing it', () => {
    const slug = '%E0%A4%A';
    const route = parseRoute(`/bugs/${slug}/`);
    assert.deepEqual(route, { page: 'bugs', slug });
    assert.equal(routePath(route), '/bugs/%25E0%25A4%25A/');
    assert.deepEqual(parseRoute(routePath(route)), route);
});
