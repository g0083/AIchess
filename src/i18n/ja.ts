/**
 * The single Japanese message catalog.
 *
 * HARD RULE: every string a player can see lives here (or in src/content/*,
 * which is also Japanese). No English ships to the UI. `scripts/verify-content.mjs`
 * fails the build if a key is missing or if Latin text leaks into user-facing
 * copy, so this file is the contract, not a convenience.
 *
 * Identifiers and code comments stay in English; that is deliberate.
 */

export const ja = {
  // ---- app shell -------------------------------------------------------
  'app.name': '将棋盤チェス',
  'app.tagline': '対戦も、学習も。',
  'app.install': 'インストール',
  'app.installed': 'インストール済み',
  'app.installHint': 'ホーム画面に追加するとオフラインでも起動できます。',
  'app.installLater': 'あとで',
  'app.skip': '閉じる',
  'app.offlineReady': 'オフラインでも遊べます',
  'app.menu': 'メニュー',
  'app.back': '戻る',
  'app.close': '閉じる',
  'app.cancel': 'キャンセル',
  'app.confirm': '確定',
  'app.save': '保存',
  'app.delete': '削除',
  'app.edit': '編集',
  'app.copy': 'コピー',
  'app.copied': 'コピーしました',
  'app.retry': '再試行',
  'app.loading': '読み込み中',
  'app.error': 'エラー',
  'app.ok': 'OK',
  'app.yes': 'はい',
  'app.no': 'いいえ',
  'app.reset': '初期化',
  'app.resetConfirm': '初期化しますか？この操作は取り消せません。',
  'app.more': 'もっと見る',
  'app.less': '少なく',
  'app.step': '手順',
  'app.next': '次へ',
  'app.prev': '前へ',
  'app.finish': '完了',
  'app.search': '検索',
  'app.noResults': '該当なし',

  // ---- navigation ------------------------------------------------------
  'nav.home': 'ホーム',
  'nav.play': '対戦',
  'nav.learn': '学習',
  'nav.meta': '実績',
  'nav.settings': '設定',
  'nav.play.ai': 'AI対戦',
  'nav.play.local': 'オフライン2人',
  'nav.play.online': 'P2P対戦',
  'nav.play.analysis': '検討',

  // ---- home ------------------------------------------------------------
  'home.greeting': 'ようこそ',
  'home.continue': '前回の続きから',
  'home.quickAi': 'すぐにAIと対戦',
  'home.quickLocal': '同じ端末で2人対戦',
  'home.quickOnline': 'QRコードで友達と対戦',
  'home.streak': '連続学習日数',
  'home.puzzleRating': 'パズル評価',
  'home.aiRating': 'AIラダー評価',
  'home.daily': '今日の課題',
  'home.resumeGame': '対局を再開',

  // ---- board & game ---------------------------------------------------
  'board.turn.white': '白の手番',
  'board.turn.black': '黒の手番',
  'board.you': 'あなた',
  'board.white': '白',
  'board.black': '黒',
  'board.flip': '盤面を反転',
  'board.copyFen': 'FENをコピー',
  'board.fenCopied': 'FENをコピーしました',
  'board.pgn': '棋譜',
  'board.moves': '指し手',
  'board.movesEmpty': 'まだ指していません',
  'board.start': '初期局面',
  'board.resign': '投了',
  'board.draw': '引き分け',
  'board.drawOffer': '引き分けを申し出る',
  'board.drawOffered': '相手が引き分けを申し出ました',
  'board.accept': '受け入れる',
  'board.decline': '拒む',
  'board.takeback': '取り消し',
  'board.takebackUsed': '取り消しは1回までです',
  'board.newGame': '新しい対局',
  'board.rematch': '再戦',
  'board.undo': '1手戻す',
  'board.redo': '1手進める',
  'board.hint': 'ヒント',
  'board.hintNext': '次の一手を表示',
  'board.prevPly': '前の局面',
  'board.nextPly': '次の局面',
  'board.goToStart': '初期局面へ',
  'board.goToEnd': '最終局面へ',
  'board.copyPgn': 'PGNをコピー',
  'board.pgnCopied': 'PGNをコピーしました',
  'board.share': '共有',
  'board.piece.white': '白の駒',
  'board.piece.black': '黒の駒',
  'board.spectating': '観戦中',

  // ---- clock -----------------------------------------------------------
  'clock.white': '白',
  'clock.black': '黒',
  'clock.bye': 'バイヨミー',
  'clock.periods': '期',
  'clock.byoyomi': 'バイヨミー',
  'clock.increment': '増設',
  'clock.untimed': '無制限',

  // ---- results ---------------------------------------------------------
  'result.checkmate': 'チェックメイト',
  'result.stalemate': 'ステイルメイト',
  'result.threefold': '三回同一局面',
  'result.fiftyMove': '50手ルール',
  'result.insufficient': '決着不能（材料不足）',
  'result.timeout': '時間切れ',
  'result.resignation': '投了',
  'result.agreement': '合意',
  'result.win': '勝ち',
  'result.loss': '負け',
  'result.draw': '引き分け',
  'result.youWin': 'あなたの勝ちです',
  'result.youLose': '敗北しました',
  'result.drawTitle': '引き分け',
  'result.again': 'もう一度',
  'result.review': '対局を検討',

  // ---- evaluation ------------------------------------------------------
  'eval.white': '白有利',
  'eval.black': '黒有利',
  'eval.equal': '均衡',
  'eval.slightWhite': '白やや優勢',
  'eval.slightBlack': '黒やや優勢',
  'eval.clearlyWhite': '白が明確に優勢',
  'eval.clearlyBlack': '黒が明確に優勢',
  'eval.winWhite': '白の必勝',
  'eval.winBlack': '黒の必勝',
  'eval.thinking': '計算中',
  'eval.engine': 'エンジン評価',
  'eval.loading': 'エンジンを起動しています',
  'eval.unavailable': '評価を利用できません',
} as const;

export type MsgKey = keyof typeof ja;

/** Translator. Japanese has no plural forms, so `{n}` interpolation is enough. */
export function t(key: MsgKey, vars?: Record<string, string | number>): string {
  let s: string = ja[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

/** All keys, used by the content verifier. */
export const messageKeys = Object.keys(ja) as MsgKey[];

/** A short Japanese random name, used as the default display name. */
export function randomDisplayName(): string {
  const head = ['黄昏', '白駒', '黒澤', '銀杏', '若葉', '書斎', '山櫨', '雨後'];
  const tail = ['の騎士', 'の歩兵', 'の将軍', 'の侍', 'の吟遊詩人', 'の銀河'];
  const h = head[Math.floor(Math.random() * head.length)];
  const t2 = tail[Math.floor(Math.random() * tail.length)];
  return `${h}${t2}`;
}
