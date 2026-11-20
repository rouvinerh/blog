import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { normalizePath } from 'vite';
import type { Plugin } from 'vite';

const publicId = 'virtual:image-sizes';
const resolvedId = `\0${publicId}`;

type Size = [width: number, height: number];

function svgSize(file: string): Size | undefined {
    const tag = /<svg\b[^>]*>/.exec(readFileSync(file, 'utf8'))?.[0] ?? '';
    const width = Number(/\swidth="([\d.]+)(?:px)?"/.exec(tag)?.[1]);
    const height = Number(/\sheight="([\d.]+)(?:px)?"/.exec(tag)?.[1]);
    return width > 0 && height > 0 ? [width, height] : undefined;
}

function pngSize(file: string): Size | undefined {
    const bytes = readFileSync(file);
    if (bytes.length < 24 || bytes.toString('latin1', 1, 4) !== 'PNG') return undefined;
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function imageFiles(directory: string): string[] {
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return imageFiles(path);
        return entry.isFile() && /\.(svg|png)$/.test(entry.name) ? [path] : [];
    });
}

export default function imageSizes(): Plugin {
    let publicDir = '';

    return {
        name: 'image-sizes',
        configResolved(config) {
            publicDir = config.publicDir;
        },
        resolveId(id) {
            return id === publicId ? resolvedId : undefined;
        },
        load(id) {
            if (id !== resolvedId) return undefined;
            const sizes: Record<string, Size> = {};
            for (const file of imageFiles(join(publicDir, 'images'))) {
                this.addWatchFile(file);
                const size = file.endsWith('.svg') ? svgSize(file) : pngSize(file);
                if (size) sizes[`/${normalizePath(relative(publicDir, file))}`] = size;
            }
            return `export default ${JSON.stringify(sizes)};`;
        },
    };
}
