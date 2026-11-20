import { existsSync } from 'node:fs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
const siteUrl = 'https://rouvin.dev';
const siteName = 'Rouvin Erh';
const siteDescription = 'Security engineering and things I find interesting';
const author = {
    '@type': 'Person',
    name: siteName,
    url: `${siteUrl}/`,
    sameAs: ['https://github.com/rouvinerh', 'https://linkedin.com/in/rouvinerh'],
};
const shareImage = existsSync(join(root, 'public', 'og.png'))
    ? `${siteUrl}/og.png`
    : undefined;
const template = await readFile(join(output, 'index.html'), 'utf8');
const manifest = JSON.parse(
    await readFile(join(output, '.vite/manifest.json'), 'utf8'),
);
const styles = [
    ...new Set(Object.values(manifest).flatMap((entry) => entry.css ?? [])),
]
    .filter((path) => !template.includes(`href="/${path}"`))
    .map((path) => `<link rel="stylesheet" href="/${path}" />`)
    .join('\n');
const chunkFiles = (key, files = new Set()) => {
    const chunk = manifest[key];
    if (!chunk || files.has(chunk.file)) return files;
    files.add(chunk.file);
    for (const dependency of chunk.imports ?? []) chunkFiles(dependency, files);
    return files;
};
const entryFiles = chunkFiles(
    Object.keys(manifest).find((key) => manifest[key].isEntry),
);
const articlePreloads = [...chunkFiles('src/Markdown.tsx')]
    .filter((file) => !entryFiles.has(file))
    .map((file) => `<link rel="modulepreload" crossorigin href="/${file}" />`);
const descriptionTag = /<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/;

if (!template.includes('<!--app-html-->'))
    throw new Error('The HTML template is missing its app placeholder.');
if (!descriptionTag.test(template))
    throw new Error('The HTML template is missing its description tag.');

const server = await createServer({
    root,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
});
const escape = (text) =>
    text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
const meta = (attribute, name, content) =>
    content ? `<meta ${attribute}="${name}" content="${escape(content)}" />` : '';
const structuredData = (data) =>
    `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        ...data,
    }).replaceAll('<', '\\u003c')}</script>`;
const feedDate = (date) =>
    new Date(`${date.length === 7 ? `${date}-01` : date}T00:00:00Z`).toUTCString();

