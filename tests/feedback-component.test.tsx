import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TutorFeedbackSurvey } from '@/components/brief/TutorFeedbackSurvey';

const reportId = 'a'.repeat(64);
const response = (value: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(value), { status }));
const fillRatings = () => {
  for (const label of ['4 — Accurate', '5 — Very easy', '3 — Somewhat useful']) {
    fireEvent.click(screen.getByRole('radio', { name: label }));
  }
};
afterEach(() => { vi.unstubAllGlobals(); });

describe('tutor survey', () => {
  it('offers unselected numeric scales with descriptive names and matching endpoints', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => response({ feedback: null })));
    render(<TutorFeedbackSurvey reportId={reportId} />);
    await screen.findByRole('button', { name: 'Save feedback' });
    const accuracy = screen.getByRole('group', { name: 'Accuracy' });
    const clarity = screen.getByRole('group', { name: 'Clarity' });
    const usefulness = screen.getByRole('group', { name: 'Usefulness' });
    expect(accuracy).toHaveAccessibleDescription("How well did this report reflect the student's work?");
    expect(clarity).toHaveAccessibleDescription('How easy was the report to understand?');
    expect(usefulness).toHaveAccessibleDescription('How useful was the report for understanding where the student needs support?');
    expect(within(accuracy).getByRole('radio', { name: '3 — Mixed' })).toBeVisible();
    expect(within(clarity).getByRole('radio', { name: '3 — Neither difficult nor easy' })).toBeVisible();
    expect(within(usefulness).getByRole('radio', { name: '1 — Not useful' })).toBeVisible();
    for (const group of [accuracy, clarity, usefulness]) {
      expect(within(group).getAllByRole('radio').map((radio) => radio.closest('label')!.textContent)).toEqual(['1', '2', '3', '4', '5']);
    }
    expect(within(accuracy).getByText('Very inaccurate')).toBeVisible();
    expect(within(accuracy).getByText('Very accurate')).toBeVisible();
    expect(within(clarity).getByText('Very difficult')).toBeVisible();
    expect(within(clarity).getByText('Very easy')).toBeVisible();
    expect(within(usefulness).getByText('Not useful')).toBeVisible();
    expect(within(usefulness).getByText('Very useful')).toBeVisible();
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked();
      expect(radio).toBeRequired();
      expect(radio).not.toHaveAccessibleName(/^[1-5]$/);
    }
    expect(screen.getByRole('textbox', { name: /What was inaccurate, missing, or unnecessary/ })).not.toBeRequired();
  });

  it('keeps one choice per dimension and clears an unsaved draft when the report changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => response({ feedback: null })));
    const { rerender } = render(<TutorFeedbackSurvey reportId={reportId} />);
    await screen.findByRole('button', { name: 'Save feedback' });
    fillRatings();
    fireEvent.click(screen.getByRole('radio', { name: '3 — Mixed' }));
    expect(screen.getByRole('radio', { name: '4 — Accurate' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: '3 — Mixed' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '5 — Very easy' })).toBeChecked();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'For the old report' } });
    rerender(<TutorFeedbackSurvey reportId={'b'.repeat(64)} />);
    await screen.findByRole('button', { name: 'Save feedback' });
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('submits ratings with exact identity, prevents double submit, and confirms success', async () => {
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn().mockImplementationOnce(() => response({ feedback: null }))
      .mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal('fetch', fetchMock);
    render(<TutorFeedbackSurvey reportId={reportId} />);
    const submit = await screen.findByRole('button', { name: 'Save feedback' });
    fillRatings();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Less clutter' } });
    fireEvent.click(submit);
    expect(screen.getByRole('button', { name: 'Saving feedback…' })).toBeDisabled();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ reportId, accuracy: 4, clarity: 5, startingPointUsefulness: 3, comments: 'Less clutter' });
    resolve(new Response(JSON.stringify({ feedback: { reportId } })));
    expect(await screen.findByText(/your feedback is saved/)).toBeVisible();
  });

  it('keeps ratings and comments after an error so a retry can succeed', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(() => response({ feedback: null }))
      .mockImplementationOnce(() => response({ error: { message: 'Storage unavailable. Try again.' } }, 500))
      .mockImplementationOnce(() => response({ feedback: { reportId } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<TutorFeedbackSurvey reportId={reportId} />);
    await screen.findByRole('button', { name: 'Save feedback' });
    fillRatings();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save feedback' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable');
    expect(screen.getByRole('textbox')).toHaveValue('Keep this draft');
    expect(screen.getByRole('radio', { name: '4 — Accurate' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save feedback' }));
    expect(await screen.findByText(/your feedback is saved/)).toBeVisible();
  });

  it('restores saved status and resets it when report identity changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => response({ feedback: { reportId } }))
      .mockImplementationOnce(() => response({ feedback: null })));
    const { rerender } = render(<TutorFeedbackSurvey reportId={reportId} />);
    expect(await screen.findByText(/your feedback is saved/)).toBeVisible();
    rerender(<TutorFeedbackSurvey reportId={'b'.repeat(64)} />);
    expect(await screen.findByRole('button', { name: 'Save feedback' })).toBeVisible();
    expect(screen.queryByText(/your feedback is saved/)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('requires all ratings and lets a failed saved-status lookup be retried', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(() => response({ feedback: null }));
    vi.stubGlobal('fetch', fetchMock);
    render(<TutorFeedbackSurvey reportId={reportId} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    const submit = await screen.findByRole('button', { name: 'Save feedback' });
    fireEvent.submit(submit.closest('form')!);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Choose a rating'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
