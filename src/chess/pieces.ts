/**
 * Original Staunton-style chess piece artwork.
 *
 * Every glyph is hand-authored SVG in a 45x45 viewBox. There is deliberately
 * no Unicode chess character and no emoji anywhere in this file - the whole
 * set is drawn so it renders identically on every device, offline, at any size.
 *
 * The shared pedestal and collar are reused by every piece, which is what makes
 * the set read as one family rather than six unrelated drawings.
 */

export type PieceRole = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

/** Pedestal: present on every piece, anchors the whole set visually. */
const BASE = `M12.6 33.9h19.8c.95 0 1.66.5 1.95 1.33l1.24 3.1c.3.92-.32 1.87-1.36 1.87H10.78c-1.04 0-1.66-.95-1.36-1.87l1.24-3.1c.29-.83 1-1.33 1.95-1.33z`;
/** Collar ring that sits on the pedestal. */
const COLLAR = `M15.6 29.2h13.8c.86 0 1.55.6 1.55 1.4v.85c0 .8-.69 1.45-1.55 1.45H15.6c-.86 0-1.55-.65-1.55-1.45v-.85c0-.8.69-1.4 1.55-1.4z`;

const BODIES: Record<PieceRole, string> = {
  // --- pawn: a sphere, a collar, a tapered stem.
  pawn: `
    ${COLLAR}
    <path d="M18.5 20.3h8c.5 0 .93.36.99.86.6 4.86 1.75 7.4 2.83 8.14.5.34.3 1.02-.3 1.02H15.98c-.6 0-.8-.68-.3-1.02 1.08-.74 2.23-3.28 2.83-8.14.06-.5.49-.86.99-.86z"/>
    <circle cx="22.5" cy="14.1" r="5.05"/>`,

  // --- rook: a castellated tower. Four merlons over a banded shaft.
  rook: `
    ${BASE}${COLLAR}
    <path d="M12.95 12.55h19.1l-.86 15.9c-.05.95-.83 1.68-1.79 1.68H15.6c-.96 0-1.74-.73-1.79-1.68z"/>
    <path d="M10.7 9.62h23.6c.63 0 1.12.52 1.09 1.15l-.22 4.1c-.03.63-.55 1.1-1.18 1.1H10.81c-.63 0-1.15-.47-1.18-1.1l-.22-4.1c-.03-.63.46-1.15 1.09-1.15z"/>
    <g><path d="M11.05 4.35h5.05v5.2h-5.05zM19.98 4.35h5.05v5.2h-5.05zM28.9 4.35h5.05v5.2h-5.05z"/></g>`,

  // --- bishop: a mitre with the traditional diagonal cut and a finial ball.
  bishop: `
    ${BASE}${COLLAR}
    <path d="M22.5 5.2c3.72 0 6.74 4.06 6.74 9.05 0 3.2-1.15 5.9-2.9 7.9l2.5 5.05c.28.57-.12 1.25-.75 1.25H16.41c-.63 0-1.03-.68-.75-1.25l2.5-5.05c-1.75-2-2.9-4.7-2.9-7.9 0-4.99 3.02-9.05 6.74-9.05z"/>
    <circle cx="22.5" cy="4.4" r="2.15"/>`,


  // --- knight: the classic Staunton horse, facing left.
  // Drawn as head+neck silhouette plus two ear spikes, which keeps the ear
  // angles crisp instead of letting a single path round them off.
  knight: `
    ${BASE}${COLLAR}
    <path d="M11 20.2c-.7-1.6-.4-3.5.9-4.9 1.4-1.5 3.1-2.6 4.9-3.4 1.6-.7 2.8-1.9 3.4-3.5.5-1.3 1.8-1.9 3-1.3 2.8 1.5 4.8 4 5.7 6.9 1.3 3.9 1.1 8.1-.2 11.8-.5 1.6-.8 3-.9 4.3z"/>
    <path d="M16.6 9.4 15.6 3.7 19.5 7.1zM20.2 7.3 21.5 2.8 23.5 6.9z"/>
    <circle cx="14.1" cy="17.3" r="1.4"/>
    <circle cx="12.2" cy="19.5" r="0.75"/>
    <path d="M25.2 12.6c1.6 2.6 2 5.9 1.1 8.8" fill="none" stroke-width="1.5" stroke-linecap="round"/>`,



  // --- queen: a crown of seven points with a pearl on each tip.
  queen: `
    ${BASE}${COLLAR}
    <path d="M10.9 27.6 9.6 12.3l5.55 6.05 3.6-9.15 3.75 9.15 3.75-9.15 3.6 9.15L35.4 12.3l-1.3 15.3z"/>
    <circle cx="9.6" cy="10.5" r="1.75"/>
    <circle cx="15.15" cy="7.4" r="1.75"/>
    <circle cx="18.75" cy="9.4" r="1.9"/>
    <circle cx="22.5" cy="6.2" r="2.1"/>
    <circle cx="26.25" cy="9.4" r="1.9"/>
    <circle cx="29.85" cy="7.4" r="1.75"/>
    <circle cx="35.4" cy="10.5" r="1.75"/>`,

  // --- king: a tall cross above a bell-shaped crown.
  king: `
    ${BASE}${COLLAR}
    <path d="M12.4 28.2c0-7.9 2.4-13.1 6.6-15.7h7c4.2 2.6 6.6 7.8 6.6 15.7z"/>
    <path d="M22.5 1.2c.72 0 1.3.58 1.3 1.3v2.7h2.7c.72 0 1.3.58 1.3 1.3s-.58 1.3-1.3 1.3h-2.7v2.7c0 .72-.58 1.3-1.3 1.3s-1.3-.58-1.3-1.3V7.8h-2.7c-.72 0-1.3-.58-1.3-1.3s.58-1.3 1.3-1.3h2.7V2.5c0-.72.58-1.3 1.3-1.3z"/>
    <path d="M17.3 13.9c3.2-1.5 7.2-1.5 10.4 0" fill="none" stroke-width="1.3" stroke-linecap="round"/>`,

};

