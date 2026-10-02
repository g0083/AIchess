/**
 * AI opponent configuration and difficulty model.
 *
 * Difficulty is NOT a single number. It is the combination of:
 *   - how much the engine is allowed to search (depth / time / nodes)
 *   - how often it deliberately picks a sub-optimal move (MultiPV blending)
 *   - a skill-level style filter that suppresses moves far below the median
 *   - a temperature that widens the sampling among the surviving moves
 *
 * A 400-rated beginner should lose to a human the way a beginner loses: by
 * missing a threat, not by playing a rook backwards on move 2 and offering a
 * queen. Blending from MultiPV is what makes the mistakes look human.
 */

export type LevelId =
  | 'beginner'
  | 'beginnerPlus'
  | 'casual'
  | 'casualPlus'
  | 'intermediate'
  | 'advanced'
  | 'master'
  | 'maximum'
  | 'custom';

export type PersonalityId =
  | 'pragmatic'
  | 'aggressive'
  | 'conservative'
  | 'adventurous'
  | 'positional'
  | 'exchange';

export type HintLevel = 0 | 1 | 2 | 3;

export interface Personality {
  id: PersonalityId;
  name: string;
  description: string;
  /** 駒数を多少重く見るか。1 が標準。 */
  materialWeight: number;
  /** 攻撃と王の安全を重く見るか。 */
  aggressionWeight: number;
  /** ポーン構造と活動度を重く見るか。 */
  positionalWeight: number;
  /** 疑問が残る手でも駒を取りに行く傾向。 */
  greed: number;
}

export const PERSONALITIES: Personality[] = [
  {
    id: 'pragmatic',
    name: '堅実',
    description: '手順を崩さず、確実に有利な形を作ります。',
    materialWeight: 1,
    aggressionWeight: 1,
    positionalWeight: 1,
    greed: 0.1,
  },
  {
    id: 'aggressive',
    name: '攻撃的',
    description: '常に王法を狙います。多少不利でも攻撃を選びます。',
    materialWeight: 0.95,
    aggressionWeight: 1.35,
    positionalWeight: 0.95,
    greed: 0.3,
  },
  {
    id: 'conservative',
    name: '保守的',
    description: '王を安全に守り、相手に時間を与えます。',
    materialWeight: 1,
    aggressionWeight: 0.75,
    positionalWeight: 1.05,
    greed: 0.05,
  },
  {
    id: 'adventurous',
    name: '大胆',
    description: '形を無視してでも駒を取りに行きます。',
    materialWeight: 0.85,
    aggressionWeight: 1.2,
    positionalWeight: 0.8,
    greed: 0.45,
  },
  {
    id: 'positional',
    name: '長線',
    description: '駒数よりも、最後にどの手で勝敗を決めるかを考えます。',
    materialWeight: 1.05,
    aggressionWeight: 0.95,
    positionalWeight: 1.3,
    greed: 0.12,
  },
  {
    id: 'exchange',
    name: '交換的',
    description: '駒の交換を恐れず、駒数を重視します。',
    materialWeight: 1.25,
    aggressionWeight: 1,
    positionalWeight: 0.85,
    greed: 0.55,
  },
];

export interface LevelSpec {
  id: LevelId;
  name: string;
  /** おおよその強さ。プレイヤーに表示するのみで、判定には使わない。 */
  elo: number;
  budgetType: 'depth' | 'time' | 'nodes';
  budgetValue: number;
  /** MultiPV の幅。blend を使うには 2 以上が必要。 */
  multiPv: number;
  /** 最善手より blendWindow 以上評価が悪い手を混ぜる確率。 */
  blendChance: number;
  blendWindow: number;
  /** 候補集合に対する温度（0 = 常に最善手）。 */
  temperature: number;
  /** 最低思考時間。相手が機械的にならないようにするため。 */
  minThinkMs: number;
  /** このレベルに 99MB のフル build が必要か。 */
  needsFullEngine: boolean;
  note: string;
}

