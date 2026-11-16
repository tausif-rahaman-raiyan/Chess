import React from 'react';
import { PieceColor, PieceSymbol } from '../../shared/types';

export interface PieceSetDefinition {
  id: string;
  name: string;
  styleTag: string;
  license: string;
}

export const PIECE_SETS: PieceSetDefinition[] = [
  { id: 'neo-classic', name: 'Neo Classic (Chess.com Style)', styleTag: 'Rounded Tournament', license: 'GPL-3.0 / Original' },
  { id: 'merida-crisp', name: 'Merida Crisp', styleTag: 'Traditional Serif', license: 'GPLv2+ / Original' },
  { id: 'alpha-sharp', name: 'Alpha Sharp', styleTag: 'Angular Modern', license: 'CC0 / Original' },
  { id: 'staunton-wood', name: 'Staunton Sculpted Wood', styleTag: 'Carved Grain', license: 'CC0 / Original' },
  { id: 'minimalist-geo', name: 'Minimalist Bauhaus', styleTag: 'Geometric Clean', license: 'MIT / Original' },
  { id: 'royal-crown', name: 'Royal Imperial Crown', styleTag: 'Ornate Gold Trim', license: 'GPL-3.0 / Original' },
  { id: 'celtic-knot', name: 'Celtic Heraldic', styleTag: 'Shield & Runes', license: 'CC0 / Original' },
  { id: 'pixel-arcade', name: 'Pixel 8-Bit Arcade', styleTag: 'Retro Voxel Grid', license: 'CC0 / Original' },
  { id: 'glass-neon', name: 'Cyber Glass Neon', styleTag: 'Glowing Wireframe', license: 'MIT / Original' },
  { id: 'gothic-spire', name: 'Gothic Cathedral', styleTag: 'Pointed Arches', license: 'GPL-3.0 / Original' },
  { id: 'samurai-crest', name: 'Shogun Crest', styleTag: 'Kanji & Kabuto', license: 'CC0 / Original' },
  { id: 'marble-statue', name: 'Carrara Marble Bust', styleTag: 'Chiseled Stone', license: 'CC0 / Original' },
  { id: 'flat-token', name: 'Tactical Coin Tokens', styleTag: 'Medallion Discs', license: 'MIT / Original' },
  { id: 'high-contrast', name: 'High-Contrast Bold', styleTag: 'Extra Thick Outline', license: 'CC0 / Original' },
];

interface Palette {
  fill: string;
  fillAlt: string;
  stroke: string;
  detail: string;
  strokeWidth: number;
}

