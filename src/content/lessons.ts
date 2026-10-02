/**
 * Learn mode: nine classes, from absolute beginner to advanced reference.
 *
 * Each lesson is prose split into short lines (see glossary.ts for why), plus
 * a board exercise the player must actually perform, and a comprehension quiz.
 * The prose is deliberately short per line so it stays correct and scannable on
 * a phone.
 */

export interface LessonStep {
  /** A heading or a short instruction line. */
  heading: string;
  /** Bullet lines. */
  lines?: string[];
}

export interface BoardTask {
  /** Position to set up. */
  fen: string;
  prompt: string;
  /** Legal moves that complete the task, in SAN. */
  accept: string[];
  /** What the learner should understand. */
  explain: string;
}

export interface QuizQuestion {
  question: string;
  choices: string[];
  /** Index into choices. */
  answer: number;
  explain: string;
}

export interface Lesson {
  id: string;
  classLevel: number;
  title: string;
  summary: string;
  minutes: number;
  steps: LessonStep[];
  task?: BoardTask;
  quiz?: QuizQuestion[];
}

export interface ClassLevel {
  level: number;
  title: string;
  subtitle: string;
  goal: string;
}

export const CLASSES: ClassLevel[] = [
  { level: 0, title: '第0級', subtitle: 'ルールと盤面', goal: 'チェスを 指せる ようになる' },
  { level: 1, title: '第1級', subtitle: '基本戦術', goal: '詰めの考え方が身につく' },
  { level: 2, title: '第2級', subtitle: '組み合わせ戦術', goal: '手順を作れるようになる' },
  { level: 3, title: '第3級', subtitle: '定石の基礎', goal: '序盤の理屈が分かる' },
  { level: 4, title: '第4級', subtitle: '定石の本命', goal: '自分の定石が選べる' },
  { level: 5, title: '第5級', subtitle: '中盤の戦略', goal: 'ポーン構造で計画が立てられる' },
  { level: 6, title: '第6級', subtitle: '終盤', goal: '駒数が減っても勝てる' },
  { level: 7, title: '第7級', subtitle: '上達の実践', goal: '強くなるための方法を自分の習慣にする' },
  { level: 8, title: '第8級', subtitle: '上級のリファレンス', goal: '用語と概念を自分の言葉で説明できる' },
];
/**
 * Lesson bodies.
 *
 * Rule: prose is written as short lines. Long Japanese sentences are hard to
 * keep free of typos, and short lines are also easier to read on a phone.
 */
export const LESSONS: Lesson[] = [
  {
    id: 'l0-1',
    classLevel: 0,
    title: '駒の動き',
    summary: '8種類の駒がどう動くかを覚えます。',
    minutes: 10,
    steps: [
      { heading: 'ポーン', lines: ['前に1マスだけ進みます。', '最初の1手だけ2マス進めます。', '斜め前に相手駒があれば取れます。'] },
      { heading: 'ナイト', lines: ['L字型に飛びます。', '他の駒を飛び越えられます。'] },
      { heading: 'ビショップ', lines: ['斜め方向に何マスでも動きます。'] },
      { heading: 'ルーク', lines: ['縦横に何マスでも動きます。'] },
      { heading: 'クイーン', lines: ['斜め、縦横のすべてに動きます。'] },
      { heading: 'キング', lines: ['どの向きにも1マスだけ動きます。', 'ただしチェックは受けられません。'] },
    ],
    task: {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      prompt: '白のナイトを g1 から f3 へ動かしてください。',
      accept: ['Nf3'],
      explain: 'ナイトは他の駒を飛び越えて動けます。',
    },
    quiz: [
      {
        question: 'ナイトが動ける形はどれですか。',
        choices: ['斜め1マス', 'L字型', '縦に何マスでも'],
        answer: 1,
        explain: 'ナイトは L 字型に動きます。他の駒を飛び越えられます。',
      },
    ],
  },
  {
    id: 'l0-2',
    classLevel: 0,
    title: 'チェックとチェックメイト',
    summary: '王への攻撃と、ゲームの終わり方を学びます。',
    minutes: 12,
    steps: [
      { heading: 'チェック', lines: ['相手の王を直接攻撃する状態をチェックといいます。', 'チェックを受けた側は、必ず次の手で_checksies応じなければなりません。'] },
      { heading: 'チェックメイト', lines: ['王がチェックを受け、逃げ場もない状態がチェックメイトです。', 'ゲームはそこで終わり、取った側が勝ちます。'] },
      { heading: 'ステイルメイト', lines: ['チェックされていないのに合法手がなくなる状態です。', 'この場合は引き分けになります。'] },
    ],
    task: {
      fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
      prompt: '白のルークを a1 から a8 へ。詰めてください。',
      accept: ['Ra8'],
      explain: '最終列を塞ぐと、黒の王は逃げる場所がありません。',
    },
    quiz: [
      {
        question: 'ステイルメイトは白の勝ちになりますか。',
        choices: ['白の勝ち', '黒の勝ち', '引き分け'],
        answer: 2,
        explain: 'チェックではなく合法手がない状態なので、引き分けです。',
      },
    ],
  },
  {
    id: 'l1-1',
    classLevel: 1,
    title: 'フォークとピン',
    summary: '最も多い2つの戦術を覚えます。',
    minutes: 15,
    steps: [
      { heading: 'フォーク', lines: ['一度に2つ以上の駒を同時に狙います。', '両方とも動けないため、少なくとも1つは取られません。'] },
      { heading: 'ピン', lines: ['自分の駒の先に相手の重要駒があると、その駒は動けません。', '動くと重要駒を取られるからです。'] },
      { heading: 'スキューア', lines: ['ピンの逆です。重要駒を胁かして、奥の駒を取ります。'] },
    ],
    task: {
      fen: '4k3/8/8/3n4/8/4N3/8/4K3 w - - 0 1',
      prompt: '白のナイトで d5 の黒ナイトを捕まえてください。',
      accept: ['Nxd5'],
      explain: 'ナイトは 1 手で d5 へ飛べます。',
    },
    quiz: [
      {
        question: 'フォークの効果はなんですか。',
        choices: ['相手の駒が2つ以上同時に狙われる', '王の安全が高くなる', 'ポーンが passer になる'],
        answer: 0,
        explain: '2つ同時に狙われると、少なくとも1つは守れません。',
      },
    ],
  },
];