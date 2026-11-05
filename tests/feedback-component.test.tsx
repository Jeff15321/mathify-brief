import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TutorFeedbackSurvey } from '@/components/brief/TutorFeedbackSurvey';

const reportId = 'a'.repeat(64);
const response = (value: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(value), { status }));
const fillRatings = () => {
  for (const label of ['Accuracy: 4', 'Clarity: 5', 'Usefulness for choosing a starting point: 3']) {
    fireEvent.click(screen.getByRole('radio', { name: label }));
  }
};
afterEach(() => { vi.unstubAllGlobals(); });

describe('tutor survey', () => {
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
    expect(screen.getByRole('radio', { name: 'Accuracy: 4' })).toBeChecked();
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