function getSetPalette(setId: string, color: PieceColor): Palette {
  const isWhite = color === 'w';
  switch (setId) {
    case 'staunton-wood':
      return isWhite
        ? { fill: '#f3d8b3', fillAlt: '#dfc092', stroke: '#4b2e16', detail: '#6e4523', strokeWidth: 1.8 }
        : { fill: '#6b3e1e', fillAlt: '#4b2a12', stroke: '#1f1006', detail: '#d4a373', strokeWidth: 1.8 };
    case 'royal-crown':
      return isWhite
        ? { fill: '#fffbeb', fillAlt: '#fde68a', stroke: '#78350f', detail: '#d97706', strokeWidth: 1.8 }
        : { fill: '#1e1b4b', fillAlt: '#312e81', stroke: '#f59e0b', detail: '#fbbf24', strokeWidth: 1.8 };
    case 'glass-neon':
      return isWhite
        ? { fill: '#e0f2fe', fillAlt: '#7dd3fc', stroke: '#0284c7', detail: '#0369a1', strokeWidth: 2.0 }
        : { fill: '#0f172a', fillAlt: '#1e293b', stroke: '#38bdf8', detail: '#22d3ee', strokeWidth: 2.1 };
    case 'marble-statue':
      return isWhite
        ? { fill: '#f8fafc', fillAlt: '#cbd5e1', stroke: '#334155', detail: '#64748b', strokeWidth: 1.7 }
        : { fill: '#334155', fillAlt: '#1e293b', stroke: '#0f172a', detail: '#94a3b8', strokeWidth: 1.7 };
    case 'celtic-knot':
      return isWhite
        ? { fill: '#ecfdf5', fillAlt: '#a7f3d0', stroke: '#065f46', detail: '#059669', strokeWidth: 1.8 }
        : { fill: '#134e4a', fillAlt: '#0f2928', stroke: '#6ee7b7', detail: '#34d399', strokeWidth: 1.8 };
    case 'samurai-crest':
      return isWhite
        ? { fill: '#fef2f2', fillAlt: '#fecaca', stroke: '#7f1d1d', detail: '#b91c1c', strokeWidth: 1.8 }
        : { fill: '#18181b', fillAlt: '#27272a', stroke: '#ef4444', detail: '#f87171', strokeWidth: 1.9 };
    case 'high-contrast':
      return isWhite
        ? { fill: '#ffffff', fillAlt: '#f1f5f9', stroke: '#000000', detail: '#000000', strokeWidth: 2.7 }
        : { fill: '#09090b', fillAlt: '#18181b', stroke: '#ffffff', detail: '#ffffff', strokeWidth: 2.5 };
    default:
      return isWhite
        ? { fill: '#ffffff', fillAlt: '#e5e7eb', stroke: '#1f2937', detail: '#374151', strokeWidth: 1.75 }
        : { fill: '#262522', fillAlt: '#171614', stroke: '#0c0b0a', detail: '#d6d3d1', strokeWidth: 1.75 };
  }
}

