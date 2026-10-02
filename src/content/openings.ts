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
  e4: '1.e4 の戦術',
  d4: '1.d4 の戦術',
  c4: '1.c4 の戦術',
  indian: 'インド系',
};

export const OPENINGS: Opening[] = [];