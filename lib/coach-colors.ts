import type { CoachType } from '@/types';

export function detectCoachType(code: string): CoachType {
  const upper = code.toUpperCase().trim();

  // Engine / Locomotive
  if (/^(ENG|ENGINE|LOCO|WDP|WAP|WDG|WAG)/.test(upper)) return 'engine';

  // Sleeper — S, M (Modified), SE (Economy Sleeper)
  if (/^S\d+$/.test(upper)) return 'sleeper';
  if (/^M\d+$/.test(upper)) return 'sleeper';
  if (/^SE\d*$/.test(upper)) return 'sleeper';

  // AC — B (2nd AC), A (1st AC), H (AC Chair), HA (Handicapped AC),
  //       AE (AC Economy), EC, CC
  if (/^(B\d+|A\d+|H\d+|HA\d*|AE\d*|EC\d*|CC\d*|AC\d*|1A|2A|3A)$/.test(upper)) return 'ac';

  // General / Guard vans
  if (/^(GEN|GS|UR|UNRESERVED)$/.test(upper)) return 'general';
  if (/GEN$/.test(upper)) return 'general';               // 2GEN, 3GEN …
  if (/^(SLRD?|SLR\d*|LSLR\d*|D\d*|DE\d*|C\d*|SE\d*)$/.test(upper)) return 'general';

  // Utility / Special coaches
  if (/^(PC\d*|EOG|GUARD|BRK|BRAKE|LPR\d*|VP\d*|WLRRM)/.test(upper)) return 'other';

  return 'other';
}

export interface CoachColorConfig {
  /* Tailwind classes — also safelisted in tailwind.config.ts */
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
  /* Hex — used as inline style so CSS purging can never strip colours */
  hex: string;
}

export const COACH_COLORS: Record<CoachType, CoachColorConfig> = {
  engine: {
    bg: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-600',
    dot: 'bg-red-500',
    label: 'Engine',
    hex: '#EF4444',
  },
  sleeper: {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-600',
    dot: 'bg-blue-500',
    label: 'Sleeper',
    hex: '#3B82F6',
  },
  ac: {
    bg: 'bg-emerald-500',
    text: 'text-white',
    border: 'border-emerald-600',
    dot: 'bg-emerald-500',
    label: 'AC',
    hex: '#10B981',
  },
  general: {
    bg: 'bg-slate-400',
    text: 'text-white',
    border: 'border-slate-500',
    dot: 'bg-slate-400',
    label: 'General',
    hex: '#94A3B8',
  },
  other: {
    bg: 'bg-purple-400',
    text: 'text-white',
    border: 'border-purple-500',
    dot: 'bg-purple-400',
    label: 'Other',
    hex: '#C084FC',
  },
};

export const COACH_TYPE_LEGEND: CoachType[] = ['engine', 'sleeper', 'ac', 'general', 'other'];
