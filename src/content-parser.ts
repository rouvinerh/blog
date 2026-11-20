import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import { getSections } from './markdown-headings.ts';
import { byDate } from './post-order.ts';
import type { ArticleSection } from './markdown-headings.ts';

export type PostKind = 'blog' | 'bugs';

export interface Post {
    kind: PostKind;
    slug: string;
    title: string;
    description?: string;
    searchDescription?: string;
    status?: 'wip';
    date?: string;
    sections: ArticleSection[];
    readingMinutes: number;
    content: string;
}

const WORDS_PER_MINUTE = 265;

interface MarkdownNode {
    type: string;
    value?: unknown;
    children?: MarkdownNode[];
}

export function estimateReadingMinutes(tree: MarkdownNode): number {
    const text: string[] = [];
    const visit = (node: MarkdownNode) => {
        if (typeof node.value === 'string') text.push(node.value);
        node.children?.forEach(visit);
    };
    visit(tree);
    const words = text.join(' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function withoutReferences<T extends { type: string }>(children: T[]): T[] {
    const start = children.findIndex(
        (node) =>
            node.type === 'heading' &&
            (node as unknown as { depth: number }).depth === 2 &&
            /^(references|sources)$/i.test(toString(node).trim()),
    );
    return start === -1 ? children : children.slice(0, start);
}

interface ContentEntry {
    path: string;
    kind: PostKind;
    slug: string;
    key: string;
    details: Record<string, unknown>;
    description?: string;
    searchDescription?: string;
    status?: 'wip';
    date?: string;
}

export interface PublicationRegistration {
    catalogue: Record<string, unknown>;
    assignments: { key: string; date: string }[];
}

const parser = unified().use(remarkParse).use(remarkGfm);

function optionalText(
    details: Record<string, unknown>,
    key: string,
    path: string,
): string | undefined {
    const value = details[key];
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string')
        throw new Error(`${path}: ${key} must be text.`);
    return value.trim() || undefined;
}

function readDate(
    details: Record<string, unknown>,
    key: string,
): string | undefined {
    const value = details.date;
    if (value === undefined || value === null) return undefined;
    const day = typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
    const valid =
        typeof day === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(day) &&
        !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) &&
        new Date(`${day}T00:00:00Z`).toISOString().startsWith(day);
    if (!valid) throw new Error(`${key}: date must be a real date written as YYYY-MM-DD, or YYYY-MM for just the month.`);
    return value as string;
}

function today(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function visibleEntries(
    files: Record<string, string>,
    catalogue: Record<string, unknown>,
): ContentEntry[] {
    const entries: ContentEntry[] = [];
    for (const path of Object.keys(files)) {
        const match = /\/content\/(blog|bugs)\/([^/]+)\.md$/i.exec(
            path.replace(/\\/g, '/'),
        );
        if (!match || match[2].startsWith('_')) continue;

        const kind = match[1].toLowerCase() as PostKind;
        const slug = match[2];
        const key = `${kind}/${slug}`;
        const raw = catalogue[key] ?? {};
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
            throw new Error(`content/posts.json: ${key} must be an object.`);
        }
        const details = raw as Record<string, unknown>;
        if (details.draft !== undefined && typeof details.draft !== 'boolean') {
            throw new Error(`${key}: draft must be true or false.`);
        }
        if (details.draft === true) continue;
        if (details.status !== undefined && details.status !== 'wip') {
            throw new Error(`${key}: status must be wip, or leave it out.`);
        }
        entries.push({
            path,
            kind,
            slug,
            key,
            details,
            description: optionalText(details, 'description', key),
            searchDescription: optionalText(details, 'searchDescription', key),
            status: details.status as 'wip' | undefined,
            date: readDate(details, key),
        });
    }
    return entries;
}

export function registerPublications(
    files: Record<string, string>,
    catalogue: Record<string, unknown> = {},
    date: string = today(),
): PublicationRegistration {
    const entries = visibleEntries(files, catalogue);
    let updatedCatalogue = catalogue;
    const assignments: PublicationRegistration['assignments'] = [];
    for (const entry of entries.sort((left, right) => left.key.localeCompare(right.key))) {
        if (entry.status === 'wip' || entry.details.date !== undefined) continue;
        if (assignments.length === 0) updatedCatalogue = { ...catalogue };
        updatedCatalogue[entry.key] = { ...entry.details, date };
        assignments.push({ key: entry.key, date });
    }
    return { catalogue: updatedCatalogue, assignments };
}

export function createPostIndex(
    files: Record<string, string>,
    catalogue: Record<string, unknown> = {},
): Post[] {
    const posts: Post[] = [];
    const catalogueRank = new Map(Object.keys(catalogue).map((key, index) => [key, index]));

    for (const entry of visibleEntries(files, catalogue)) {
        let content = files[entry.path]
            .replace(/^\uFEFF/, '')
            .replace(/\r\n/g, '\n')
            .trim();
        let tree = parser.parse(content);
        const first = tree.children[0];
        const title =
            first?.type === 'heading' && first.depth === 1
                ? toString(first)
                : undefined;
        if (title && first.position?.end.offset !== undefined) {
            content = content.slice(first.position.end.offset).trim();
            tree = parser.parse(content);
        }
        const paragraph = tree.children.find(
            (node) =>
                node.type === 'paragraph' &&
                node.children.some((child) => child.type !== 'image'),
        );
        const preview = paragraph ? toString(paragraph).trim() : '';
        const description =
            preview.length > 180
                ? `${preview.slice(0, 177).replace(/\s+\S*$/, '')}...`
                : preview;
        const fallback = entry.slug.replace(/[-_]+/g, ' ');

        posts.push({
            kind: entry.kind,
            slug: entry.slug,
            title:
                title ??
                `${fallback.charAt(0).toUpperCase()}${fallback.slice(1)}`,
            description: entry.description ?? description,
            searchDescription: entry.searchDescription,
            status: entry.status,
            date: entry.date,
            sections: getSections(tree),
            readingMinutes: estimateReadingMinutes({
                ...tree,
                children: withoutReferences(tree.children),
            }),
            content,
        });
    }

    return posts.sort((left, right) => {
        const byPublication = byDate(left, right);
        if (byPublication) return byPublication;
        const rank = (post: Post) =>
            catalogueRank.get(`${post.kind}/${post.slug}`) ?? Number.MAX_SAFE_INTEGER;
        return rank(left) - rank(right) || left.slug.localeCompare(right.slug) || left.kind.localeCompare(right.kind);
    });
}
