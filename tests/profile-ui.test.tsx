import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { LearnerProfile } from '@/contracts/profile';
import type { PublicSessionSummary } from '@/contracts/sessions';
import { fetchSessions } from '@/client/sessions';
import * as api from '@/client/profile';
import ProfilePage from '@/app/profile/page';

vi.mock('@/client/sessions', () => ({ fetchSessions: vi.fn() }));
vi.mock('@/client/profile', () => ({ fetchProfile: vi.fn(), updateProfile: vi.fn(), rebuildProfile: vi.fn() }));

const STRUGGLE_ID = '11111111-1111-4111-8111-111111111111';
const PROFILE: LearnerProfile = {
  schemaVersion: 1, nextFocus: 'Revisit: multiplies only the first term.', nextFocusSource: 'ai', tutorNotes: 'Likes word problems',
  items: [
    { id: STRUGGLE_ID, category: 'struggle', text: 'Multiplies only the first term.', status: 'active', source: 'ai',
      evidence: [{ sessionId: 'a', date: '2026-10-17', quote: 'So it is 4x + 5?' }, { sessionId: 'b', date: '2026-11-07' }] },
    { id: '22222222-2222-4222-8222-222222222222', category: 'strength', text: 'One-step equations.', status: 'resolved', source: 'tutor', evidence: [] },
  ],
  updatedAt: '2026-11-08T12:00:00.000Z', rebuiltAt: '2026-11-08T12:00:00.000Z', rebuildStatus: 'idle', model: 'mock', promptVersion: 'profile-v1', dismissed: [],
};
const session = (id: string, sessionDate: string): PublicSessionSummary => ({ id, title: id, summary: null, sessionDate, status: 'ready', whiteboardCount: 0, observationCount: 1 });
const SESSIONS = [session('b', '2026-11-07'), session('a', '2026-10-17')];

async function renderPage(profile = PROFILE, sessions = SESSIONS) {
  vi.mocked(api.fetchProfile).mockResolvedValue(profile);
  vi.mocked(fetchSessions).mockResolvedValue(sessions);
  render(<ProfilePage />);
  await screen.findByRole('heading', { level: 1, name: 'Demo Student' });
}
const row = (text: string) => screen.getByText(text).closest('li')!;
const itemForm = () => screen.getByLabelText('Item text').closest('form')!;
const section = (name: RegExp) => screen.getByRole('heading', { name }).closest('section')!;

afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); });

