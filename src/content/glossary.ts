/**
 * Chess terminology, standardised so that lessons, hints and the puzzle theme
 * filter all use the same word for the same thing.
 *
 * Japanese first, with the English original in parentheses, which is how
 * Japanese players actually meet these terms. Also exported in-app as a
 * searchable glossary.
 *
 * Entries are deliberately short and split into bullets: long Japanese
 * paragraphs are hard to keep error-free, and short lines are also easier to
 * scan on a phone.
 */

export type GlossCategory = '基本' | '戦術' | '戦略' | '定石' | '終盤' | 'ルール';

export interface GlossaryEntry {
  term: string;
  en: string;
  category: GlossCategory;
  /** One-line definition. */
  short: string;
  /** Bullet points, each a short complete sentence. */
  points: string[];
  /** Optional playable position. */
  example?: { fen: string; solution: string; note: string };
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'チェック',
    en: 'check',
    category: '基本',
    short: '相手の王を直接攻めている状態。',
    points: [
      '次の相手の番までに、チェックを受けながら応じなければなりません。',
      '相手の駒で王を捕まえることはできません。',
    ],
  },
  {
    term: 'チェックメイト',
    en: 'checkmate',
    category: '基本',
    short: '王がチェックを受け、逃げ場もない状態。',
    points: [
      'ゲームは即座に終わり、取った側が勝ちます。',
      '詰めるとは、この状態を作ることです。',
    ],
    example: {
      fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
      solution: 'Ra8',
      note: '最終列を塞ぐと、後ろの黒駒は助けてくれません。',
    },
  },
  {
    term: 'ステイルメイト',
    en: 'stalemate',
    category: '基本',
    short: '手番が来たのに合法手がない状態。',
    points: [
      '王にチェックがかかっていない点が重要です。',
      'この場合、引き分けになります。',
    ],
  },
  {
    term: 'フォーク',
    en: 'fork',
    category: '戦術',
    short: '一度に2つ以上の駒を同時に狙う手。',
    points: [
      '相手の駒が2つ以上同時に攻撃されます。',
      '両方とも動けないため、少なくとも1つは取られません。',
      'ナイトによるフォークが最もよく.uidされます。',
    ],
    example: {
      fen: '4k3/8/8/3n4/8/4N3/8/4K3 w - - 0 1',
      solution: 'Nxd5',
      note: '相手ナイトを一気に狙います。',
    },
  },
  {
    term: 'ピン',
    en: 'pin',
    category: '戦術',
    short: '駒が動けないよう固定されている状態。',
    points: [
      '自分の駒の先に相手の重要駒があります。',
      '動くと重要駒を取られるため、動けません。',
    ],
  },
  {
    term: 'スキューア',
    en: 'skewer',
    category: '戦術',
    short: '重要駒の前を透かして、奥の駒を取らせる手。',
    points: ['ピンと対になる考え方です。', '相手の重要駒を脅かしてから奥を取ります。'],
  },
  {
    term: '発見攻撃',
    en: 'discovered attack',
    category: '戦術',
    short: '駒を動かすと現れる、隠れていた攻撃。',
    points: [
      '遮っていた駒が動いたことで攻撃が成立します。',
      '発見チェックという形もあります。',
    ],
  },
  {
    term: 'バックラン',
    en: 'back rank',
    category: '戦術',
    short: '最終列にいる駒が逃げられない状態。',
    points: ['自駒で最終列を塞いでおくと相手に大きな弱点になります。'],
  },
  {
    term: '大失敗',
    en: 'blunder',
    category: '戦術',
    short: '駒数を大きく失う手。',
    points: ['その手で駒が1つ以上取られます。', '対局後に自動で指摘されます。'],
  },
  {
    term: '軽失',
    en: 'mistake',
    category: '戦術',
    short: '評価を大きく下げる手。',
    points: ['駒がただで失われるわけではないものの、形が悪くなります。'],
  },
  {
    term: '三角',
    en: 'triangle',
    category: '戦術',
    short: '駒を三方のマスに往復させる交換。',
    points: ['相手に異なる手で牽制しながら、形を変えて進めます。'],
  },
  {
    term: '終盤',
    en: 'endgame',
    category: '終盤',
    short: '駒数が減った最後の段階。',
    points: ['ポーンの重要度が増します。', '王も盛んに動きます。'],
  },
  {
    term: 'オポジション',
    en: 'opposition',
    category: '終盤',
    short: '2人の王が真ん中で向かい合う配置。',
    points: ['王と歩兵だけの局面で最も重要です。'],
  },
  {
    term: 'ルセナ',
    en: 'Lucena',
    category: '終盤',
    short: 'ロークと歩兵で勝てる終盤の名局面。',
    points: ['王と歩兵とルークの配置です。', '手順を覚えておく必要があります。'],
  },
  {
    term: '定石',
    en: 'opening',
    category: '定石',
    short: '序盤でMEAよく使われる手順。',
    points: ['理屈ではなく、指し手として覚えます。'],
  },
  {
    term: '転回',
    en: 'transposition',
    category: '定石',
    short: '順番が違うだけで同じ形になること。',
    points: ['序盤は「形」を覚えると Fuse て强くなります。'],
  },
  {
    term: '三回同一局面',
    en: 'threefold repetition',
    category: 'ルール',
    short: '同じ局面が3回現れたら引き分けにできる。',
    points: ['FIDE 5.2.2 の規定です。', '5回現れた場合は自動的BGMです。'],
  },
  {
    term: '50手ルール',
    en: 'fifty-move rule',
    category: 'ルール',
    short: '50手以内に駒が取られず、王も動かないと引き分け。',
    points: ['FIDE 9.6 の規定です。'],
  },
  {
    term: '指し手を触る',
    en: 'touch move',
    category: 'ルール',
    short: '持ち駒に触れた時点で、その駒を動かす必要があります。',
    points: ['対面対戦の考え方です。'],
  },
];

export const GLOSSARY_CATEGORIES: GlossCategory[] = [
  '基本',
  '戦術',
  '戦略',
  '定石',
  '終盤',
  'ルール',
];

export function hasTerm(term: string): boolean {
  return GLOSSARY.some((g) => g.term === term || g.en === term);
}