'use client';
import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { LearnerProfileItem } from '@/contracts/profile';
import type { ObservationCategory } from '@/contracts/sessions';
import type { ProfileUpdate } from '@/schemas/profile';
import { Card } from '@/components/shared/Card';
import { ItemForm, ProfileItemRow } from './ProfileItemRow';

/** One category of the profile; "Add" creates a tutor item. */
export function ProfileSection({ category, title, icon, accent, items, onSave }: {
  category: ObservationCategory; title: string; icon: ReactNode; accent: string; items: LearnerProfileItem[]; onSave: (changes: ProfileUpdate) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  return <Card title={<>{title} <span className="font-normal text-muted">{items.length}</span></>} icon={icon}
    badge={!adding && <button type="button" onClick={() => setAdding(true)} aria-label={`Add to ${title}`}
      className="inline-flex items-center gap-1 rounded-full border border-connector px-3 py-1 text-sm font-bold text-ink hover:bg-fill">
      <Plus className="h-3.5 w-3.5" aria-hidden /> Add
    </button>}>
    {items.length === 0 && !adding && <p className="text-sm text-muted">Nothing here yet.</p>}
    {items.length > 0 && <ul className="mt-1 flex flex-col gap-4">
      {items.map(item => <ProfileItemRow key={item.id} item={item} accent={accent} onSave={onSave} />)}
    </ul>}
    {adding && <ItemForm initial={{ text: '', status: 'active' }} onCancel={() => setAdding(false)}
      onSubmit={async ({ text, status }) => { await onSave({ upsertItems: [{ category, text, status }] }); setAdding(false); }} />}
  </Card>;
}