/** Extra engraved lines that read as detail at 40px+ and never muddy smaller sizes. */
const DETAIL: Partial<Record<PieceRole, string>> = {
  rook: `<g><path d="M12.95 19.6h19.1M12.9 24.4h19.2" fill="none" stroke="var(--piece-detail)" stroke-width="1.1" stroke-linecap="round" opacity=".75"/></g>`,
  bishop: `<g><path d="M16.35 20.4 28.65 9.1" fill="none" stroke="var(--piece-detail)" stroke-width="1.5" stroke-linecap="round" opacity=".8"/></g>`,
  knight: `<g><path d="M20.6 22.2 27.9 20.4M21.9 25.1 28.9 23.2" fill="none" stroke="var(--piece-detail)" stroke-width="1.1" stroke-linecap="round" opacity=".7"/></g>`,
  queen: `<g><path d="M11.6 22.2h21.8" fill="none" stroke="var(--piece-detail)" stroke-width="1.1" stroke-linecap="round" opacity=".7"/></g>`,
  king: `<g><path d="M12.3 22.4h20.4" fill="none" stroke="var(--piece-detail)" stroke-width="1.1" stroke-linecap="round" opacity=".7"/></g>`,
};

/** Vertical highlight that gives the pieces their "turned wood" look. */
const SHEEN = `<path d="M17.4 12.5c-1.1 3.2-1.3 6.6-.6 9.6" fill="none" stroke="var(--piece-sheen)" stroke-width="2" stroke-linecap="round" opacity=".45"/>`;

/** @param role piece role @param color 'white' | 'black' */
function markup(role: PieceRole, color: 'white' | 'black'): string {
  const fill = color === 'white' ? 'var(--piece-white)' : 'var(--piece-black)';
  const edge = color === 'white' ? 'var(--piece-white-edge)' : 'var(--piece-black-edge)';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="45" height="45">` +
    `<g fill="${fill}" stroke="${edge}" stroke-width="1.45" stroke-linejoin="round" stroke-linecap="round">` +
    BODIES[role] +
    `</g>` +
    (DETAIL[role] ?? '') +
    (role === 'knight' ? '' : SHEEN) +
    `</svg>`
  );
}

const CACHE = new Map<string, string>();

/**
 * A CSS `url("data:image/svg+xml,...")` value for a piece.
 * Chessground paints pieces with background-image, which is why we hand back a
 * data URI rather than inline markup.
 */
export function pieceImage(role: PieceRole, color: 'white' | 'black'): string {
  const key = `${role}-${color}`;
  let v = CACHE.get(key);
  if (!v) {
    // The payload must survive being embedded in a CSS url() token inside an
    // inline <style>, so every structural character is percent-encoded.
    const svg = markup(role, color)
      .replace(/%/g, '%25')
      .replace(/</g, '%3C')
      .replace(/>/g, '%3E')
      .replace(/"/g, "'")
      .replace(/#/g, '%23')
      .replace(/'/g, '%27')
      .replace(/ /g, '%20');
    v = `url("data:image/svg+xml,${svg}")`;
    CACHE.set(key, v);
  }
  return v;
}

/** Emits the CSS rules chessground needs to paint the set. */
export function pieceCss(): string {
  const roles: PieceRole[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
  const colors = ['white', 'black'] as const;
  return roles
    .flatMap((role) =>
      colors.map(
        (color) =>
          `.cg-wrap piece.${role}.${color} { background-image: ${pieceImage(role, color)}; }`,
      ),
    )
    .join('\n');
}
