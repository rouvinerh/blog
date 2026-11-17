import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
after(() => server.close());
const { createPostIndex, registerPublications } = await server.ssrLoadModule('/src/content-parser.ts');
const { serializePublishedPosts } = await server.ssrLoadModule('/plugins/markdown-content.ts');
const { default: Markdown } = await server.ssrLoadModule('/src/Markdown.tsx');

function renderMarkdown(content, props = {}) {
    return renderToStaticMarkup(createElement(Markdown, { content, ...props }));
}

function codeBlock(html, language) {
    const match = new RegExp(`<code[^>]*class="[^"]*language-${language}[^\"]*"[^>]*>([\\s\\S]*?)<\\/code>`).exec(html);
    assert.ok(match, `Expected a ${language} code block`);
    return match[1];
}

test('plain Markdown supplies titles and previews while publication order controls the list', () => {
    const files = {
        '/content/blog/known.md': '# A **known** post\n\nThe first paragraph has `code` and **useful details**.\n\n## More\n\nThe rest of the article.',
        '/content/blog/new-note.md': 'A newly added note without a title heading.',
        '/content/bugs/finding.md': '# A finding\n\nThe full report starts here.',
    };
    const registration = registerPublications(files, {
        'bugs/finding': { description: 'A shorter report preview.', publicationOrder: 2 },
        'blog/known': { publicationOrder: 1 },
    });
    const posts = createPostIndex(files, registration.catalogue);

    assert.deepEqual(posts.map(({ kind, slug }) => [kind, slug]), [
        ['blog', 'new-note'],
        ['bugs', 'finding'],
        ['blog', 'known'],
    ]);
    assert.deepEqual(posts.map(({ publicationOrder }) => publicationOrder), [3, 2, 1]);
    assert.equal(posts[0].title, 'New note');
    assert.equal(posts[1].description, 'A shorter report preview.');
    assert.equal(posts[2].title, 'A known post');
    assert.equal(posts[2].description, 'The first paragraph has code and useful details.');
    assert.ok(posts[2].content.startsWith('The first paragraph'));
    assert.ok(!posts[2].content.includes('# A **known** post'));
    assert.ok(posts[2].content.includes('## More'));
});

test('registration publishes new writing once, preserves edits, and gives completed WIP the next order', () => {
    const files = {
        '/content/bugs/older.md': '# Older report\n\nOriginal body.',
        '/content/blog/current.md': '# Current post\n\nCurrent body.',
        '/content/blog/in-progress.md': '# Still writing\n\nWork in progress.',
        '/content/blog/private.md': '# Private draft\n\nPrivate body.',
        '/content/bugs/_template.md': '# Hidden template\n\nTemplate body.',
    };
    const catalogue = {
        'bugs/older': { description: 'Keep this description.', publicationOrder: 1 },
        'blog/current': { publicationOrder: 4 },
        'blog/in-progress': { status: 'wip', description: 'Still working on it.' },
        'blog/private': { draft: true },
        'bugs/_template': 'Hidden files do not need valid catalogue details.',
    };
    const originalCatalogue = structuredClone(catalogue);
    assert.deepEqual(registerPublications(files, catalogue).assignments, []);

    const withNewPost = { ...files, '/content/bugs/new-finding.md': '# A new finding\n\nNew body.' };
    const published = registerPublications(withNewPost, catalogue);
    assert.deepEqual(published.assignments, [{ key: 'bugs/new-finding', publicationOrder: 5 }]);
    assert.equal(createPostIndex(withNewPost, published.catalogue)[0].slug, 'new-finding');
    assert.deepEqual(catalogue, originalCatalogue, 'Registration must not mutate its input');
    assert.equal(published.catalogue['bugs/older'].description, 'Keep this description.');
    assert.ok(!('publicationOrder' in published.catalogue['blog/in-progress']));
    assert.ok(!('publicationOrder' in published.catalogue['blog/private']));
    assert.equal(published.catalogue['bugs/_template'], catalogue['bugs/_template']);

    const editedFiles = { ...withNewPost, '/content/bugs/older.md': '# Older report, edited\n\nAn updated body.' };
    const edited = registerPublications(editedFiles, published.catalogue);
    assert.deepEqual(edited.assignments, []);
    assert.deepEqual(edited.catalogue, published.catalogue);
    const older = createPostIndex(editedFiles, edited.catalogue).find(({ slug }) => slug === 'older');
    assert.equal(older.title, 'Older report, edited');
    assert.equal(older.publicationOrder, 1);

    const completedDetails = { ...published.catalogue['blog/in-progress'] };
    delete completedDetails.status;
    const completed = registerPublications(editedFiles, { ...published.catalogue, 'blog/in-progress': completedDetails });
    assert.deepEqual(completed.assignments, [{ key: 'blog/in-progress', publicationOrder: 6 }]);
    assert.equal(completed.catalogue['blog/in-progress'].description, 'Still working on it.');
    assert.equal(createPostIndex(editedFiles, completed.catalogue)[0].slug, 'in-progress');
    assert.deepEqual(registerPublications(editedFiles, completed.catalogue).assignments, []);
});

