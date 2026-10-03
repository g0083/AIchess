/**
 * AI Coach: real-time move explanations, opponent threat detection,
 * hanging-piece analysis, and puzzle blunder diagnostics for beginners.
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_JA } from './rules';

export interface MoveAdvice {
  san: string;
  piece: PieceSymbol;
  pieceName: string;
  from: Square;
  to: Square;
  title: string;
  reason: string;
  category: 'mate' | 'capture' | 'check' | 'castle' | 'develop' | 'center' | 'defense' | 'tactic';
}

export interface OpponentThreat {
  type: 'mate' | 'attack' | 'check';
  title: string;
  message: string;
  targetSquare?: Square;
  threatSquare?: Square;
}

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

/**
 * Explains why a move is good in clear, natural Japanese.
 */
export function explainMove(fen: string, sanOrUci: string): MoveAdvice | null {
  const c = new Chess(fen);
  let mv;
  try {
    mv = c.move(sanOrUci);
  } catch {
    return null;
  }
  if (!mv) return null;

  const pieceName = PIECE_JA[mv.piece];
  const from = mv.from as Square;
  const to = mv.to as Square;

  // 1. Checkmate
  if (mv.san.includes('#')) {
    return {
      san: mv.san,
      piece: mv.piece,
      pieceName,
      from,
      to,
      title: 'チェックメイトの一撃',
      reason: '相手キングの退路を完全に塞ぎ、一発で勝利を決定づけます。',
      category: 'mate',
    };
  }

  // 2. Castling
  if (mv.flags.includes('k') || mv.flags.includes('q')) {
    return {
      san: mv.san,
      piece: mv.piece,
      pieceName,
      from,
      to,
      title: 'キャスリングで王の安全確保',
      reason: 'キングを安全地帯へ逃がしつつ、ルークを中央の主戦場へ素早く呼び込みます。',
      category: 'castle',
    };
  }

  // 3. Promotion
  if (mv.promotion) {
    return {
      san: mv.san,
      piece: mv.piece,
      pieceName,
      from,
      to,
      title: 'ポーンの昇格（プロモーション）',
      reason: '最奥段へ到達したポーンを最強のクイーンへと変身させ、圧倒的優位を築きます。',
      category: 'tactic',
    };
  }

  // 4. Capture
  if (mv.captured) {
    const targetName = PIECE_JA[mv.captured];
    const isFree = !c.isAttacked(to, c.turn());
    const isHigher = PIECE_VALUES[mv.captured] > PIECE_VALUES[mv.piece];

    let reason = `${targetName}を取り、マテリアル（駒の戦力）で有利に立ちます。`;
    if (isFree) {
      reason = `守られていない無防備な${targetName}をタダで奪取し、大きな駒得を果たします。`;
    } else if (isHigher) {
      reason = `価値の高い${targetName}をより小さな駒で仕留め、大成功の交換となります。`;
    }

    return {
      san: mv.san,
      piece: mv.piece,
      pieceName,
      from,
      to,
      title: `${targetName}の獲得`,
      reason,
      category: 'capture',
    };
  }

  // 5. Check
  if (mv.san.includes('+')) {
    return {
      san: mv.san,
      piece: mv.piece,
      pieceName,
      from,
      to,
      title: '相手の王へのチェック',
      reason: `${pieceName}で王手をかけ、相手に受け手を強要して主導権を握ります。`,
      category: 'check',
    };
  }

  // 6. Fork check (attacks 2+ enemy pieces)
  const afterMoves = c.moves({ verbose: true });
  const attackedPieces = afterMoves
    .filter((m) => m.from === to && m.captured)
    .map((m) => m.captured as PieceSymbol);
  const uniqueValuable = Array.from(new Set(attackedPieces)).filter(
    (p) => PIECE_VALUES[p] >= 3 || p === 'k',
  );
  if (uniqueValuable.length >= 2) {
    return {
      san: mv.san,
      piece: mv.piece,
      pieceName,
      from,
      to,
      title: `${pieceName}によるフォーク（両取り）`,
      reason: '1手で相手の複数の重要駒を同時に攻撃し、逃げ切れない一方を確実に奪います。',
      category: 'tactic',
    };
  }

  // 7. Center occupation by pawn
  if (mv.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(to)) {
    return {
      san: mv.san,
      piece: mv.piece,
      pieceName,
      from,
      to,
      title: '中央の占拠と支配',
      reason: '盤面の中央へポーンを進め、自軍の空間を広げて大駒の射線を開通させます。',
      category: 'center',
    };
  }

  // 8. Minor piece development
  const origin = new Chess(fen);
  if (
    (mv.piece === 'n' || mv.piece === 'b') &&
    origin.history().length < 16 &&
    (from.endsWith('1') || from.endsWith('8'))
  ) {
    return {
      san: mv.san,
      piece: mv.piece,
      pieceName,
      from,
      to,
      title: '小駒の積極展開',
      reason: `${pieceName}を初期位置から前線へ繰り出し、序盤の展開スピードでリードを奪います。`,
      category: 'develop',
    };
  }

  // 9. Escape / Defense (was attacked at `from`)
  const enemyColor: Color = origin.turn() === 'w' ? 'b' : 'w';
  if (origin.isAttacked(from, enemyColor)) {
    return {
      san: mv.san,
      piece: mv.piece,
      pieceName,
      from,
      to,
      title: `${pieceName}の安全な退避`,
      reason: `敵に狙われていた${pieceName}を安全なマスへ逃がし、損失を防ぎます。`,
      category: 'defense',
    };
  }

  // General positional advance
  return {
    san: mv.san,
    piece: mv.piece,
    pieceName,
    from,
    to,
    title: `${pieceName}の前進と好位置の確保`,
    reason: `${pieceName}をより働きの強いマスへ配置し、相手陣営への圧力を高めます。`,
    category: 'develop',
  };
}