try {
    const { default: App } = await server.ssrLoadModule('/src/App.tsx');
    const { default: Markdown } =
        await server.ssrLoadModule('/src/Markdown.tsx');
    const { getPosts, pageDescriptions } =
        await server.ssrLoadModule('/src/content.ts');
    const published = (kind) =>
        getPosts(kind).filter((post) => post.status !== 'wip');
    const latest = (posts) =>
        posts.map((post) => post.date).filter(Boolean).sort().at(-1);
    const routes = [
        {
            path: '/',
            title: siteName,
            description: siteDescription,
            updated: latest([...published('blog'), ...published('bugs')]),
            data: { '@type': 'WebSite', name: siteName, url: `${siteUrl}/`, author },
        },
        {
            path: '/about/',
            title: 'About',
            description:
                "I'm Rouvin, an offensive security engineer working in the Singapore government.",
            data: { '@type': 'ProfilePage', mainEntity: author },
        },
        ...['blog', 'bugs'].map((kind) => ({
            path: `/${kind}/`,
            title: kind === 'blog' ? 'Blog' : 'Bugs',
            description: pageDescriptions[kind],
            updated: latest(published(kind)),
        })),
        ...['blog', 'bugs'].flatMap((kind) =>
            getPosts(kind).map((post) => {
                const path = `/${kind}/${encodeURIComponent(post.slug)}/`;
                const description =
                    post.searchDescription ?? post.description ?? post.title;
                return {
                    path,
                    title: post.title,
                    description,
                    article: true,
                    published: post.date,
                    updated: post.date,
                    noIndex: post.status === 'wip',
                    data: {
                        '@type': 'BlogPosting',
                        headline: post.title,
                        description,
                        url: `${siteUrl}${path}`,
                        mainEntityOfPage: `${siteUrl}${path}`,
                        datePublished: post.date,
                        author,
                    },
                };
            }),
        ),
        {
            path: '/404.html',
            title: 'Page not found',
            description: "Couldn't find that page",
            noIndex: true,
            missing: true,
        },
    ];

    for (const route of routes) {
        const html = renderToString(
            createElement(App, {
                initialPath: route.path,
                MarkdownComponent: Markdown,
            }),
        );
        const url = `${siteUrl}${route.path}`;
        const title =
            route.path === '/' ? siteName : `${route.title} | ${siteName}`;
        const metadata = [
            styles,
            ...(route.article ? articlePreloads : []),
            route.noIndex ? '<meta name="robots" content="noindex" />' : '',
            ...(route.missing
                ? []
                : [
                      `<link rel="canonical" href="${url}" />`,
                      meta('property', 'og:site_name', siteName),
                      meta('property', 'og:type', route.article ? 'article' : 'website'),
                      meta('property', 'og:title', route.title),
                      meta('property', 'og:description', route.description),
                      meta('property', 'og:url', url),
                      meta('property', 'og:image', shareImage),
                      meta('property', 'article:published_time', route.published),
                      meta('name', 'twitter:card', shareImage ? 'summary_large_image' : 'summary'),
                      route.data ? structuredData(route.data) : '',
                  ]),
        ].filter(Boolean).join('\n');
        const page = template
            .replace(
                /<title>.*?<\/title>/,
                () => `<title>${escape(title)}</title>`,
            )
            .replace(
                descriptionTag,
                () =>
                    `<meta name="description" content="${escape(route.description)}" />`,
            )
            .replace('</head>', () => `${metadata}\n</head>`)
            .replace('<!--app-html-->', () => html);
        const file = route.path.endsWith('.html')
            ? join(output, route.path)
            : join(
                  output,
                  ...route.path.split('/').filter(Boolean).map(decodeURIComponent),
                  'index.html',
              );
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, page, 'utf8');
    }

    const sitemapRoutes = routes.filter((route) => !route.noIndex);
    const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...sitemapRoutes.map(
            (route) =>
                `    <url><loc>${escape(`${siteUrl}${route.path}`)}</loc>${
                    route.updated ? `<lastmod>${route.updated}</lastmod>` : ''
                }</url>`,
        ),
        '</urlset>',
        '',
    ].join('\n');
    await writeFile(join(output, 'sitemap.xml'), sitemap, 'utf8');

    const feedRoutes = sitemapRoutes
        .filter((route) => route.article)
        .sort((left, right) =>
            (right.published ?? '').localeCompare(left.published ?? ''),
        );
    const feed = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '    <channel>',
        `        <title>${escape(siteName)}</title>`,
        `        <link>${siteUrl}/</link>`,
        `        <description>${escape(siteDescription)}</description>`,
        '        <language>en</language>',
        `        <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />`,
        ...feedRoutes.flatMap((route) => [
            '        <item>',
            `            <title>${escape(route.title)}</title>`,
            `            <link>${escape(`${siteUrl}${route.path}`)}</link>`,
            `            <guid>${escape(`${siteUrl}${route.path}`)}</guid>`,
            ...(route.published
                ? [`            <pubDate>${feedDate(route.published)}</pubDate>`]
                : []),
            `            <description>${escape(route.description)}</description>`,
            '        </item>',
        ]),
        '    </channel>',
        '</rss>',
        '',
    ].join('\n');
    await writeFile(join(output, 'feed.xml'), feed, 'utf8');

    await writeFile(
        join(output, 'robots.txt'),
        `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
        'utf8',
    );
    await writeFile(join(output, '.nojekyll'), '');
    console.log(`Generated ${routes.length} HTML pages with normal URLs.`);
    console.log(
        `Generated a sitemap with ${sitemapRoutes.length} URLs, a feed with ${feedRoutes.length} posts and robots.txt.`,
    );
} finally {
    await server.close();
}
