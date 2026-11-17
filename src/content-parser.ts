import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import { getSections } from './markdown-headings.ts';
import type { ArticleSection } from './markdown-headings.ts';

export type PostKind = 'blog' | 'bugs';

export interface Post {
    kind: PostKind;
    slug: string;
    title: string;
    description?: string;
    status?: 'wip';
    /** Published posts have a positive order; unregistered WIP entries use zero. */
    publicationOrder: number;
    sections: ArticleSection[];
    /** Estimated minutes to read, 265 words a minute, from the words alone. */
    readingMinutes: number;
    content: string;
}

const WORDS_PER_MINUTE = 265;

interface MarkdownNode {
    type: string;
    value?: unknown;
    children?: MarkdownNode[];
}

/** Count words in text and code; images don't add time. */
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

/** A trailing "References" or "Sources" section is a link list, so it doesn't count as reading. */
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
    status?: 'wip';
    publicationOrder?: number;
}

export interface PublicationRegistration {
    catalogue: Record<string, unknown>;
    assignments: { key: string; publicationOrder: number }[];
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

function readPublicationOrder(
    details: Record<string, unknown>,
    key: string,
): number | undefined {
    const value = details.publicationOrder;
    if (value === undefined) return undefined;
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`${key}: publicationOrder must be a positive integer within JavaScript's safe range.`);
    }
    return value;
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
            status: details.status as 'wip' | undefined,
            publicationOrder: readPublicationOrder(details, key),
        });
    }
    return entries;
}

/** Assign an order once. Reading or editing an existing article does not republish it. */
export function registerPublications(
    files: Record<string, string>,
    catalogue: Record<string, unknown> = {},
): PublicationRegistration {
    const entries = visibleEntries(files, catalogue);
    let highestOrder = 0;
    for (const raw of Object.values(catalogue)) {
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue;
        const value = (raw as Record<string, unknown>).publicationOrder;
        if (typeof value === 'number' && Number.isSafeInteger(value) && value > highestOrder) {
            highestOrder = value;
        }
    }

    let updatedCatalogue = catalogue;
    const assignments: PublicationRegistration['assignments'] = [];
    for (const entry of entries.sort((left, right) => left.key.localeCompare(right.key))) {
        if (entry.status === 'wip' || entry.publicationOrder !== undefined) continue;
        if (highestOrder === Number.MAX_SAFE_INTEGER) {
            throw new Error(`${entry.key}: no safe publicationOrder remains after ${highestOrder}.`);
        }
        highestOrder += 1;
        if (assignments.length === 0) updatedCatalogue = { ...catalogue };
        updatedCatalogue[entry.key] = { ...entry.details, publicationOrder: highestOrder };
        assignments.push({ key: entry.key, publicationOrder: highestOrder });
    }
    return { catalogue: updatedCatalogue, assignments };
}

/** Markdown holds the writing. List details and publication order live in content/posts.json. */
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
            status: entry.status,
            publicationOrder: entry.publicationOrder ?? 0,
            sections: getSections(tree),
            readingMinutes: estimateReadingMinutes({
                ...tree,
                children: withoutReferences(tree.children),
            }),
            content,
        });
    }

    return posts.sort((left, right) => {
        const byPublication = right.publicationOrder - left.publicationOrder;
        if (byPublication) return byPublication;
        const rank = (post: Post) =>
            catalogueRank.get(`${post.kind}/${post.slug}`) ?? Number.MAX_SAFE_INTEGER;
        return rank(left) - rank(right) || left.slug.localeCompare(right.slug) || left.kind.localeCompare(right.kind);
    });
}
