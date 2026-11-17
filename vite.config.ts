import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import markdownContent from './plugins/markdown-content';

export default defineConfig({
    plugins: [react(), markdownContent()],
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
