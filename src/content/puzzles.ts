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
  mate1: '1手詰め',
  mate2: '2手詰め',
  mate3: '3手詰め',
  fork: 'フォーク',
  pin: 'ピン',
  skewer: 'スキューア',
  discovered: '発見攻撃',
  backrank: 'バックランク',
  hanging: '浮いている駒',
  defence: '守備',
  endgame: '終盤',
};

export const PUZZLES: Puzzle[] = [
  {
    id: 'p001',
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solution: ['Ra8#'],
    themes: ['mate1', 'backrank'],
    rating: 600,
    title: 'バックランクの急所',
    hint: '黒のキングは自陣の歩兵に前方を塞がれています。',
    explain: 'a1のルークをa8へ進めることで、逃げ場のない黒キングを仕留めます。',
    detail: '8段目の横道にルークを滑り込ませると、黒には防ぐ手立てがありません。',
  },
  {
    id: 'p002',
    fen: 'q3k3/8/8/3N4/8/8/6PP/6K1 w - - 0 1',
    solution: ['Nc7+'],
    themes: ['fork'],
    rating: 700,
    title: '王とクイーンへのフォーク',
    hint: 'ナイトの独特な跳躍で、王とクイーンを同時に狙えるマスを探しましょう。',
    explain: 'Nc7+ と跳ぶことで、王手と同時にa8のクイーンを射程に収めます。',
    detail: '相手の王が逃げた後、次の手で悠々とクイーンを捕獲できます。',
  },
  {
    id: 'p003',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    solution: ['Qxf7#'],
    themes: ['mate1'],
    rating: 650,
    title: '急所f7への直撃',
    hint: '黒陣で最も守りの薄いマスはどこでしょうか。',
    explain: 'c4のビショップが利いているf7へクイーンを飛び込ませてメイトです。',
    detail: 'f7のポーンはキングしか守っていないため、序盤最大の弱点となります。',
  },
  {
    id: 'p004',
    fen: 'r4rk1/ppp2ppp/8/4q2Q/8/3B4/PPP2PPP/R4RK1 w - - 0 1',
    solution: ['Qxh7#'],
    themes: ['mate1'],
    rating: 700,
    title: 'バッテリーの直撃',
    hint: 'クイーンとビショップが同じ斜線上で協力しています。',
    explain: 'd3のビショップに支えられたクイーンでh7のポーンを取り、即座に詰みとなります。',
    detail: '大駒と小駒が一筋に並ぶ強力な連携をバッテリーと呼びます。',
  },
  {
    id: 'p005',
    fen: '3r4/8/8/8/3k4/8/8/R5K1 w - - 0 1',
    solution: ['Rd1+'],
    themes: ['skewer'],
    rating: 800,
    title: 'ルークのスキューア',
    hint: '相手のキングを攻めつつ、その背後にある駒を貫通して狙いましょう。',
    explain: 'Rd1+ と王手をかけることで、キングが退いた背後にあるd8のルークを取ることができます。',
    detail: '手前にある価値の高い駒を脅かし、奥の駒を貫通して捕らえるのがスキューアです。',
  },
  {
    id: 'p006',
    fen: 'r1bqk2r/pppp1ppp/8/2b1n3/4P3/8/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    solution: ['d4'],
    themes: ['fork'],
    rating: 650,
    title: '中央ポーンのフォーク',
    hint: 'ポーンを一歩前進させて、2つの敵駒を斜め前に捉えましょう。',
    explain: 'd4 と突くことで、c5のビショップとe5のナイトを同時に攻撃します。',
    detail: '相手はどちらか一方しか守れないため、確実に駒得できます。',
  },
  {
    id: 'p007',
    fen: '4k3/8/8/8/4b3/8/8/Q3K3 w - - 0 1',
    solution: ['Qa4+'],
    themes: ['fork', 'hanging'],
    rating: 700,
    title: '浮いた駒と王手を突く',
    hint: '王手をかけながら、守られていない駒を狙えるクイーンの手があります。',
    explain: 'Qa4+ で王手をかけつつ、無防備なe4のビショップを捉えます。',
    detail: '王手への対処を強要されている間に、浮いているビショップを確実に奪取します。',
  },
  {
    id: 'p008',
    fen: '4k3/3q4/8/4N3/8/8/4PPPP/4R1K1 w - - 0 1',
    solution: ['Nxd7'],
    themes: ['discovered', 'hanging'],
    rating: 750,
    title: '発見攻撃と重要駒の奪取',
    hint: 'e1のルークの射線を塞いでいるナイトを活用しましょう。',
    explain: 'Nxd7 で相手のクイーンを直接取り去ります。e列のルークの利きも通っています。',
    detail: 'ナイトが動くことで背後のルークによる脅威が同時に発生します。',
  },
  {
    id: 'p009',
    fen: '7k/3R2pp/5N2/8/8/8/8/7K w - - 0 1',
    solution: ['Rd8#'],
    themes: ['mate1'],
    rating: 800,
    title: 'ナイトとルークの連携',
    hint: 'f6のナイトがどのマスを支配しているかに注目してください。',
    explain: 'Rd8# で詰みです。ナイトがg8の逃げ道を封鎖しており、黒王は退路がありません。',
    detail: 'ルークとナイトが協力してキングを角に追い詰める典型的な詰み筋です。',
  },
  {
    id: 'p010',
    fen: '6rk/6pp/3N4/8/8/8/8/7K w - - 0 1',
    solution: ['Nf7#'],
    themes: ['mate1'],
    rating: 850,
    title: '窒息メイト（スマザード）',
    hint: '黒キングは自軍のルークとポーンに隙間なく囲まれています。',
    explain: 'Nf7# で詰みです。駒を飛び越えられるナイトならではの華麗な一撃です。',
    detail: '自分の駒に囲まれて逃げ場を失った王をナイトで討ち取る技をスマザードメイトと呼びます。',
  },
  {
    id: 'p011',
    fen: '7k/5ppp/7Q/8/8/2B5/8/6K1 w - - 0 1',
    solution: ['Qxg7#'],
    themes: ['pin', 'mate1'],
    rating: 750,
    title: 'ピンされた守備駒（ピンメイト）',
    hint: 'c3のビショップが睨みをつけているため、黒のg7歩兵は動けません。',
    explain: 'Qxg7# で詰みです。g7のポーンはピンされているため、クイーンを取り返すことができません。',
    detail: '守っているように見える駒でも、ピンされていれば守りの機能を失います。',
  },
  {
    id: 'p012',
    fen: '3rkr2/8/8/8/3N4/8/Q7/6K1 w - - 0 1',
    solution: ['Qe6#'],
    themes: ['mate1'],
    rating: 800,
    title: 'エポレットメイト（肩章メイト）',
    hint: '黒キングの両脇にいるルークが退路を完全に塞いでいます。',
    explain: 'Qe6# で詰みです。d4のナイトに守られたクイーンが黒王を仕留めます。',
    detail: 'キングの両脇にある自軍の駒が肩章のように逃げ道を塞いでしまう形をエポレットメイトと呼びます。',
  },
  {
    id: 'p013',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/5PP1/8/PPPPP2P/RNBQKBNR b KQkq - 0 1',
    solution: ['Qh4#'],
    themes: ['mate1'],
    rating: 600,
    title: '最速の教訓',
    hint: '白が序盤で無謀に突いた歩兵により、王への斜めの道ががら空きです。',
    explain: 'Qh4# で最速のチェックメイトです。白王を守る駒が何もありません。',
    detail: '序盤にfポーンやgポーンを不用意に突くと、致命的な斜めの弱点が生じます。',
  },
  {
    id: 'p014',
    fen: '3r3k/4P1pp/8/8/8/8/8/4K3 w - - 0 1',
    solution: ['exd8=Q#'],
    themes: ['mate1', 'backrank'],
    rating: 700,
    title: '昇格とバックランクの融合',
    hint: '敵のルークを取りながら最奥段へ到達できます。',
    explain: 'exd8=Q# でルークを取りつつクイーンに昇格し、そのままメイトとなります。',
    detail: 'ポーンの昇格（プロモーション）は一瞬で形勢を決定づける強力な武器です。',
  },
  {
    id: 'p015',
    fen: 'r3kbnr/p1pppppp/8/Pp6/Q7/8/1PPPPPPP/RNB1KBNR w KQkq b6 0 1',
    solution: ['axb6'],
    themes: ['hanging'],
    rating: 750,
    title: 'アンパッサンの権利',
    hint: '直前に2マス進んだ敵ポーンを特殊なルールですれ違いざまに捕獲できます。',
    explain: 'axb6 でアンパッサンが成立し、王手を防ごうとしたb5の黒ポーンを即座に捕獲します。',
    detail: '敵ポーンが2マス跳んだ直後の一手でのみ行使できる特別な権利です。斜線が再び開いて王手が継続します。',
  },
  {
    id: 'p016',
    fen: '3r2k1/5ppp/8/8/2b5/8/5PPP/R5K1 w - - 0 1',
    solution: ['f3'],
    themes: ['defence', 'backrank'],
    rating: 650,
    title: 'ルフト（呼吸の穴）を作る',
    hint: '奥段での詰みを防ぐため、キングに安全な退路を確保しましょう。',
    explain: 'f3 と突くことでキングの退路（f2）を確保し、黒ルークによるバックランクメイトを防ぎます。',
    detail: '攻めに夢中になる前に自軍の安全を確保する、実戦で最も大切な予防策です。',
  },
  {
    id: 'p017',
    fen: '8/8/4k3/8/4K3/4P3/8/8 w - - 0 1',
    solution: ['Kd4'],
    themes: ['endgame'],
    rating: 850,
    title: 'オポジションへの足がかり',
    hint: 'キングを前進させ、ポーンの通り道を切り拓きましょう。',
    explain: 'Kd4 と進めることで、ポーンの前進ルートを確保しつつ優位を築きます。',
    detail: '終盤のポーンエンディングでは、王自身が先頭に立って敵王を押し返す技術が勝敗を分けます。',
  },
  {
    id: 'p018',
    fen: '3r2k1/5ppp/8/8/8/8/1Q3PPP/3R2K1 w - - 0 1',
    solution: ['Rxd8#'],
    themes: ['backrank'],
    rating: 700,
    title: '最終列への侵入とメイト',
    hint: 'd列のルークを活用して、相手の守備駒を破りバックランクメイトを決めましょう。',
    explain: 'Rxd8# で詰みです。黒キングは自陣の歩兵に前方を塞がれており、逃げ道がありません。',
    detail: '守備している駒を取り去って一撃で仕留める、典型的なバックランクの手筋です。',
  },
  {
    id: 'p019',
    fen: '4k3/4q3/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: ['Rxe7+'],
    themes: ['pin'],
    rating: 800,
    title: '絶対的ピンとクイーンの奪取',
    hint: 'e列のルークが黒クイーンを王に対してピン（金縛り）にしています。',
    explain: 'Rxe7+ で無力化されたクイーンを奪い取ります。背後に王がいるため、クイーンは逃げることができませんでした。',
    detail: '王への射線上にいる駒はルール上動かせない「絶対的ピン」となります。どんな大駒でもピンされれば無力です。',
  },
  {
    id: 'p020',
    fen: 'r1bqk1nr/pppp1ppp/2n5/4p3/1b2P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    solution: ['c3'],
    themes: ['defence'],
    rating: 600,
    title: '王手からの脱出と反撃',
    hint: 'b4のビショップからのチェックを、ポーンで防ぎつつ相手を追い払いましょう。',
    explain: 'c3 と受けることで王手を解消しつつ、逆に敵ビショップを攻撃します。',
    detail: '守りと反撃を一手で両立させる、序盤の基本技術です。',
  },
];