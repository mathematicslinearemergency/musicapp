export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDurationLong(seconds: number): string {
  if (!seconds || seconds < 1) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h} hr ${m} min`;
  if (m > 0) return `${m} min ${s} sec`;
  return `${s} sec`;
}

const GRADIENTS: Record<string, string> = {
  emerald: 'from-brand-500 to-brand-700',
  blue: 'from-blue-500 to-blue-700',
  rose: 'from-rose-500 to-rose-700',
  amber: 'from-amber-500 to-amber-700',
  cyan: 'from-cyan-500 to-cyan-700',
  violet: 'from-violet-500 to-violet-700',
  orange: 'from-orange-500 to-orange-700',
  teal: 'from-teal-500 to-teal-700',
};

export function getGradient(color: string): string {
  return GRADIENTS[color] || GRADIENTS.emerald;
}

export function pluralize(count: number, word: string): string {
  return `${count} ${word}${count !== 1 ? 's' : ''}`;
}
