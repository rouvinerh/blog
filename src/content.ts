import posts from 'virtual:published-posts';
import { byDate } from './post-order';
import type { Post, PostKind } from './content-parser';

export type { Post, PostKind } from './content-parser';

export const pageDescriptions: Record<PostKind, string> = {
    blog: 'Writing down my thought process for the things I build or test',
    bugs: "Cool bugs I've found while testing other people's applications",
};

export function getPosts(kind: PostKind): Post[] {
    return posts.filter((post) => post.kind === kind);
}

export function getPost(kind: PostKind, slug: string): Post | undefined {
    return posts.find((post) => post.kind === kind && post.slug === slug);
}

export function getLatestPosts(limit = 4): Post[] {
    return posts
        .filter((post) => post.status !== 'wip')
        .sort((left, right) =>
            (left.kind === 'blog' ? 0 : 1) - (right.kind === 'blog' ? 0 : 1) || byDate(left, right))
        .slice(0, limit);
}
