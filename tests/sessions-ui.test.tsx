import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { PublicSessionSummary } from '@/types/domain';
import * as api from '@/lib/api-client';
import { AppNav } from '@/components/shared/AppNav';
import { SessionUploadForm } from '@/components/sessions/SessionUploadForm';
import SessionsPage from '@/app/sessions/page';

const nav = vi.hoisted(() => ({ pathname: '/sessions' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('@/lib/api-client', () => ({ fetchSessions: vi.fn(), retrySessionSummary: vi.fn(), uploadSession: vi.fn() }));

const SESSIONS: PublicSessionSummary[] = [
  { id: 'a', title: 'Area models fix bracket slips', summary: 'Expanded brackets correctly after drawing.', sessionDate: '2026-10-17', status: 'ready', whiteboardCount: 2, observationCount: 1 },
  { id: 'b', title: null, summary: null, sessionDate: '2026-10-03', status: 'pending', whiteboardCount: 0, observationCount: 0 },
  { id: 'c', title: null, summary: null, sessionDate: '2026-09-26', status: 'failed', whiteboardCount: 0, observationCount: 0 },
];
const png = (name: string) => new File(['x'], name, { type: 'image/png' });

beforeEach(() => {
  localStorage.clear();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

describe('AppNav', () => {
  it('marks the current page link as active', () => {
    nav.pathname = '/sessions';
    render(<AppNav />);
    expect(screen.getByRole('link', { name: 'Sessions' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Workspace' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Learner profile' })).toHaveAttribute('href', '/profile');
  });

  it('starts collapsed on /workspace and remembers the toggle', () => {
    nav.pathname = '/workspace';
    render(<AppNav />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigation' }));
    expect(screen.getByRole('button', { name: 'Collapse navigation' })).toHaveAttribute('aria-expanded', 'true');
    expect(localStorage.getItem('mathify.navExpanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    expect(localStorage.getItem('mathify.navExpanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toBeInTheDocument();
  });
});

describe('SessionsPage', () => {
  it('renders ready, pending and failed cards and polls while pending', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(api.fetchSessions).mockResolvedValue(SESSIONS);
    render(<SessionsPage />);
    const ready = (await screen.findByRole('link', { name: 'Area models fix bracket slips' })).closest('li')!;
    expect(within(ready).getByText('Oct 17, 2026')).toBeInTheDocument();
    expect(within(ready).getByText('1 observation · 2 whiteboards')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Area models fix bracket slips' })).toHaveAttribute('href', '/sessions/a');
    expect(screen.getByRole('link', { name: 'Summarizing…' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Summary failed' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(api.fetchSessions).toHaveBeenCalledTimes(2);
  });

  it('retries a failed summary through the client', async () => {
    vi.mocked(api.fetchSessions).mockResolvedValue([SESSIONS[2]]);
    vi.mocked(api.retrySessionSummary).mockResolvedValue({} as never);
    render(<SessionsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(api.retrySessionSummary).toHaveBeenCalledWith('c'));
    await waitFor(() => expect(api.fetchSessions).toHaveBeenCalledTimes(2));
  });

  it('shows an empty state', async () => {
    vi.mocked(api.fetchSessions).mockResolvedValue([]);
    render(<SessionsPage />);
    expect(await screen.findByText('No sessions yet')).toBeInTheDocument();
  });
});

describe('SessionUploadForm', () => {
  it('requires a transcript before uploading', () => {
    render(<SessionUploadForm onUploaded={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Upload session' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a transcript file.');
    expect(api.uploadSession).not.toHaveBeenCalled();
  });

  it('blocks more than 5 whiteboard images', () => {
    render(<SessionUploadForm onUploaded={() => {}} />);
    const input = screen.getByLabelText('Whiteboard images (optional)');
    fireEvent.change(input, { target: { files: [png('1.png'), png('2.png')] } });
    fireEvent.change(input, { target: { files: [png('3.png'), png('4.png'), png('5.png'), png('6.png')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('up to 5 whiteboard images');
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(2);
  });

  it('uploads the transcript, whiteboards, date and notes', async () => {
    const onUploaded = vi.fn();
    vi.mocked(api.uploadSession).mockResolvedValue({ id: 'new' } as never);
    render(<SessionUploadForm onUploaded={onUploaded} />);
    fireEvent.change(screen.getByLabelText('Transcript'), { target: { files: [new File(['Tutor: hi'], 'session.txt', { type: 'text/plain' })] } });
    fireEvent.change(screen.getByLabelText('Whiteboard images (optional)'), { target: { files: [png('board.png')] } });
    fireEvent.change(screen.getByLabelText('Session date'), { target: { value: '2026-10-17' } });
    fireEvent.change(screen.getByLabelText('Tutor notes for this session (optional)'), { target: { value: 'Used area models' } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload session' }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    const data = vi.mocked(api.uploadSession).mock.calls[0][0];
    expect((data.get('transcript') as File).name).toBe('session.txt');
    expect(data.getAll('whiteboards')).toHaveLength(1);
    expect(data.get('sessionDate')).toBe('2026-10-17');
    expect(data.get('tutorNotes')).toBe('Used area models');
  });
});
