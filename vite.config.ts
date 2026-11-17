import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import markdownContent from './plugins/markdown-content';
import themedSvgs from './plugins/themed-svgs';

const cloudflareAnalytics = (): Plugin => ({
    name: 'cloudflare-analytics',
    apply: 'build',
    transformIndexHtml: () => [
        {
            tag: 'script',
            attrs: {
                type: 'module',
                src: 'https://static.cloudflareinsights.com/beacon.min.js',
                'data-cf-beacon': '{"token": "c6a23a75672849409eec7b821cf980a4"}',
            },
            injectTo: 'body',
        },
    ],
});

export default defineConfig({
    plugins: [react(), markdownContent(), themedSvgs(), cloudflareAnalytics()],
    base: '/',
    build: {
        manifest: true,
    },
    server: {
        watch: {
            usePolling: true,
            interval: 100,
        },
    },
});