test('BOM and CRLF input are normalised and fenced headings cannot become titles or sections', () => {
    const posts = createPostIndex({
        '/content/blog/windows.md': [
            '\uFEFF# Windows *notes*',
            '',
            '![Diagram](/images/example.svg)',
            '',
            'A real paragraph with **bold** text.',
            '',
            '```markdown',
            '## Fake section',
            '```',
            '',
            '## Real section',
        ].join('\r\n'),
        '/content/blog/fenced-title.md': '```markdown\n# Pretend title\n```\n\nA plain introduction.\n\n## Actual section',
    });
    const windows = posts.find(({ slug }) => slug === 'windows');
    const fenced = posts.find(({ slug }) => slug === 'fenced-title');

    assert.equal(windows.title, 'Windows notes');
    assert.equal(windows.description, 'A real paragraph with bold text.');
    assert.ok(!windows.content.includes('\r'));
    assert.ok(windows.content.includes('```markdown\n## Fake section\n```'));
    assert.deepEqual(windows.sections, [{ id: 'section-real-section', title: 'Real section', depth: 2 }]);
    assert.equal(fenced.title, 'Fenced title');
    assert.equal(fenced.description, 'A plain introduction.');
    assert.deepEqual(fenced.sections.map(({ title }) => title), ['Actual section']);
});

test('catalogue flags keep WIP writing visible, hide drafts, and reject invalid list details', () => {
    const files = {
        '/content/blog/entry.md': '# Still working on this\n\nA short introduction.',
        '/content/bugs/draft.md': '# Not ready\n\nDraft report.',
    };
    const posts = createPostIndex(files, {
        'blog/entry': { status: 'wip' },
        'bugs/draft': { draft: true },
    });

    assert.equal(posts.length, 1);
    assert.equal(posts[0].status, 'wip');
    assert.equal(posts[0].content, 'A short introduction.');
    assert.throws(() => createPostIndex(files, { 'blog/entry': [] }), /blog\/entry must be an object/);
    assert.throws(() => createPostIndex(files, { 'blog/entry': { draft: 'true' } }), /blog\/entry: draft must be true or false/);
    assert.throws(() => createPostIndex(files, { 'blog/entry': { status: 'unfinished' } }), /blog\/entry: status must be wip/);
    assert.throws(() => createPostIndex(files, { 'blog/entry': { description: 42 } }), /blog\/entry: description must be text/);
    for (const publicationOrder of [0, -1, 1.5, '2', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => registerPublications(files, { 'blog/entry': { publicationOrder } }), /blog\/entry: publicationOrder must be a positive integer/);
        assert.throws(() => createPostIndex(files, { 'blog/entry': { publicationOrder } }), /blog\/entry: publicationOrder must be a positive integer/);
    }
});

test('browser serialisation excludes draft and hidden text before it becomes a virtual module', () => {
    const source = serializePublishedPosts({
        '/content/blog/public.md': '# Published\n\nPUBLIC_BODY_CHECK_7c1d',
        '/content/blog/draft.md': '# PRIVATE_TITLE_CHECK_2b3c\n\nPRIVATE_DRAFT_CHECK_9e3a',
        '/content/bugs/_template.md': '# Hidden template\n\nPRIVATE_TEMPLATE_CHECK_4b8f',
    }, {
        'blog/draft': { draft: true, description: 'PRIVATE_PREVIEW_CHECK_1a2b' },
        'bugs/_template': 'Hidden files should be excluded before catalogue validation.',
    });
    const payload = JSON.parse(source.replace(/^export default /, '').replace(/;$/, ''));

    assert.equal(payload.length, 1);
    assert.equal(payload[0].title, 'Published');
    assert.equal(payload[0].content, 'PUBLIC_BODY_CHECK_7c1d');
    for (const secret of ['PRIVATE_TITLE_CHECK_2b3c', 'PRIVATE_DRAFT_CHECK_9e3a', 'PRIVATE_PREVIEW_CHECK_1a2b', 'PRIVATE_TEMPLATE_CHECK_4b8f']) {
        assert.ok(!source.includes(secret), `${secret} must not enter browser code`);
    }
});

