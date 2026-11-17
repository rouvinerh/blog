import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

async function start() {
    const container = document.getElementById('root')!;
    const MarkdownComponent = container.querySelector('.article')
        ? (await import('./Markdown.tsx')).default
        : undefined;

    createRoot(container).render(
        <StrictMode>
            <App MarkdownComponent={MarkdownComponent} />
        </StrictMode>,
    );
}

void start();
