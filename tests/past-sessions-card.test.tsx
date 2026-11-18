import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import * as api from '@/lib/api-client';
import { PastSessionsCard } from '@/components/brief/PastSessionsCard';

vi.mock('@/lib/api-client', () => ({ fetchBriefHistory: vi.fn() }));

const READY = { status: 'ready' as const, generatedAt: '2026-11-08T12:00:00.000Z', model: 'mock-provider', promptVersion: 'history-v1' };

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('PastSessionsCard', () => {
  it('shows a skeleton, then the bullets with a profile link', async () => {
    vi.mocked(api.fetchBriefHistory).mockResolvedValue({ ...READY, bullets: ['Expanded $2(x+3)$ as $2x+3$ on Oct 3.', 'Area models helped.', 'The bracket slip is the first step (Sep 26 and Oct 3).'] });
    render(<PastSessionsCard workspaceId="w1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking past sessions…');

    const section = await screen.findByRole('region', { name: 'Relevant from past sessions' });

    expect(api.fetchBriefHistory).toHaveBeenCalledWith('w1');
    expect(section.querySelectorAll('li')).toHaveLength(3);
    expect(section.querySelector('.katex')).not.toBeNull();
    expect(screen.getByText('Area models helped.')).toBeInTheDocument();
    expect(screen.getByText('Sep 26 and Oct 3')).toHaveClass('text-slate-400');
    expect(screen.getByRole('link', { name: 'View learner profile' })).toHaveAttribute('href', '/profile');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    ['no bullets', () => vi.mocked(api.fetchBriefHistory).mockResolvedValue({ ...READY, bullets: [] })],
    ['a stored failure', () => vi.mocked(api.fetchBriefHistory).mockResolvedValue({ status: 'failed' })],
    ['a request error', () => vi.mocked(api.fetchBriefHistory).mockRejectedValue(new Error('boom'))],
  ])('renders nothing after %s', async (_label, arrange) => {
    arrange();
    const { container } = render(<PastSessionsCard workspaceId="w1" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