test('automatic contents links match unique formatted heading IDs and ignore fenced headings', () => {
    const [post] = createPostIndex({
        '/content/bugs/anchors.md': [
            '# The article title',
            '',
            'An introduction.',
            '',
            '## Summary',
            '',
            'A summary.',
            '',
            '## A **formatted** heading',
            '',
            '### Details with `code`',
            '',
            '```markdown',
            '## Not a section',
            '```',
            '',
            '## A formatted heading',
        ].join('\n'),
    });
    const expected = [
        { id: 'section-summary', title: 'Summary', depth: 2 },
        { id: 'section-a-formatted-heading', title: 'A formatted heading', depth: 2 },
        { id: 'section-details-with-code', title: 'Details with code', depth: 3 },
        { id: 'section-a-formatted-heading-1', title: 'A formatted heading', depth: 2 },
    ];
    assert.deepEqual(post.sections, expected);

    const html = renderMarkdown(post.content, { sections: post.sections, path: '/bugs/anchors' });
    assert.ok(html.includes('aria-label="Table of contents"'));
    assert.ok(html.includes('class="contents-subsection"'));
    for (const { id, depth } of expected) {
        assert.ok(html.includes(`href="/bugs/anchors#${id}"`));
        assert.match(html, new RegExp(`<h${depth}\\b(?=[^>]*id="${id}")(?=[^>]*tabindex="-1")`));
    }
    assert.ok(html.includes('A <strong>formatted</strong> heading'));
    assert.ok(!html.includes('section-not-a-section'));
    assert.ok(!renderMarkdown('## One section\n\nA body.', { sections: [expected[0]], path: '/blog/one' }).includes('aria-label="Table of contents"'));
    assert.ok(!renderMarkdown('Just a paragraph.').includes('aria-label="Table of contents"'));
});

test('Python, JavaScript and HTML receive real highlighting without changing code indentation', () => {
    const content = [
        '```python',
        'def greet():',
        '    return "hello"',
        '```',
        '',
        '```javascript',
        'const greeting = "hello";',
        '```',
        '',
        '```html',
        '<div class="greeting">hello</div>',
        '```',
        '',
        '```unknown-example-language',
        '<script>alert("fallback")</script>',
        '    plain text',
        '```',
    ].join('\n');
    const html = renderMarkdown(content);
    const python = codeBlock(html, 'python');
    const javascript = codeBlock(html, 'javascript');
    const markup = codeBlock(html, 'html');
    const fallback = codeBlock(html, 'unknown-example-language');

    assert.match(python, /<span class="hljs-keyword">def<\/span>/);
    assert.match(python, /\n {4}<span class="hljs-keyword">return<\/span>/);
    assert.match(python, /<span class="hljs-string">[^<]*hello[^<]*<\/span>/);
    assert.match(javascript, /<span class="hljs-keyword">const<\/span>/);
    assert.match(javascript, /<span class="hljs-string">[^<]*hello[^<]*<\/span>/);
    assert.match(markup, /<span class="hljs-name">div<\/span>/);
    assert.match(markup, /<span class="hljs-string">[^<]*greeting[^<]*<\/span>/);
    assert.ok(fallback.includes('&lt;script&gt;'));
    assert.ok(fallback.includes('\n    plain text'));
    assert.ok(!fallback.includes('<span'));
    assert.ok(!html.includes('<script>'));
});

test('GFM tables and tasks render while raw executable HTML and unsafe URLs stay disabled', () => {
    const content = [
        '## Results',
        '',
        '| Item | Result |',
        '| --- | --- |',
        '| Parser | Works |',
        '',
        '- [x] Checked',
        '- [ ] Pending',
        '',
        '[Safe link](https://example.com)',
        '',
        '[Unsafe link](javascript:alert%281%29)',
        '',
        '![Example](/images/example.png)',
        '',
        '![Diagram](/images/bugs/example.svg)',
        '',
        '<script>alert("unsafe")</script>',
        '',
        '<img src="x" onerror="alert(1)">',
    ].join('\n');
    const html = renderMarkdown(content);

    assert.ok(html.includes('<table>'));
    assert.ok(html.includes('class="markdown-table-wrap"'));
    assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2);
    assert.equal((html.match(/disabled=""/g) ?? []).length, 2);
    assert.ok(html.includes('checked=""'));
    assert.ok(html.includes('href="https://example.com"'));
    assert.ok(html.includes('src="/images/example.png"'));
    assert.ok(html.includes('src="/images/bugs/example.dark.svg"'));
    assert.ok(!html.includes('href="/images/bugs/example.svg"'));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('onerror='));
    assert.ok(!html.includes('href="javascript:'));
    assert.ok(!html.includes('alert(&quot;unsafe&quot;)'));
});
