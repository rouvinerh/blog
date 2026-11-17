import posts from 'virtual:published-posts';
import type { Post, PostKind } from './content-parser';

export type { Post, PostKind } from './content-parser';

export function getPosts(kind: PostKind): Post[] {
    return posts.filter((post) => post.kind === kind);
}

export function getPost(kind: PostKind, slug: string): Post | undefined {
    return posts.find((post) => post.kind === kind && post.slug === slug);
}

export function getLatestPosts(limit = 4): Post[] {
    return posts
        .filter((post) => post.status !== 'wip')
        .sort((left, right) => right.publicationOrder - left.publicationOrder)
        .slice(0, limit);
}
