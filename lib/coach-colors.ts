import type { CoachType } from '@/types';

export function detectCoachType(code: string): CoachType {
  const upper = code.toUpperCase().trim();

  // Engine / Locomotive
  if (/^(ENG|ENGINE|LOCO|WDP|WAP|WDG|WAG)/.test(upper)) return 'engine';

  // Sleeper class — S1–S15, M1–M9 (Modified sleeper)
  if (/^S\d+$/.test(upper)) return 'sleeper';
  if (/^M\d+$/.test(upper)) return 'sleeper';

  // AC class — B (2nd AC), A (1st AC), H (AC Chair), EC, CC, HA
  if (/^(B\d+|A\d+|H\d+|HA\d*|EC\d*|CC\d*|AC\d*|1A|2A|3A)$/.test(upper)) return 'ac';

  // General / Unreserved — also handles codes like 2GEN, 3GEN, GENR
  if (/^(GEN|GS|UR|UNRESERVED)$/.test(upper)) return 'general';
  if (/GEN$/.test(upper)) return 'general';       // 2GEN, 3GEN …
  if (/^(SLRD?|SLR|D\d*)$/.test(upper)) return 'general';

  // Utility / Special coaches
  if (/^(PC|EOG|GUARD|BRK|BRAKE|LPR|LSLRD|WLRRM|GEN-C|LAGEN)/.test(upper)) return 'other';

  return 'other';
}

export interface CoachColorConfig {
  bg: string;
  text: string;
  border: string;
  label: string;
  dot: string;
}

export const COACH_COLORS: Record<CoachType, CoachColorConfig> = {
  engine: {
    bg: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-600',
    label: 'Engine',
    dot: 'bg-red-500',
  },
  sleeper: {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-600',
    label: 'Sleeper',
    dot: 'bg-blue-500',
  },
  ac: {
    bg: 'bg-emerald-500',
    text: 'text-white',
    border: 'border-emerald-600',
    label: 'AC',
    dot: 'bg-emerald-500',
  },
  general: {
    bg: 'bg-slate-400',
    text: 'text-white',
    border: 'border-slate-500',
    label: 'General',
    dot: 'bg-slate-400',
  },
  other: {
    bg: 'bg-purple-400',
    text: 'text-white',
    border: 'border-purple-500',
    label: 'Other',
    dot: 'bg-purple-400',
  },
};

export const COACH_TYPE_LEGEND: CoachType[] = ['engine', 'sleeper', 'ac', 'general', 'other'];
