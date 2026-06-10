import type { CoachType } from '@/types';

export function detectCoachType(code: string): CoachType {
  const upper = code.toUpperCase().trim();

  if (/^(ENG|ENGINE|LOCO|WDP|WAP|WDG|WAG)/.test(upper)) return 'engine';
  if (/^S\d+$/.test(upper)) return 'sleeper';
  if (/^(B\d+|A\d+|EC\d*|1A|2A|3A|CC\d*|AC\d*)$/.test(upper)) return 'ac';
  if (/^(GEN|GS|UR|UNRESERVED)$/.test(upper)) return 'general';
  if (/^(SLRD?|D\d*|SLR)$/.test(upper)) return 'general';
  if (/^(PC|EOG|GUARD|BRK|BRAKE)/.test(upper)) return 'other';

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
