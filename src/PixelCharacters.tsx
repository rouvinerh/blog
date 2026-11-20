import type { CSSProperties, ReactElement } from 'react';
import TinyMagnet from './TinyMagnet.tsx';
import './PixelCharacters.css';

const maps = {
  "humanA": [
    "................",
    "................",
    "....EEEEEEEE....",
    "...EEEEEEEEEE...",
    "...EESSSSSSEE...",
    "....SSSSSSSS....",
    "....SKSSSSKS....",
    "....SSSSSSSS.S..",
    ".....SSSSSS..S..",
    "...DDDDDDDDDDD..",
    "..SDDDDDDDDDD...",
    "..SDDDDDDDDDD...",
    "...DDDDDDDDDD...",
    "...dddd..dddd...",
    "...dddd..dddd...",
    "...KKKK..KKKK..."
  ],
  "humanB": [
    "................",
    "................",
    "....EEEEEEEE....",
    "...EEEEEEEEEE...",
    "...EESSSSSSEE...",
    "....SSSSSSSS....",
    "....SKSSSSKS....",
    "....SSSSSSSS..S.",
    ".....SSSSSS..SS.",
    "...DDDDDDDDDDD..",
    "..SDDDDDDDDDD...",
    "..SDDDDDDDDDD...",
    "...DDDDDDDDDD...",
    "...dddd..dddd...",
    "...dddd..dddd...",
    "...KKKK..KKKK..."
  ],
  "jackdawA": [
    "................",
    ".........EEEE...",
    "........eEEEEE..",
    ".......eeEIEEE..",
    ".......eeEEEEOOO",
    "......eeEEEEEO..",
    "......EEEEEEE...",
    "....EEEEEEEEE...",
    "..EEEEEEEEEEE...",
    ".EEEqqqqqEEEE...",
    "EEEEqqqqqEEEE...",
    ".EEEEqqqqEEE....",
    "..EEEqqqEEE.....",
    "....EEEEEE......",
    ".....O..O.......",
    "....OOO.OOO....."
  ],
  "jackdawB": [
    "................",
    ".........EEEE...",
    "........eEEEEE..",
    ".......eeEIEEE..",
    ".......eeEEEEOOO",
    "......eeEEEEEO..",
    "......EEEEEEE...",
    "....EEEEEEEEE...",
    "..EEqqqqqEEEE...",
    ".EEEqqqqqEEEE...",
    "EEEEEqqqqEEEE...",
    ".EEEEEqqqEEE....",
    "..EEEEEEEEE.....",
    "....EEEEEE......",
    ".....O..O.......",
    "....OOO.OOO....."
  ],
  "writerBody": [
    "................",
    "................",
    "....nnnnnnnn....",
    "...nnnnnnnnnn...",
    "...nnSSSSSSnn...",
    "....SSSSSSSS....",
    "....SKSSSSKS....",
    "....SSSSSSSS....",
    ".....SSSSSS.....",
    "...VVVVVVVVVV...",
    "..SVVVVVVVVVVS..",
    "..SVVVVVVVVVVS..",
    "...VVVVVVVVVV...",
    "...vvvv..vvvv...",
    "...vvvv..vvvv...",
    "...KKKK..KKKK..."
  ],
  "minerBody": [
    "................",
    "....YYYYYYYY....",
    "...YYYYYYYYYY...",
    "...YYYYWWYYYY...",
    "..yyyyyyyyyyyy..",
    "....SSSSSSSS....",
    "....SKSSSSKS....",
    "....SSSSSSSS....",
    ".....SSSSSS.....",
    "...BBBBBBBBBB...",
    "..SBnBBBBBBnBS..",
    "..SBnnnnnnnnBS..",
    "...BnnnnnnnnB...",
    "...nnnn..nnnn...",
    "...nnnn..nnnn...",
    "...KKKK..KKKK..."
  ],
  "pickaxe": [
    "..wwwwww..",
    ".wwwwwwww.",
    "www.NN.www",
    "ww..NN..ww",
    "....NN....",
    "....NN....",
    "....NN....",
    "....NN....",
    "....NN....",
    "....NN...."
  ],
  "book": [
    "............",
    ".VVVVVVVVV..",
    ".VWWWWWWWVv.",
    ".VWwwwwwWVv.",
    ".VWWWWWWWVv.",
    ".VWwwwwWWVv.",
    ".VWWWWWWWVv.",
    ".VWwwwwwWVv.",
    ".VWWWWWWWVv.",
    ".VVVVVVVVVv.",
    "..vvvvvvvvv.",
    "............"
  ],
  "clipboard": [
    "..nnnn..",
    ".WWWWWW.",
    ".WwwwwW.",
    ".WWWWWW.",
    ".WwwwwW.",
    ".WWWWWW.",
    ".WwwwwW.",
    ".WWWWWW."
  ],
  "pen": [
    "........",
    ".....RRR",
    "....RRRR",
    "...RRRR.",
    "..RRRR..",
    ".WWRR...",
    "KWW.....",
    "........"
  ],
  "bugA": [
    "................",
    "...G........G...",
    "....G......G....",
    ".....GGGGGG.....",
    "....GGGKKGGG....",
    "...GGGGKKGGGG...",
    "..G.GGGKKGGG.G..",
    "....GGGKKGGG....",
    "..GGGGGKKGGGGG..",
    "....GGGKKGGG....",
    "..G.GGGKKGGG.G..",
    "...GGGGKKGGGG...",
    "....GGGKKGGG....",
    ".....GGGGGG.....",
    "....G......G....",
    "................"
  ],
  "bugB": [
    "................",
    "....G......G....",
    ".....G....G.....",
    ".....GGGGGG.....",
    "....GGGKKGGG....",
    "...GGGGKKGGGG...",
    "....GGGKKGGG....",
    "..G.GGGKKGGG.G..",
    "...GGGGKKGGGG...",
    "..G.GGGKKGGG.G..",
    "....GGGKKGGG....",
    "...GGGGKKGGGG...",
    "....GGGKKGGG....",
    ".....GGGGGG.....",
    "...G........G...",
    "................"
  ]
} as const;

