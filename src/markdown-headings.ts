import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';

export interface ArticleSection {
    id: string;
    title: string;
    depth: number;
}

export function getSections(tree: Root): ArticleSection[] {
    const slugger = new GithubSlugger();
    const sections: ArticleSection[] = [];

    for (const node of tree.children) {
        if (node.type !== 'heading') continue;
        const title = toString(node);
        const id = slugger.slug(`section ${title}`);
        node.data = {
            ...node.data,
            hProperties: { ...node.data?.hProperties, id, tabIndex: -1 },
        };
        if (node.depth === 2 || node.depth === 3)
            sections.push({ id, title, depth: node.depth });
    }

    return sections;
}

export function remarkHeadingIds() {
    return (tree: Root) => {
        getSections(tree);
    };
}