/**
 * Analyzes the opponent's previous move and warns about their primary threat.
 */
export function explainOpponentThreat(
  fen: string,
  lastMove?: { from: string; to: string; san?: string },
): OpponentThreat | null {
  const c = new Chess(fen);
  const myColor = c.turn();
  const enemyColor: Color = myColor === 'w' ? 'b' : 'w';

  // 1. Are we currently in check?
  if (c.inCheck()) {
    return {
      type: 'check',
      title: '王手（チェック）を受けています！',
      message: 'キングが直接攻撃されています。王を逃がす、合駒をする、攻撃駒を取るのいずれかで対処してください。',
    };
  }

  // 2. Can the opponent deliver checkmate if we do nothing?
  // Simulate null move by flipping turn
  const testFen = flipTurn(fen);
  if (testFen) {
    try {
      const probe = new Chess(testFen);
      const mates = probe.moves({ verbose: true }).filter((m) => m.san.includes('#'));
      if (mates.length > 0) {
        const m = mates[0];
        return {
          type: 'mate',
          title: '致命的なメイトの脅威！',
          message: `警戒してください。相手は次の手で ${m.san} によるチェックメイトを狙っています。`,
          threatSquare: m.to as Square,
        };
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Did the opponent just attack one of our valuable pieces?
  if (lastMove) {
    const movedPiece = c.get(lastMove.to as Square);
    if (movedPiece) {
      // Find my pieces that are under attack
      const mySquares: Square[] = [];
      for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8']) {
        for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
          const sq = (file + rank) as Square;
          const p = c.get(sq);
          if (p && p.color === myColor) {
            if (c.isAttacked(sq, enemyColor)) {
              mySquares.push(sq);
            }
          }
        }
      }

      // Check if valuable pieces (Q, R, or undefended pieces) are targeted
      for (const sq of mySquares) {
        const p = c.get(sq);
        if (!p) continue;
        const isFree = !c.isAttacked(sq, myColor);
        if (p.type === 'q' || p.type === 'r' || isFree) {
          const pieceName = PIECE_JA[p.type];
          return {
            type: 'attack',
            title: `${pieceName}が狙われています`,
            message: `相手の着手により、${sq} にいるあなたの${pieceName}が攻撃の射程に入りました。逃がすか守りを足しましょう。`,
            targetSquare: sq,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Finds all friendly pieces that are under attack without sufficient defense (hanging).
 */
export function detectHangingPieces(fen: string, color: Color): Square[] {
  const c = new Chess(fen);
  const enemyColor: Color = color === 'w' ? 'b' : 'w';
  const hanging: Square[] = [];

  for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8']) {
    for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const sq = (file + rank) as Square;
      const piece = c.get(sq);
      if (!piece || piece.color !== color || piece.type === 'k') continue;

      const isAttacked = c.isAttacked(sq, enemyColor);
      if (!isAttacked) continue;

      const isDefended = c.isAttacked(sq, color);
      if (!isDefended) {
        hanging.push(sq);
      }
    }
  }

  return hanging;
}

/**
 * Generates an instructive explanation for why a puzzle attempt was incorrect.
 */
export function explainPuzzleBlunder(
  fen: string,
  attemptedSan: string,
  correctSan: string,
): string {
  const c = new Chess(fen);
  let mv;
  try {
    mv = c.move(attemptedSan);
  } catch {
    return 'その手はルール上指すことができません。';
  }
  if (!mv) return '別の手を考えてみましょう。';

  const enemyColor: Color = c.turn();

  // 1. Did the move miss a direct checkmate?
  if (correctSan.includes('#')) {
    return `惜しいです！この局面では「${correctSan}」を指すことで、1手でチェックメイトにすることができました。`;
  }

  // 2. Was the moved piece put on an attacked square for free?
  const to = mv.to as Square;
  const isAttacked = c.isAttacked(to, enemyColor);
  const isDefended = c.isAttacked(to, mv.color);
  if (isAttacked && !isDefended) {
    const name = PIECE_JA[mv.piece];
    return `そのマスへ動かすと、せっかくの${name}が相手にタダで取られてしまいます。`;
  }

  // 3. General helpful nudge
  if (correctSan.includes('+')) {
    return `正解手は相手の王に直接プレッシャーを与える王手（${correctSan}）です。王手筋を探してみましょう。`;
  }

  return `その手では相手の守りを突破できません。より決定的な一手（${correctSan}）を探してみましょう。`;
}

/** Helper to toggle turn in FEN for hypothetical null-move analysis. */
function flipTurn(fen: string): string | null {
  const parts = fen.split(' ');
  if (parts.length < 2) return null;
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  return parts.join(' ');
}
