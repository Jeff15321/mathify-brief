import type { LearnerProfile } from '@/types/domain';

const MAX_CONTEXT_CHARS = 1500;
const LABELS = { struggle: 'Struggle', what_works: 'What works' } as const;

/**
 * Compact tutor-only text for probe planning: active/improving struggles first, then what works,
 * one line each with its latest evidence date, cut at a whole line to at most 1500 characters.
 * @returns undefined when the profile has no such items.
 */
export function buildLearnerContext(profile: LearnerProfile): string | undefined {
  const lines = (['struggle', 'what_works'] as const).flatMap((category) => profile.items
    .filter((item) => item.category === category && item.status !== 'resolved')
    .map((item) => {
      const latest = item.evidence.map((entry) => entry.date).sort().at(-1);
      return `- ${LABELS[category]} (${item.status}${latest ? `, last seen ${latest}` : ''}): ${item.text}`;
    }));
  const text = lines.join('\n');
  if (text.length <= MAX_CONTEXT_CHARS) return text || undefined;
  const cut = text.slice(0, MAX_CONTEXT_CHARS);
  const end = cut.lastIndexOf('\n');
  return end > 0 ? cut.slice(0, end) : cut;
}