describe('ProfilePage', () => {
  it('renders the student, counts, focus and items with evidence links', async () => {
    await renderPage();
    const student = screen.getByRole('region', { name: 'Student' });
    expect(within(student).getByText('Grade 9')).toBeInTheDocument();
    expect(within(student).getByText('Sessions').nextSibling).toHaveTextContent('2');
    expect(within(student).getByText('Last session').nextSibling).toHaveTextContent('Nov 7, 2026');
    expect(screen.getByText('Revisit: multiplies only the first term.')).toBeInTheDocument();
    expect(screen.getByText('Suggested by AI')).toBeInTheDocument();
    const struggle = row('Multiplies only the first term.');
    expect(within(struggle).getByText('Active')).toBeInTheDocument();
    expect(within(struggle).queryByText('Tutor')).not.toBeInTheDocument();
    expect(within(struggle).getByRole('link', { name: 'Oct 17, 2026' })).toHaveAttribute('href', '/sessions/a');
    expect(within(struggle).getByRole('link', { name: 'Oct 17, 2026' })).toHaveAttribute('title', 'So it is 4x + 5?');
    expect(within(row('One-step equations.')).getByText('Tutor')).toBeInTheDocument();
    expect(within(section(/^Habits/)).getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('edits an item through upsertItems and shows the Tutor chip from the response', async () => {
    await renderPage();
    vi.mocked(api.updateProfile).mockResolvedValue({ ...PROFILE, items: [{ ...PROFILE.items[0], text: 'Expands only the first term.', status: 'improving', source: 'tutor' }, PROFILE.items[1]] });
    fireEvent.click(within(row('Multiplies only the first term.')).getByRole('button', { name: 'Edit item' }));
    fireEvent.change(screen.getByLabelText('Item text'), { target: { value: 'Expands only the first term.' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'improving' } });
    fireEvent.click(within(itemForm()).getByRole('button', { name: 'Save' }));
    const edited = await screen.findByText('Expands only the first term.', { selector: 'p' });
    expect(api.updateProfile).toHaveBeenCalledWith({ upsertItems: [{ id: STRUGGLE_ID, category: 'struggle', text: 'Expands only the first term.', status: 'improving' }] });
    expect(within(edited.closest('li')!).getByText('Tutor')).toBeInTheDocument();
    expect(within(edited.closest('li')!).getByText('Improving')).toBeInTheDocument();
    expect(screen.queryByLabelText('Item text')).not.toBeInTheDocument();
  });

  it('keeps the editor open with the error when a save fails', async () => {
    await renderPage();
    vi.mocked(api.updateProfile).mockRejectedValue(new Error('Item text must be at most 300 characters'));
    fireEvent.click(within(row('Multiplies only the first term.')).getByRole('button', { name: 'Edit item' }));
    fireEvent.click(within(itemForm()).getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Item text must be at most 300 characters');
    expect(screen.getByLabelText('Item text')).toBeInTheDocument();
  });

  it('deletes an item through deleteItemIds after confirming', async () => {
    await renderPage();
    vi.mocked(api.updateProfile).mockResolvedValue({ ...PROFILE, items: [PROFILE.items[1]] });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const button = within(row('Multiplies only the first term.')).getByRole('button', { name: 'Delete item' });
    fireEvent.click(button);
    expect(api.updateProfile).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByText('Multiplies only the first term.')).not.toBeInTheDocument());
    expect(api.updateProfile).toHaveBeenCalledWith({ deleteItemIds: [STRUGGLE_ID] });
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('adds a tutor item to a section', async () => {
    await renderPage();
    const added = { id: '33333333-3333-4333-8333-333333333333', category: 'habit' as const, text: 'Skips checks.', status: 'active' as const, source: 'tutor' as const, evidence: [] };
    vi.mocked(api.updateProfile).mockResolvedValue({ ...PROFILE, items: [...PROFILE.items, added] });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Habits' }));
    expect(within(itemForm()).getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Item text'), { target: { value: '  Skips checks. ' } });
    fireEvent.click(within(itemForm()).getByRole('button', { name: 'Save' }));
    expect(await within(section(/^Habits/)).findByText('Skips checks.', { selector: 'p' })).toBeInTheDocument();
    expect(api.updateProfile).toHaveBeenCalledWith({ upsertItems: [{ category: 'habit', text: 'Skips checks.', status: 'active' }] });
    expect(within(row('Skips checks.')).getByText('Tutor')).toBeInTheDocument();
  });

  it('edits the next focus and hands it back to the AI', async () => {
    await renderPage();
    vi.mocked(api.updateProfile).mockResolvedValueOnce({ ...PROFILE, nextFocus: 'Checks by substitution', nextFocusSource: 'tutor' })
      .mockResolvedValueOnce({ ...PROFILE, nextFocus: '', nextFocusSource: 'ai' });
    vi.mocked(api.rebuildProfile).mockResolvedValue(PROFILE);
    const focus = screen.getByRole('region', { name: 'Next session focus' });
    fireEvent.click(within(focus).getByRole('button', { name: 'Edit' }));
    fireEvent.change(within(focus).getByLabelText('Next session focus'), { target: { value: 'Checks by substitution' } });
    fireEvent.click(within(focus).getByRole('button', { name: 'Save' }));
    expect(await within(focus).findByText('Checks by substitution', { selector: 'p' })).toBeInTheDocument();
    expect(within(focus).getByText('Written by tutor')).toBeInTheDocument();
    expect(api.updateProfile).toHaveBeenCalledWith({ nextFocus: 'Checks by substitution' });
    fireEvent.click(within(focus).getByRole('button', { name: 'Let AI suggest' }));
    expect(await within(focus).findByText('Revisit: multiplies only the first term.')).toBeInTheDocument();
    expect(api.updateProfile).toHaveBeenLastCalledWith({ nextFocus: '' });
    expect(api.rebuildProfile).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state linking to sessions', async () => {
    await renderPage({ ...PROFILE, items: [], nextFocus: '', rebuiltAt: null }, []);
    expect(screen.getByRole('link', { name: 'Upload a session' })).toHaveAttribute('href', '/sessions');
    expect(screen.getByText('Last rebuilt').nextSibling).toHaveTextContent('Never');
    expect(screen.queryByRole('region', { name: 'Next session focus' })).not.toBeInTheDocument();
  });

  it('shows an error with retry when loading fails', async () => {
    vi.mocked(api.fetchProfile).mockRejectedValueOnce(new Error('Network down')).mockResolvedValue(PROFILE);
    vi.mocked(fetchSessions).mockResolvedValue(SESSIONS);
    render(<ProfilePage />);
    expect(screen.getByText('Loading learner profile…')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Demo Student' })).toBeInTheDocument();
  });
});
