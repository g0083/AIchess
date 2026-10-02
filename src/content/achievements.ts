/**
 * Achievements.
 *
 * Ids are stable and ASCII; display text is Japanese. Checked against the
 * progress store by src/store/achievements.ts.
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** What the player should do next. */
  hint: string;
  tier: 1 | 2 | 3;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-win',
    name: '初勝利',
    description: 'AI対戦に初めて勝ちました。',
    hint: 'まず1局、勝ってみましょう。',
    tier: 1,
  },
  {
    id: 'ten-games',
    name: '10局',
    description: '合計で10局対戦しました。',
    hint: '対局を積んでみましょう。',
    tier: 1,
  },
  {
    id: 'first-puzzle',
    name: '最初の一問',
    description: '初めて戦術パズルを解きました。',
    hint: '学習モードのパズルを解いてみましょう。',
    tier: 1,
  },
];