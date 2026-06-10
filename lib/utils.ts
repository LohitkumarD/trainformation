import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function formatCoachLayout(coaches: { code: string }[]): string {
  return coaches.map((c) => c.code).join(' ');
}

export function shareCoachLayout(trainNumber: string, trainName: string, coaches: { code: string }[]): string {
  const layout = formatCoachLayout(coaches);
  return `🚂 Train ${trainNumber}${trainName ? ` - ${trainName}` : ''}\n\n${layout}\n\n📱 Coach Position Manager`;
}
