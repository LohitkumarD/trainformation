import { detectCoachType } from './coach-colors';
import { generateId } from './utils';
import type { Coach } from '@/types';

export function extractTrainNumbers(text: string): string[] {
  const pattern = /\b\d{5}\b/g;
  return [...new Set(text.match(pattern) || [])];
}

const COACH_PATTERN =
  /\b(ENG(?:INE)?|LOCO|SLRD?|SLR|GEN|GS|UR|PC|EOG|GUARD|[SBAHEsbahe]\d{1,2}|[Aa][Cc]\d*|EC\d*|CC\d*|1A|2A|3A)\b/gi;

export function extractCoachCodes(text: string): string[] {
  const matches = text.match(COACH_PATTERN) || [];
  return [...new Set(matches.map((c) => c.toUpperCase()))];
}

export function expandCoachRange(range: string): string[] {
  const match = range.match(/^([A-Za-z]+)(\d+)-([A-Za-z]+)?(\d+)$/);
  if (!match) return [range.toUpperCase()];

  const [, prefix1, num1Str, prefix2, num2Str] = match;
  const effectivePrefix = (prefix2 || prefix1).toUpperCase();

  if (prefix2 && prefix2.toUpperCase() !== prefix1.toUpperCase()) {
    return [range.toUpperCase()];
  }

  const start = parseInt(num1Str, 10);
  const end = parseInt(num2Str, 10);
  const result: string[] = [];

  if (start > end) {
    for (let i = start; i >= end; i--) result.push(`${effectivePrefix}${i}`);
  } else {
    for (let i = start; i <= end; i++) result.push(`${effectivePrefix}${i}`);
  }

  return result;
}

export function parseCoachSequence(input: string): Coach[] {
  const coaches: Coach[] = [];
  const parts = input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);

  for (const part of parts) {
    const upper = part.toUpperCase();
    if (/[A-Za-z]+\d+-[A-Za-z]*\d+/.test(upper)) {
      const expanded = expandCoachRange(upper);
      expanded.forEach((code) => {
        coaches.push({ id: generateId(), code, type: detectCoachType(code) });
      });
    } else {
      coaches.push({ id: generateId(), code: upper, type: detectCoachType(upper) });
    }
  }

  return coaches;
}

export function parseOCRText(text: string): {
  trainNumbers: string[];
  coaches: Coach[];
} {
  const trainNumbers = extractTrainNumbers(text);
  const rawCodes = extractCoachCodes(text);

  // Detect and expand ranges from raw text
  const rangePattern = /[A-Za-z]+\d+-[A-Za-z]*\d+/g;
  const ranges = text.match(rangePattern) || [];
  const fromRanges = ranges.flatMap((r) => expandCoachRange(r));

  const allCodes = [...new Set([...rawCodes, ...fromRanges])];
  const coaches = allCodes.map((code) => ({
    id: generateId(),
    code,
    type: detectCoachType(code),
  }));

  return { trainNumbers, coaches };
}
