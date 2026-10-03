/**
 * Opening repertoire.
 *
 * Each opening records a recommended move order, the ideas behind it, the
 * usual beginner mistakes, and counter-openings. The move order drives the
 * opening trainer, which hides a random move and asks the player to recall it.
 *
 * Identifiers are ASCII on purpose: only display text is Japanese.
 */

export type OpeningFamily = 'e4' | 'd4' | 'c4' | 'indian';

export interface OpeningLine {
  /** The recommended order, in SAN, starting from move 1. */
  moves: string[];
  /** One short idea per phase. */
  ideas: string[];
  /** The usual mistakes beginners make in this line. */
  mistakes: string[];
  /** Openings that transpose into this one. */
  transposes?: string[];
  /** Suggested replies for the opponent, for counter-tests. */
  counters?: string[];
}

export interface Opening {
  id: string;
  name: string;
  /** English name, for reference only. */
  en: string;
  family: OpeningFamily;
  /** 1 = easy, 3 = demanding. */
  difficulty: 1 | 2 | 3;
  summary: string;
  lines: OpeningLine[];
}

export const FAMILY_LABELS: Record<OpeningFamily, string> = {
  e4: '1.e4 系（王道のオープンゲーム）',
  d4: '1.d4 系（重厚なクローズドゲーム）',
  c4: '1.c4 系（柔軟なフランク戦法）',
  indian: 'インド系（近代的ハイパーモダン）',
};

export const OPENINGS: Opening[] = [
  {
    id: 'italian',
    name: 'イタリアン・ゲーム',
    en: 'Italian Game',
    family: 'e4',
    difficulty: 1,
    summary: 'もっとも古典的で初心者から上級者まで愛される王道のオープニングです。',
    lines: [
      {
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
        ideas: [
          '中央のe4にポーンを進めて空間を確保します。',
          '黒もe5と受けて中央で対抗します。',
          'ナイトを展開してe5のポーンを攻撃します。',
          '黒はNc6でe5のポーンを守りつつ展開します。',
          'ビショップをc4へ出し、黒陣最大の弱点であるf7を直接狙います。',
        ],
        mistakes: [
          '早い段階でh3などの不要な端歩を突いて手番を浪費すること。',
          'f7を無理に狙いすぎて駒の連携を失うこと。',
        ],
        transposes: ['ビショップス・オープニング'],
        counters: ['ツー・ナイツ・ディフェンス (3... Nf6)', 'ジオッコ・ピアノ (3... Bc5)'],
      },
    ],
  },
  {
    id: 'ruy-lopez',
    name: 'ルイ・ロペス（スペイン戦法）',
    en: 'Ruy Lopez',
    family: 'e4',
    difficulty: 2,
    summary: '500年以上の歴史を持つ、チェス界で最も深く研究された最高峰の定石です。',
    lines: [
      {
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
        ideas: [
          '中央の主導権を握るためe4を進めます。',
          '黒の自然なe5に対してf3のナイトで圧力をかけます。',
          'Bb5と進めてe5を守るc6のナイトを間接的に牽制します。',
        ],
        mistakes: [
          'Bxc6ですぐにナイトを取り、白の強力なビショップを手放してしまうこと。',
        ],
        counters: ['モーフィー・ディフェンス (3... a6)', 'ベルリン・ディフェンス (3... Nf6)'],
      },
    ],
  },
  {
    id: 'sicilian',
    name: 'シシリアン・ディフェンス',
    en: 'Sicilian Defence',
    family: 'e4',
    difficulty: 3,
    summary: '白の1.e4に対して最も勝率が高く、激しい攻防が繰り広げられる黒の最強戦法です。',
    lines: [
      {
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'],
        ideas: [
          '白のe4に対して、非対称なc5で中央の不均衡を作ります。',
          'd4と突いて中央をこじ開けに来る白に対して、cxd4でポーンを交換します。',
          '黒はセミオープンとなったc列を使って反撃の足がかりを築きます。',
        ],
        mistakes: [
          '序盤のキングサイドの安全を軽視し、白の急襲を許してしまうこと。',
        ],
        counters: ['オープン・シシリアン', 'アラピン・バリエーション (2. c3)'],
      },
    ],
  },
  {
    id: 'french',
    name: 'フレンチ・ディフェンス',
    en: 'French Defence',
    family: 'e4',
    difficulty: 2,
    summary: '頑丈なポーンチェーンを築き、白の中央を反撃する堅固な防御戦法です。',
    lines: [
      {
        moves: ['e4', 'e6', 'd4', 'd5'],
        ideas: [
          '1...e6と準備し、次手2...d5で白の中央ポーンを直接叩きます。',
          '強固な陣形を作り、後からc5と突いて白の拠点d4を崩しにかかります。',
        ],
        mistakes: [
          'c8の白マスビショップが自軍のポーンに閉じ込められて働かなくなること。',
        ],
        counters: ['アドバンス・バリエーション (3. e5)', 'タラッシュ・バリエーション (3. Nd2)'],
      },
    ],
  },
  {
    id: 'queens-gambit',
    name: 'クイーンズ・ギャンビット',
    en: "Queen's Gambit",
    family: 'd4',
    difficulty: 2,
    summary: '中央の完全制覇を目指してc4ポーンを差し出す、1.d4の代表的定石です。',
    lines: [
      {
        moves: ['d4', 'd5', 'c4'],
        ideas: [
          'd4で中央を占拠し、c4を突いて黒のd5ポーンの支えを崩しにかかります。',
          '黒がc4を取れば、白はe4を突いて広大な中央支配を完成させます。',
        ],
        mistakes: [
          '黒が取ったc4ポーンを無理に守ろうとして陣形を崩してしまうこと。',
        ],
        counters: ['クイーンズ・ギャンビット・ディクラインド (2... e6)', 'スラヴ・ディフェンス (2... c6)'],
      },
    ],
  },
  {
    id: 'kings-indian',
    name: 'キングズ・インディアン・ディフェンス',
    en: "King's Indian Defence",
    family: 'indian',
    difficulty: 3,
    summary: 'あえて白に中央を持たせ、後から激しいキングサイド攻撃で逆転を狙う近代戦法です。',
    lines: [
      {
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
        ideas: [
          'フィアンケット（g7へのビショップ配置）で長斜線を支配します。',
          '白が中央を固めた後、e5やf5と突いて白キングへダイレクトな総攻撃を仕掛けます。',
        ],
        mistakes: [
          '白のクイーンサイドでの突破速度を見誤り、攻撃が届く前に押し切られること。',
        ],
        counters: ['クラシカル・バリエーション', 'ゼーミッシュ・バリエーション'],
      },
    ],
  },
  {
    id: 'english',
    name: 'イングリッシュ・オープニング',
    en: 'English Opening',
    family: 'c4',
    difficulty: 2,
    summary: '側面から中央d5を間接的に支配する、柔軟で奥深い大人の戦法です。',
    lines: [
      {
        moves: ['c4', 'e5', 'Nc3', 'Nf6', 'g3'],
        ideas: [
          'c4からd5マスを制圧し、相手の出方に応じて様々な形へ変化できます。',
          'ポーンの直接衝突を避け、長期的な配置の妙で勝負します。',
        ],
        mistakes: [
          '方針が定まらないまま手待ちをして、相手に中央の自由を与えてしまうこと。',
        ],
        counters: ['リバース・シシリアン (1... e5)', '対称バリエーション (1... c5)'],
      },
    ],
  },
];