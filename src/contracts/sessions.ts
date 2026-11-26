import type { StoredAsset } from './assets';

export type ObservationCategory = 'struggle' | 'strength' | 'what_works' | 'habit';
export interface SessionObservation { category: ObservationCategory; text: string; quote?: string }
export type SessionStatus = 'pending' | 'ready' | 'failed';

/** One uploaded tutoring session, stored independently of the singleton workspace. */
export interface TutorSession {
  schemaVersion: 1;
  id: string;                 // uuid
  sessionDate: string;        // YYYY-MM-DD, editable
  uploadedAt: string;         // ISO
  updatedAt: string;
  tutorNotes: string;         // '' when none
  transcriptFileName: string;
  transcriptText: string;
  whiteboards: StoredAsset[]; // kind 'whiteboard', images only
  status: SessionStatus;
  summaryStartedAt: string | null;
  title: string | null;       // AI, null until ready
  summary: string | null;     // AI
  observations: SessionObservation[];
  model: string | null; promptVersion: string | null; summarizedAt: string | null;
}

/** List view of a session, without the transcript. */
export interface PublicSessionSummary {
  id: string;
  title: string | null;
  summary: string | null;
  sessionDate: string;
  status: SessionStatus;
  whiteboardCount: number;
  observationCount: number;
}
