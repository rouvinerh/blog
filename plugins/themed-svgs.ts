import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';

type Theme = 'light' | 'dark';

const darkQuery = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g;
const variantPath = /^\/images\/(.+)\.(light|dark)\.svg$/;

export function themedSvg(source: string, theme: Theme): string {
    return source
        .replace(darkQuery, theme === 'dark' ? '@media all' : '@media not all')
        .replace(/color-scheme:\s*light dark;/, `color-scheme: ${theme};`);
}

function svgFiles(directory: string): string[] {
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return svgFiles(path);
        return entry.isFile() && entry.name.endsWith('.svg') ? [path] : [];
    });
}

export default function themedSvgs(): Plugin {
    let publicDir = '';
    let outDir = '';

    return {
        name: 'themed-svgs',
        configResolved(config) {
            publicDir = config.publicDir;
            outDir = resolve(config.root, config.build.outDir);
        },
        configureServer(server) {
            server.middlewares.use((request, response, next) => {
                const match = variantPath.exec((request.url ?? '').split('?')[0]);
                const images = resolve(publicDir, 'images');
                const source = match && resolve(images, `${match[1]}.svg`);
                if (!match || !source || !source.startsWith(images + sep) || !existsSync(source)) return next();
                response.setHeader('Content-Type', 'image/svg+xml');
                response.setHeader('Cache-Control', 'no-cache');
                response.end(themedSvg(readFileSync(source, 'utf8'), match[2] as Theme));
            });
        },
        closeBundle() {
            const images = join(publicDir, 'images');
            for (const file of svgFiles(images)) {
                const source = readFileSync(file, 'utf8');
                const target = join(outDir, 'images', relative(images, file)).replace(/\.svg$/, '');
                mkdirSync(dirname(target), { recursive: true });
                for (const theme of ['light', 'dark'] as const) {
                    writeFileSync(`${target}.${theme}.svg`, themedSvg(source, theme));
                }
            }
        },
    };
}