export const ChessPieceSvg: React.FC<{
  setId: string;
  color: PieceColor;
  type: PieceSymbol;
  className?: string;
}> = ({ setId, color, type, className }) => {
  const p = getSetPalette(setId, color);

  // Variant A: Pixel 8-Bit Arcade
  if (setId === 'pixel-arcade') {
    const pixelMap: Record<PieceSymbol, string[]> = {
      p: ['....XXXX....', '...XXXXXX...', '...XXXXXX...', '....XXXX....', '....XXXX....', '...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.'],
      r: ['XX..XXXX..XX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '..XXXXXXXX..', '..XXXXXXXX..', '..XXXXXXXX..', '.XXXXXXXXXX.', 'XXXXXXXXXXXX'],
      n: ['...XXXXX....', '..XXXXXXX...', '.XXXXXXXXX..', '.XXXX..XXX..', '..XXXXXX....', '..XXXXXXX...', '.XXXXXXXXX..', 'XXXXXXXXXXXX'],
      b: ['.....XX.....', '....XXXX....', '...XX..XX...', '...XXXXXX...', '....XXXX....', '...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.'],
      q: ['X..X.XX.X..X', '.XXXXXXXXXX.', '..XXXXXXXX..', '..XXXXXXXX..', '...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.', 'XXXXXXXXXXXX'],
      k: ['.....XX.....', '....XXXX....', '.....XX.....', '..XXXXXXXX..', '.XXXXXXXXXX.', '..XXXXXXXX..', '.XXXXXXXXXX.', 'XXXXXXXXXXXX'],
    };
    const rows = pixelMap[type];
    return (
      <svg viewBox="0 0 48 48" className={className} width="100%" height="100%">
        {rows.map((row, ry) =>
          row.split('').map((ch, cx) =>
            ch === 'X' ? (
              <rect
                key={`${ry}-${cx}`}
                x={6 + cx * 3}
                y={8 + ry * 4.2}
                width={3.1}
                height={4.3}
                fill={p.fill}
                stroke={p.stroke}
                strokeWidth={0.55}
              />
            ) : null,
          ),
        )}
      </svg>
    );
  }

  // Variant B: Minimalist Bauhaus Geometric
  if (setId === 'minimalist-geo') {
    return (
      <svg viewBox="0 0 45 45" className={className} width="100%" height="100%">
        {type === 'p' && (
          <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth}>
            <circle cx="22.5" cy="15" r="6.5" />
            <polygon points="12,38 22.5,22 33,38" />
          </g>
        )}
        {type === 'r' && (
          <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth}>
            <rect x="12" y="10" width="21" height="7" rx="1" />
            <rect x="14.5" y="17" width="16" height="15" />
            <rect x="10" y="32" width="25" height="6" rx="1.5" />
          </g>
        )}
        {type === 'n' && (
          <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth}>
            <polygon points="13,38 15,14 28,9 33,19 24,23 31,38" strokeLinejoin="round" />
            <circle cx="23" cy="14.5" r="1.5" fill={p.detail} />
          </g>
        )}
        {type === 'b' && (
          <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth}>
            <polygon points="22.5,7 32,23 22.5,31 13,23" />
            <line x1="22.5" y1="14" x2="22.5" y2="23" stroke={p.detail} strokeWidth="2" />
            <rect x="11" y="33" width="23" height="5" rx="2.5" />
          </g>
        )}
        {type === 'q' && (
          <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth}>
            <polygon points="9,14 16,25 22.5,11 29,25 36,14 32,33 13,33" strokeLinejoin="round" />
            <rect x="11" y="34" width="23" height="5" rx="2" />
          </g>
        )}
        {type === 'k' && (
          <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth}>
            <path d="M22.5 5 V13 M18.5 9 H26.5" strokeWidth="2.6" strokeLinecap="round" />
            <rect x="13" y="14" width="19" height="19" rx="4" />
            <rect x="10" y="34" width="25" height="5.5" rx="2" />
          </g>
        )}
      </svg>
    );
  }

  // Variant C: Tactical Coin Medallions or Shogun Crest Tokens
  if (setId === 'flat-token' || setId === 'samurai-crest') {
    const labelMap: Record<PieceSymbol, string> =
      setId === 'samurai-crest'
        ? { k: '王', q: '将', r: '車', b: '角', n: '桂', p: '歩' }
        : { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };
    return (
      <svg viewBox="0 0 45 45" className={className} width="100%" height="100%">
        <circle cx="22.5" cy="23.5" r="17.5" fill={p.stroke} opacity="0.35" />
        <circle cx="22.5" cy="22" r="17.5" fill={p.fill} stroke={p.stroke} strokeWidth="2.4" />
        <circle cx="22.5" cy="22" r="13.5" fill="none" stroke={p.detail} strokeWidth="1.2" strokeDasharray={setId === 'flat-token' ? '3 2' : undefined} />
        <text
          x="22.5"
          y="28"
          textAnchor="middle"
          fontSize="17"
          fontWeight="800"
          fill={color === 'w' ? p.stroke : p.detail}
          fontFamily="Segoe UI, sans-serif"
        >
          {labelMap[type]}
        </text>
      </svg>
    );
  }

  // Variant D: Distinct Silhouettes for Alpha Sharp, Gothic Spire, Merida Crisp, Neo Classic, etc.
  const isSharp = setId === 'alpha-sharp' || setId === 'gothic-spire' || setId === 'glass-neon';
  const isOrnate = setId === 'royal-crown' || setId === 'celtic-knot' || setId === 'staunton-wood';

  return (
    <svg viewBox="0 0 45 45" className={className} width="100%" height="100%">
      {type === 'p' && (
        <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          {isSharp ? (
            <>
              <polygon points="22.5,8 28.5,15.5 22.5,21 16.5,15.5" />
              <polygon points="15,24 30,24 33,35 12,35" />
              <rect x="9.5" y="35" width="26" height="4.5" rx="1" />
            </>
          ) : (
            <>
              <circle cx="22.5" cy="14" r="5.5" />
              <path d="M16.5 21.5 C16.5 19.5, 28.5 19.5, 28.5 21.5 L31.5 34 H13.5 Z" />
              <rect x="10" y="34" width="25" height="5" rx="2.5" />
              {isOrnate && <line x1="17" y1="27" x2="28" y2="27" stroke={p.detail} strokeWidth="1.4" />}
            </>
          )}
        </g>
      )}

      {type === 'r' && (
        <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 9 H15.5 V12.5 H20 V9 H25 V12.5 H29.5 V9 H34 V16.5 L31 19 V32 L34.5 35 V39.5 H10.5 V35 L14 32 V19 L11 16.5 Z" />
          <line x1="14" y1="19" x2="31" y2="19" stroke={p.detail} strokeWidth="1.4" />
          <line x1="14" y1="32" x2="31" y2="32" stroke={p.detail} strokeWidth="1.4" />
          {isOrnate && <rect x="20.5" y="22.5" width="4" height="6" rx="2" fill={p.detail} stroke="none" />}
        </g>
      )}

      {type === 'n' && (
        <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          {isSharp ? (
            <path d="M12 39 L14 24 L11 18 L18 8 L23 11 L33 16 L31 23 L23 23 L28 33 L33 35 V39 Z" />
          ) : (
            <path d="M12.5 39 C12.5 31, 14 23, 12 17 C13.5 12, 18 8, 22 7.5 L24 10.5 C28.5 11.5, 33 15.5, 33.5 20.5 C33.5 23, 30.5 24, 27.5 23 C25 22.5, 23 24, 23 26.5 C23 30, 28 32, 32.5 34.5 V39 Z" />
          )}
          <circle cx="19.5" cy="14.5" r="1.4" fill={p.detail} stroke="none" />
          <path d="M15 21 C15.5 26, 15.5 31, 14.5 35" fill="none" stroke={p.detail} strokeWidth="1.3" />
        </g>
      )}

      {type === 'b' && (
        <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="22.5" cy="7.5" r="2.6" />
          <path d="M22.5 10.5 C16.5 14, 14 21, 16.5 27.5 L14.5 33.5 H30.5 L28.5 27.5 C31 21, 28.5 14, 22.5 10.5 Z" />
          <path d="M10.5 34.5 C14.5 33, 30.5 33, 34.5 34.5 L35.5 39 H9.5 Z" />
          <path d="M22.5 16 V23 M19.5 19.5 H25.5" stroke={p.detail} strokeWidth="1.8" />
        </g>
      )}

      {type === 'q' && (
        <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8.5" cy="13" r="2" />
          <circle cx="15.5" cy="10" r="2" />
          <circle cx="22.5" cy="8.5" r="2.2" />
          <circle cx="29.5" cy="10" r="2" />
          <circle cx="36.5" cy="13" r="2" />
          <path d="M9.5 15 L14 31.5 H31 L35.5 15 L29 23 L22.5 11.5 L16 23 Z" />
          <rect x="11" y="32" width="23" height="3.5" rx="1.5" />
          <rect x="9.5" y="36" width="26" height="3.5" rx="1.5" />
          {isOrnate && <circle cx="22.5" cy="26.5" r="2" fill={p.detail} stroke="none" />}
        </g>
      )}

      {type === 'k' && (
        <g fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.5 4.5 V11.5 M19 8 H26" strokeWidth="2.4" />
          <path d="M22.5 12 C18 12, 15.5 15.5, 16.5 19.5 L13 17.5 C10 19.5, 10.5 26, 14.5 31.5 H30.5 C34.5 26, 35 19.5, 32 17.5 L28.5 19.5 C29.5 15.5, 27 12, 22.5 12 Z" />
          <path d="M22.5 12.5 V31" stroke={p.detail} strokeWidth="1.4" />
          <rect x="11" y="32" width="23" height="3.5" rx="1.5" />
          <rect x="9.5" y="36" width="26" height="3.5" rx="1.5" />
        </g>
      )}
    </svg>
  );
};
