import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
const siteUrl = 'https://rouvin.dev';
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

if (!template.includes('<!--app-html-->'))
    throw new Error('The HTML template is missing its app placeholder.');

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

try {
    const { default: App } = await server.ssrLoadModule('/src/App.tsx');
    const { default: Markdown } =
        await server.ssrLoadModule('/src/Markdown.tsx');
    const { getPosts } = await server.ssrLoadModule('/src/content.ts');
    const routes = [
        {
            path: '/',
            title: 'Rouvin Erh',
            description:
                "Rouvin Erh's blogs and bug reports. Tools, security engineering, and things I look into.",
        },
        {
            path: '/about/',
            title: 'About | Rouvin Erh',
            description:
                "I'm Rouvin, an offensive security engineer working in the Singapore government.",
        },
        {
            path: '/blog/',
            title: 'Blog | Rouvin Erh',
            description: 'Things I build, learn about, or think of',
        },
        {
            path: '/bugs/',
            title: 'Bugs | Rouvin Erh',
            description: 'Interesting issues I have come across',
        },
        ...['blog', 'bugs'].flatMap((kind) =>
            getPosts(kind).map((post) => ({
                path: `/${kind}/${encodeURIComponent(post.slug)}/`,
                title: `${post.title} | Rouvin Erh`,
                description: post.description ?? post.title,
                includeInSitemap: post.status !== 'wip',
            })),
        ),
    ];

    for (const route of routes) {
        const html = renderToString(
            createElement(App, {
                initialPath: route.path,
                MarkdownComponent: Markdown,
            }),
        );
        const page = template
            .replace('<!--app-html-->', () => html)
            .replace(
                /<title>.*?<\/title>/,
                () => `<title>${escape(route.title)}</title>`,
            )
            .replace(
                /<meta name="description" content="[^"]*"\s*\/>/,
                () =>
                    `<meta name="description" content="${escape(route.description)}" />`,
            )
            .replace(
                '</head>',
                () =>
                    `${styles}\n<link rel="canonical" href="${siteUrl}${route.path}" />\n</head>`,
            );
        const directory = join(
            output,
            ...route.path.split('/').filter(Boolean).map(decodeURIComponent),
        );
        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, 'index.html'), page, 'utf8');
    }

    const sitemapRoutes = routes.filter((route) => route.includeInSitemap !== false);
    const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...sitemapRoutes.map((route) => `    <url><loc>${escape(`${siteUrl}${route.path}`)}</loc></url>`),
        '</urlset>',
        '',
    ].join('\n');
    await writeFile(join(output, 'sitemap.xml'), sitemap, 'utf8');
    await writeFile(
        join(output, 'robots.txt'),
        `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
        'utf8',
    );
    await writeFile(join(output, '.nojekyll'), '');
    console.log(`Generated ${routes.length} HTML pages with normal URLs.`);
    console.log(`Generated a sitemap with ${sitemapRoutes.length} URLs and robots.txt.`);
} finally {
    await server.close();
}
