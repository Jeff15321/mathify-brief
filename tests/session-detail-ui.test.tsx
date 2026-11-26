import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { TutorSession } from '@/contracts/sessions';
import { ApiClientError } from '@/client/http';
import * as api from '@/client/sessions';
import { TranscriptViewer } from '@/components/sessions/TranscriptViewer';
import { EditableNotes } from '@/components/sessions/EditableNotes';
import SessionDetailPage from '@/app/sessions/[id]/page';

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'a' }), useRouter: () => router }));
vi.mock('@/client/sessions', () => ({
  fetchSession: vi.fn(), updateSession: vi.fn(), deleteSession: vi.fn(), retrySessionSummary: vi.fn(),
}));

const TRANSCRIPT = Array.from({ length: 40 }, (_, i) => `[00:00:${String(i).padStart(2, '0')}] ${i % 2 ? 'Student' : 'Tutor'}: line ${i + 1}`).join('\n');
const SESSION: TutorSession = {
  schemaVersion: 1, id: 'a', sessionDate: '2026-10-17', uploadedAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z',
  tutorNotes: 'Used area models', transcriptFileName: 'area.txt', transcriptText: TRANSCRIPT,
  whiteboards: [{ id: 'w1', kind: 'whiteboard', fileName: 'board.png', mimeType: 'image/png', sizeBytes: 1, createdAt: '2026-10-18T12:00:00.000Z' }],
  status: 'ready', summaryStartedAt: null, title: 'Area models fix bracket slips', summary: 'Expanded brackets after drawing.',
  observations: [
    { category: 'struggle', text: 'Multiplied only the first term.', quote: 'So it is 4x + 5?' },
    { category: 'what_works', text: 'Area model diagrams.' },
  ],
  model: 'mock', promptVersion: 'v1', summarizedAt: '2026-10-18T12:00:00.000Z',
};

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('TranscriptViewer', () => {
  it('shows a collapsed preview and expands to the full transcript', () => {
    render(<TranscriptViewer text={TRANSCRIPT} fileName="area.txt" />);
    const transcript = screen.getByTestId('transcript');
    expect(transcript).toHaveTextContent('line 15');
    expect(transcript).not.toHaveTextContent('line 16');
    expect(within(transcript).getAllByText('Tutor:')[0].tagName).toBe('STRONG');
    fireEvent.click(screen.getByRole('button', { name: 'Show full transcript (40 lines)' }));
    expect(transcript).toHaveTextContent('line 40');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(transcript).not.toHaveTextContent('line 40');
  });

  it('renders markup as text and skips the toggle for short transcripts', () => {
    render(<TranscriptViewer text={'Student: <b>hi</b>'} fileName="t.txt" />);
    expect(screen.getByTestId('transcript')).toHaveTextContent('Student: <b>hi</b>');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('EditableNotes', () => {
  it('saves edited notes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditableNotes notes="Old" onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Tutor notes'), { target: { value: 'New notes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByLabelText('Tutor notes')).not.toBeInTheDocument());
    expect(onSave).toHaveBeenCalledWith('New notes');
  });
});

describe('SessionDetailPage', () => {
  it('renders the session and hides empty observation groups', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue(SESSION);
    render(<SessionDetailPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Area models fix bracket slips' })).toBeInTheDocument();
    expect(screen.getByText('Session · Oct 17, 2026')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Struggles' })).toHaveTextContent('So it is 4x + 5?');
    expect(screen.getByRole('region', { name: 'What works' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Strengths' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Habits' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'board.png' })).toHaveAttribute('href', '/api/sessions/a/assets/w1');
    expect(screen.getByRole('link', { name: 'board.png' })).toHaveAttribute('target', '_blank');
  });

  it('saves notes through the client', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue(SESSION);
    vi.mocked(api.updateSession).mockResolvedValue({ ...SESSION, tutorNotes: 'Try fraction strips' });
    render(<SessionDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const notes = screen.getByLabelText('Tutor notes');
    fireEvent.change(notes, { target: { value: 'Try fraction strips' } });
    fireEvent.click(within(notes.closest('form')!).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByLabelText('Tutor notes')).not.toBeInTheDocument());
    expect(screen.getByText('Try fraction strips')).toBeInTheDocument();
    expect(api.updateSession).toHaveBeenCalledWith('a', { tutorNotes: 'Try fraction strips' });
  });

  it('shows a loader and polls while pending', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(api.fetchSession).mockResolvedValue({ ...SESSION, status: 'pending', title: null, summary: null, observations: [] });
    render(<SessionDetailPage />);
    expect(await screen.findByText('Summarizing this session…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Observations' })).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(3000);
    expect(api.fetchSession).toHaveBeenCalledTimes(2);
  });

  it('retries a failed summary', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue({ ...SESSION, status: 'failed', title: null, summary: null, observations: [] });
    vi.mocked(api.retrySessionSummary).mockResolvedValue(SESSION);
    render(<SessionDetailPage />);
    expect(await screen.findByText('The AI summary could not be generated.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Expanded brackets after drawing.')).toBeInTheDocument();
    expect(api.retrySessionSummary).toHaveBeenCalledWith('a');
  });

  it('deletes after confirming and returns to the list', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue(SESSION);
    vi.mocked(api.deleteSession).mockResolvedValue();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<SessionDetailPage />);
    const button = await screen.findByRole('button', { name: 'Delete session' });
    fireEvent.click(button);
    expect(api.deleteSession).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/sessions'));
    expect(api.deleteSession).toHaveBeenCalledWith('a');
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('shows a friendly message when the session does not exist', async () => {
    vi.mocked(api.fetchSession).mockRejectedValue(new ApiClientError('Session not found', 'NOT_FOUND'));
    render(<SessionDetailPage />);
    expect(await screen.findByRole('heading', { name: 'Session not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to sessions' })).toHaveAttribute('href', '/sessions');
  });
});