const palette: Record<string, string> = {
  K: '#17161F', S: '#F0C193', s: '#CD9465', W: '#EDEFF5', w: '#99A2B4',
  B: '#3C6FA6', b: '#2A5080', Y: '#EFB63C', y: '#B8831F', L: '#FFEFA6',
  G: '#9CBF75', g: '#5D874F', H: '#D9C06A', h: '#A8914A',
  N: '#7A5230', n: '#5B3C20', P: '#E0598C', p: '#A93C68',
  V: '#6CB8AB', v: '#3F8179', R: '#D9483C', D: '#586C79', d: '#344552',
  E: '#6B7687', e: '#9DA8B9', q: '#46596F', I: '#F4F1E8', O: '#B1BAC7',
};

type PixelKind = 'human' | 'jackdaw' | 'bug' | 'builder' | 'writer';
type SceneVariant = 'home' | 'blog' | 'bugs';

function Sprite({ rows, size, className = '' }: { rows: readonly string[]; size: number; className?: string }) {
  const width = rows[0].length;
  const height = rows.length;
  const pixels: ReactElement[] = [];
  const solid = (x: number, y: number) => y >= 0 && y < height && x >= 0 && x < width && rows[y][x] !== '.';

  for (let y = -1; y <= height; y++) {
    for (let x = -1; x <= width; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) {
        pixels.push(<rect key={`edge-${x}-${y}`} x={x} y={y} width="1" height="1" fill={palette.K} />);
      }
    }
  }

  rows.forEach((row, y) => {
    for (let x = 0; x < width;) {
      const color = row[x];
      if (color === '.') { x++; continue; }
      const start = x;
      while (x < width && row[x] === color) x++;
      pixels.push(<rect key={`${start}-${y}`} x={start} y={y} width={x - start} height="1" fill={palette[color] ?? palette.K} />);
    }
  });

  return <svg className={className} width={size} height={size * (height + 2) / (width + 2)} viewBox={`-1 -1 ${width + 2} ${height + 2}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false">{pixels}</svg>;
}

export function PixelIcon({ kind }: { kind: 'bug' | 'book' }) {
  return <Sprite rows={kind === 'bug' ? maps.bugA : maps.book} size={18} />;
}

export function PixelCharacter({ kind = 'human', size = 54, className = '' }: { kind?: PixelKind; size?: number; className?: string }) {
  const toolScale = Math.max(1, Math.round(size / 27));
  const frames = {
    human: [maps.humanA, maps.humanB],
    jackdaw: [maps.jackdawA, maps.jackdawB],
    bug: [maps.bugA, maps.bugB],
    builder: [maps.minerBody],
    writer: [maps.writerBody],
  }[kind];

  return (
    <span className={`pixel-character pixel-character--${kind} ${className}`} style={{ '--pixel-size': `${size}px` } as CSSProperties} data-animated={frames.length > 1 || undefined} aria-hidden="true">
      <span className="pixel-character-figure">
        {frames.map((rows, index) => <Sprite key={index} rows={rows} size={size} className={`pixel-frame pixel-frame--${index}`} />)}
        {kind === 'builder' && <Sprite rows={maps.pickaxe} size={12 * toolScale} className="pixel-character-tool pixel-character-tool--pickaxe" />}
        {kind === 'writer' && <><Sprite rows={maps.clipboard} size={10 * toolScale} className="pixel-character-tool pixel-character-tool--paper" /><Sprite rows={maps.pen} size={10 * toolScale} className="pixel-character-tool pixel-character-tool--pen" /></>}
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
      {variant === 'blog' && <Sprite rows={maps.book} size={28} className="pixel-scene-prop" />}
      {variant === 'bugs' && <PixelCharacter kind="bug" size={36} className="pixel-scene-buddy" />}
    </span>
  );
}

export default PixelCharacter;
