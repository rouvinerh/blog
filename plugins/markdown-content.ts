import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { normalizePath } from 'vite';
import type { Plugin } from 'vite';
import { createPostIndex, registerPublications } from '../src/content-parser';

const publicId = 'virtual:published-posts';
const resolvedId = `\0${publicId}`;

export function serializePublishedPosts(
    files: Record<string, string>,
    catalogue: Record<string, unknown> = {},
): string {
    return `export default ${JSON.stringify(createPostIndex(files, catalogue))};`;
}

function readMarkdownFiles(root: string): Record<string, string> {
    const files: Record<string, string> = {};
    for (const kind of ['blog', 'bugs']) {
        const directory = resolve(root, 'content', kind);
        if (!existsSync(directory)) continue;
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
            const path = join(directory, entry.name);
            files[normalizePath(path)] = readFileSync(path, 'utf8');
        }
    }
    return files;
}

export default function markdownContent(): Plugin {
    let root = '';

    const isContentFile = (file: string) =>
        /^content\/(?:(?:blog|bugs)\/[^/]+\.md|posts\.json)$/i.test(
            normalizePath(relative(root, file)),
        );

    return {
        name: 'published-markdown-content',
        configResolved(config) {
            root = config.root;
        },
        resolveId(id) {
            return id === publicId ? resolvedId : undefined;
        },
        load(id) {
            if (id !== resolvedId) return undefined;
            const files = readMarkdownFiles(root);
            for (const path of Object.keys(files)) this.addWatchFile(path);
            const cataloguePath = resolve(root, 'content', 'posts.json');
            this.addWatchFile(cataloguePath);
            const catalogue: unknown = existsSync(cataloguePath)
                ? JSON.parse(readFileSync(cataloguePath, 'utf8'))
                : {};
            if (
                typeof catalogue !== 'object' ||
                catalogue === null ||
                Array.isArray(catalogue)
            ) {
                throw new Error('content/posts.json must contain an object.');
            }
            const registration = registerPublications(files, catalogue as Record<string, unknown>);
            const source = serializePublishedPosts(files, registration.catalogue);
            if (registration.assignments.length > 0) {
                writeFileSync(cataloguePath, `${JSON.stringify(registration.catalogue, null, 4)}\n`, 'utf8');
            }
            return source;
        },
        configureServer(server) {
            server.watcher.add([
                resolve(root, 'content', 'blog'),
                resolve(root, 'content', 'bugs'),
                resolve(root, 'content', 'posts.json'),
            ]);
            server.watcher.on('all', (event, file) => {
                if (
                    !['add', 'change', 'unlink'].includes(event) ||
                    !isContentFile(file)
                )
                    return;
                const module = server.moduleGraph.getModuleById(resolvedId);
                if (module) server.moduleGraph.invalidateModule(module);
                server.ws.send({ type: 'full-reload', path: '*' });
            });
        },
    };
}