export const LEVELS: LevelSpec[] = [
  {
    id: 'beginner',
    name: '初級',
    elo: 400,
    budgetType: 'depth',
    budgetValue: 1,
    multiPv: 8,
    blendChance: 0.55,
    blendWindow: 150,
    temperature: 160,
    minThinkMs: 600,
    needsFullEngine: false,
    note: '1手先も見えません。駒を危険に晒して取りに行きます。',
  },
  {
    id: 'beginnerPlus',
    name: '初級+',
    elo: 700,
    budgetType: 'depth',
    budgetValue: 3,
    multiPv: 8,
    blendChance: 0.38,
    blendWindow: 120,
    temperature: 100,
    minThinkMs: 500,
    needsFullEngine: false,
    note: '1手先の脅威は時折見ます。連携はまだ見えません。',
  },
  {
    id: 'casual',
    name: '初級+',
    elo: 1000,
    budgetType: 'depth',
    budgetValue: 6,
    multiPv: 6,
    blendChance: 0.22,
    blendWindow: 90,
    temperature: 60,
    minThinkMs: 400,
    needsFullEngine: false,
    note: '趣味の強い者です。危険な手順を見落とします。',
  },
  {
    id: 'casualPlus',
    name: '中級',
    elo: 1300,
    budgetType: 'depth',
    budgetValue: 9,
    multiPv: 5,
    blendChance: 0.13,
    blendWindow: 70,
    temperature: 38,
    minThinkMs: 350,
    needsFullEngine: false,
    note: '定石を知っています。連携も見かけます。',
  },
  {
    id: 'intermediate',
    name: '中級+',
    elo: 1600,
    budgetType: 'depth',
    budgetValue: 13,
    multiPv: 4,
    blendChance: 0.07,
    blendWindow: 50,
    temperature: 22,
    minThinkMs: 300,
    needsFullEngine: false,
    note: '定石に詳しく、戦術も見つけます。',
  },
  {
    id: 'advanced',
    name: '上級',
    elo: 1850,
    budgetType: 'depth',
    budgetValue: 18,
    multiPv: 3,
    blendChance: 0.035,
    blendWindow: 40,
    temperature: 12,
    minThinkMs: 300,
    needsFullEngine: false,
    note: 'ほとんど深く計算した手を返します。',
  },
  {
    id: 'master',
    name: '最上級',
    elo: 2200,
    budgetType: 'depth',
    budgetValue: 26,
    multiPv: 3,
    blendChance: 0.012,
    blendWindow: 30,
    temperature: 6,
    minThinkMs: 250,
    needsFullEngine: true,
    note: 'フル build（99MB）を要求します。',
  },
  {
    id: 'maximum',
    name: '最強',
    elo: 2600,
    budgetType: 'depth',
    budgetValue: 40,
    multiPv: 2,
    blendChance: 0,
    blendWindow: 0,
    temperature: 0,
    minThinkMs: 200,
    needsFullEngine: true,
    note: '常に最善手を選びます。フル build（99MB）を要求します。',
  },
];

export const LEVEL_BY_ID = Object.fromEntries(
  LEVELS.map((l) => [l.id, l]),
) as Record<LevelId, LevelSpec>;

export function getLevel(id: LevelId): LevelSpec {
  return LEVEL_BY_ID[id] ?? LEVEL_BY_ID.casualPlus;
}

export type SideChoice = 'white' | 'black' | 'random';
export type EngineVariant = 'lite' | 'full';

export interface AiConfig {
  level: LevelId;
  /** level === 'custom' のときだけ使われる。 */
  custom: {
    budgetType: 'depth' | 'time' | 'nodes';
    budgetValue: number;
    multiPv: number;
    blendChance: number;
    blendWindow: number;
    temperature: number;
  };
  personality: PersonalityId;
  side: SideChoice;
  engine: EngineVariant;
  hintLevel: HintLevel;
  /** 相手の指手を評価して、大失敗などを対局後に点评する。 */
  blunderDetection: boolean;
  /** エンジンが考えている間だけ時計を止める。 */
  clockStopsOnEngine: boolean;
}

export const DEFAULT_AI: AiConfig = {
  level: 'casualPlus',
  custom: {
    budgetType: 'depth',
    budgetValue: 10,
    multiPv: 4,
    blendChance: 0.1,
    blendWindow: 60,
    temperature: 30,
  },
  personality: 'pragmatic',
  side: 'white',
  engine: 'lite',
  hintLevel: 1,
  blunderDetection: true,
  clockStopsOnEngine: true,
};

/** level が custom のときは custom の数値、それ以外は段欧の tuning を返す。 */
export function effectiveSpec(cfg: AiConfig): LevelSpec {
  if (cfg.level !== 'custom') return getLevel(cfg.level);
  return {
    ...getLevel('intermediate'),
    id: 'custom',
    name: 'カスタム',
    elo: 0,
    budgetType: cfg.custom.budgetType,
    budgetValue: cfg.custom.budgetValue,
    multiPv: cfg.custom.multiPv,
    blendChance: cfg.custom.blendChance,
    blendWindow: cfg.custom.blendWindow,
    temperature: cfg.custom.temperature,
    minThinkMs: 300,
    needsFullEngine: false,
    note: '数値を自分で調整しています。',
  };
}

export function getPersonality(id: PersonalityId): Personality {
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0];
}

/** 段歐の日本語名を一覧用に返す。 */
export function levelName(id: LevelId): string {
  return id === 'custom' ? 'カスタム' : getLevel(id).name;
}
