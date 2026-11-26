import type { TutorFeedbackInput } from '@/schemas/feedback';

export async function hasSavedFeedback(reportId: string, signal: AbortSignal): Promise<boolean> {
  const response = await fetch(`/api/feedback?reportId=${encodeURIComponent(reportId)}`, { cache: 'no-store', signal });
  if (!response.ok) throw new Error('Could not check whether feedback has already been saved.');
  const data = await response.json();
  return Boolean(data.feedback);
}

export async function saveFeedback(feedback: TutorFeedbackInput): Promise<void> {
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedback),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? 'Feedback could not be saved. Please try again.');
}
