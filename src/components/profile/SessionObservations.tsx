'use client';

import { useRef, useState } from 'react';
import { Lightbulb, Plus, Repeat, Sprout, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { LearnerProfileItem } from '@/contracts/profile';
import type { ObservationCategory } from '@/contracts/sessions';
import type { ProfileUpdate } from '@/schemas/profile';
import { ItemForm, ProfileItemRow } from './ProfileItemRow';

const sections: { category: ObservationCategory; title: string; Icon: LucideIcon; color: string }[] = [
  { category: 'struggle', title: 'Struggles', Icon: TriangleAlert, color: 'text-clay' },
  { category: 'what_works', title: 'What works when teaching', Icon: Lightbulb, color: 'text-brand-deep' },
  { category: 'strength', title: 'Strengths', Icon: Sprout, color: 'text-sage' },
  { category: 'habit', title: 'Habits', Icon: Repeat, color: 'text-muted' },
];

type Mode =
  | { kind: 'read' | 'manage' }
  | { kind: 'add'; category: ObservationCategory }
  | { kind: 'edit' | 'delete'; itemId: string };

export function SessionObservations({ items, onSave }: {
  items: LearnerProfileItem[];
  onSave: (changes: ProfileUpdate) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>({ kind: 'read' });
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const managing = mode.kind !== 'read';
  const actionOpen = mode.kind === 'add' || ('itemId' in mode && items.some(item => item.id === mode.itemId));

  function returnToList(controlId: string) {
    setMode({ kind: 'manage' });
    requestAnimationFrame(() => (document.getElementById(controlId) ?? toggle.current)?.focus());
  }

  async function remove(item: LearnerProfileItem) {
    if (!window.confirm('Delete this item from the learner profile?')) return;
    setDeleteError(null);
    setMode({ kind: 'delete', itemId: item.id });
    try {
      await onSave({ deleteItemIds: [item.id] });
      returnToList(`add-${item.category}`);
    } catch (err) {
      setDeleteError({ id: item.id, message: err instanceof Error ? err.message : 'The change could not be saved.' });
      returnToList(`delete-${item.id}`);
    }
  }

  return (
    <section aria-labelledby="observations-title">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-connector/60 pb-3.5">
        <h2 id="observations-title" className="text-[1.375rem] font-bold tracking-tight">Session observations</h2>
        <button ref={toggle} type="button" disabled={actionOpen}
          onClick={() => { setDeleteError(null); setMode({ kind: managing ? 'read' : 'manage' }); }}
          className="rounded-panel border border-line bg-card px-3 py-1.5 text-sm font-bold text-brand-deep hover:bg-wash disabled:opacity-50">
          {managing ? 'Done editing' : 'Edit observations'}
        </button>
      </header>
      {sections.map(({ category, title, Icon, color }) => {
        const observations = items.filter(item => item.category === category);
        const adding = mode.kind === 'add' && mode.category === category;
        const addId = `add-${category}`;
        return (
          <section key={category} aria-labelledby={`observations-${category}`}
            className="grid gap-2.5 border-b border-line py-[17px] md:grid-cols-[13rem_minmax(0,1fr)] md:gap-5">
            <div>
              <h3 id={`observations-${category}`} className="flex items-start gap-2 text-base font-bold leading-6">
                <Icon className={`mt-1 size-4 shrink-0 ${color}`} aria-hidden />{title}
              </h3>
              {managing && <button id={addId} type="button" aria-label={`Add to ${title}`} disabled={actionOpen}
                onClick={() => setMode({ kind: 'add', category })}
                className="mt-2 inline-flex items-center gap-1 rounded-panel px-2 py-1 text-sm font-bold text-brand-deep hover:bg-wash disabled:opacity-50">
                <Plus className="size-3.5" aria-hidden /> Add
              </button>}
            </div>
            <div className="min-w-0 space-y-3.5">
              {observations.length === 0 && !adding && <p className="text-sm text-muted">Nothing here yet.</p>}
              {observations.length > 0 && <ul className="grid gap-3.5">
                {observations.map(item => (
                  <li key={item.id}>
                    {mode.kind === 'edit' && mode.itemId === item.id
                      ? <ItemForm initial={item} onCancel={() => returnToList(`edit-${item.id}`)}
                          onSubmit={async values => {
                            await onSave({ upsertItems: [{ id: item.id, category, ...values }] });
                            returnToList(`edit-${item.id}`);
                          }} />
                      : <ProfileItemRow item={item} managing={managing} disabled={actionOpen}
                          error={deleteError?.id === item.id ? deleteError.message : undefined}
                          onEdit={() => { setDeleteError(null); setMode({ kind: 'edit', itemId: item.id }); }}
                          onDelete={() => void remove(item)} />}
                  </li>
                ))}
              </ul>}
              {adding && <ItemForm initial={{ text: '', status: 'active' }} onCancel={() => returnToList(addId)}
                onSubmit={async values => {
                  await onSave({ upsertItems: [{ category, ...values }] });
                  returnToList(addId);
                }} />}
            </div>
          </section>
        );
      })}
    </section>
  );
}
