import type { ObservationCategory } from './sessions';

export interface DemoProfile {
  displayName: 'Demo Student';
  grade: 9;
}

export const DEMO_PROFILE: DemoProfile = { displayName: 'Demo Student', grade: 9 };

export type ProfileItemStatus = 'active' | 'improving' | 'resolved';
export interface ProfileEvidence { sessionId: string; date: string; quote?: string }
export interface LearnerProfileItem {
  id: string; category: ObservationCategory; text: string;
  status: ProfileItemStatus; source: 'ai' | 'tutor'; evidence: ProfileEvidence[];
  /** The AI text of a tutor item that was converted from an AI item; used to dedupe rebuilds. */
  originText?: string;
}

/** The single demo student's profile, rebuilt by AI from every ready session; tutor items are kept. */
export interface LearnerProfile {
  schemaVersion: 1; nextFocus: string; nextFocusSource: 'ai' | 'tutor'; items: LearnerProfileItem[]; tutorNotes: string;
  updatedAt: string; rebuiltAt: string | null; rebuildStatus: 'idle' | 'rebuilding' | 'failed';
  model: string | null; promptVersion: string | null;
  /** AI items the tutor deleted, newest last; rebuilds never re-add them. */
  dismissed: { category: ObservationCategory; text: string }[];
}
