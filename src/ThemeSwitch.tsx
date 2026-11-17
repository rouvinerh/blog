import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const themeKey = 'rouvin-theme-v2';

export default function ThemeSwitch() {
    const [theme, setTheme] = useState<Theme>(() =>
        typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
            ? 'light'
            : 'dark',
    );

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document
            .querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', theme === 'dark' ? '#0f171e' : '#fafbfc');
        try {
            localStorage.setItem(themeKey, theme);
        } catch {
            return;
        }
    }, [theme]);

    const toggle = () => {
        const next: Theme = theme === 'light' ? 'dark' : 'light';
        const root = document.documentElement;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        root.classList.add('theme-switching');
        const done = () => root.classList.remove('theme-switching');
        if (document.startViewTransition && !reduceMotion) {
            const transition = document.startViewTransition(() => {
                root.dataset.theme = next;
            });
            transition.ready.catch(() => undefined);
            transition.finished.finally(done);
            setTimeout(done, 600);
        } else {
            root.dataset.theme = next;
            requestAnimationFrame(() => requestAnimationFrame(done));
        }
        setTheme(next);
    };

    return (
        <button
            className="theme-switch"
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            onClick={toggle}
            aria-label="Dark theme"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
            <span className="theme-switch-knob" aria-hidden="true">
                <Sun className="theme-switch-sun" size={13} strokeWidth={2.2} />
                <Moon className="theme-switch-moon" size={12} strokeWidth={2.2} />
            </span>
        </button>
    );
}
