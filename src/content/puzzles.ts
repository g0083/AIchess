/**
 * Tactics puzzles.
 *
 * Every puzzle is verified by scripts/verify-content.mjs (the FEN parses and
 * the solution is a legal move sequence). Do not add a puzzle without running
 * it: a wrong "solution" teaches the wrong thing.
 *
 * `themes` use the glossary terms, so the theme filter and the glossary agree.
 */

export type ThemeId =
  | 'mate1'
  | 'mate2'
  | 'mate3'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered'
  | 'backrank'
  | 'hanging'
  | 'defence'
  | 'endgame';

export interface Puzzle {
  id: string;
  fen: string;
  /** The player's moves, in SAN. */
  solution: string[];
  themes: ThemeId[];
  /** Estimated difficulty, used to build the rating bands. */
  rating: number;
  title: string;
  /** First hint, shown after 20 seconds. */
  hint: string;
  /** The lesson, shown after a correct answer. */
  explain: string;
  /** The longer hint, shown after the second request. */
  detail: string;
}

export const THEME_LABELS: Record<ThemeId, string> = {
  mate1: '1手で詰める',
  mate2: '2手で詰める',
  mate3: '3手で詰める',
  fork: 'フォーク',
  pin: 'ピン',
  skewer: 'スキューア',
  discovered: '発見攻撃',
  backrank: 'バックラン',
  hanging: 'あわれな駒',
  defence: '防御',
  endgame: '終盤',
};

export const PUZZLES: Puzzle[] = [
  {
    id: 'p001',
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solution: ['Ra8'],
    themes: ['mate1', 'backrank'],
    rating: 600,
    title: '最後の列',
    hint: '黒の王は、自分の駒で囲まれています。',
    explain: 'a列にルークが来ると、黒の王は自分の歩兵に塞がれて逃げられません。',
    detail: 'g7 や f7 の歩兵が動いても、その穴はすぐには開きません。',
  },
  {
    id: 'p002',
    fen: '4k3/8/8/3n4/8/4N3/8/4K3 w - - 0 1',
    solution: ['Nxd5'],
    themes: ['fork', 'hanging'],
    rating: 700,
    title: '守られない駒',
    hint: '白のナイトはどこへ跳べますか。',
    explain: '白のナイトは e3 から d5 へ跳べて、黒のナイトを取れます。',
    detail: 'd5 の黒ナイトは守られていない駒です。',
  },
  {
    id: 'p003',
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    solution: ['Ra8'],
    themes: ['mate1', 'backrank'],
    rating: 650,
    title: '同じ形比上年',
    hint: '黒の王は、自分の駒で囲まれています。',
    explain: 'a列がからんでいるので、Ra8 で詰めます。',
    detail: '黒の王は自分の歩兵の後ろに隠れています。',
  },
  {
    id: 'p004',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1',
    solution: ['Qe8'],
    themes: ['mate1'],
    rating: 800,
    title: 'クイーンでの詰め方',
    hint: '黒の王は自分の歩兵で囲まれています。',
    explain: 'e8 にクイーンが来ると、黒の王は 8 段目から出られません。',
    detail: '歩兵は 7 段目にいるので、8 段目の穴を埋めることはできません。',
  },
];