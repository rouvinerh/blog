import type { CSSProperties } from 'react';
import TinyMagnet from './TinyMagnet.tsx';
import './PixelCharacters.css';

type PixelKind = 'human' | 'jackdaw' | 'bug' | 'builder' | 'writer';
type SceneVariant = 'home' | 'blog' | 'bugs';

const characterFrames = {
    human: ['humanA', 'humanB'],
    jackdaw: ['jackdawA', 'jackdawB'],
    bug: ['bugA', 'bugB'],
    builder: ['minerBody'],
    writer: ['writerBody'],
} as const;

function PixelImage({ name, size, className = '' }: { name: string; size: number; className?: string }) {
    return (
        <img
            className={className}
            src={`/images/sprites/${name}.svg`}
            alt=""
            width={size}
            height={size}
            decoding="async"
            aria-hidden="true"
        />
    );
}

export function PixelIcon({ kind }: { kind: 'bug' | 'book' }) {
    return <PixelImage name={kind === 'bug' ? 'bugA' : 'book'} size={18} />;
}

export function PixelCharacter({ kind = 'human', size = 54, className = '' }: { kind?: PixelKind; size?: number; className?: string }) {
    const toolScale = Math.max(1, Math.round(size / 27));
    const frames = characterFrames[kind];

    return (
        <span className={`pixel-character pixel-character--${kind} ${className}`} style={{ '--pixel-size': `${size}px` } as CSSProperties} data-animated={frames.length > 1 || undefined} aria-hidden="true">
            <span className="pixel-character-figure">
                {frames.map((name, index) => <PixelImage key={name} name={name} size={size} className={`pixel-frame pixel-frame--${index}`} />)}
                {kind === 'builder' && <PixelImage name="pickaxe" size={12 * toolScale} className="pixel-character-tool pixel-character-tool--pickaxe" />}
                {kind === 'writer' && (
                    <>
                        <PixelImage name="clipboard" size={10 * toolScale} className="pixel-character-tool pixel-character-tool--paper" />
                        <PixelImage name="pen" size={10 * toolScale} className="pixel-character-tool pixel-character-tool--pen" />
                    </>
                )}
            </span>
        </span>
    );
}

export function PixelScene({ variant = 'home', className = '' }: { variant?: SceneVariant; className?: string }) {
    return (
        <span className={`pixel-scene pixel-scene--${variant} ${className}`} aria-hidden="true">
            <TinyMagnet>
                <PixelCharacter kind={variant === 'blog' ? 'writer' : variant === 'bugs' ? 'jackdaw' : 'human'} />
            </TinyMagnet>
            {variant === 'blog' && <PixelImage name="book" size={28} className="pixel-scene-prop" />}
            {variant === 'bugs' && <PixelCharacter kind="bug" size={36} className="pixel-scene-buddy" />}
        </span>
    );
}

export default PixelCharacter;
