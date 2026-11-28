import type { LearnerProfile } from '@/contracts/profile';
import type { TutorSession } from '@/contracts/sessions';
import type { TutorFeedbackInput } from '@/schemas/feedback';
import type { PublicWorkspace } from '@/contracts/workspace';
import type { AssetKind, ImageMimeType, MimeType, StoredAsset } from '@/contracts/assets';
import type { CurrentWorkspace } from '@/server/workspace/schema';

/** Updater for `CurrentWorkspaceStore.update`: receives the current workspace and returns the next one. */
export type WorkspaceUpdater = (current: CurrentWorkspace | null) => CurrentWorkspace | Promise<CurrentWorkspace>;

export interface CurrentWorkspaceStore {
  read(): Promise<CurrentWorkspace | null>;
  write(workspace: CurrentWorkspace): Promise<void>;
  /**
   * Serialized read-modify-write. Concurrent calls (e.g. probe generation and an answer) never
   * overwrite each other. Throwing from `updater` aborts without writing. Never call the store
   * from inside `updater`, and keep slow work (AI calls) outside it.
   */
  update(updater: WorkspaceUpdater): Promise<CurrentWorkspace>;
  clear(): Promise<void>;
}

export interface AssetStore {
  put(input: {
    kind: AssetKind;
    fileName: string;
    mimeType: MimeType;
    bytes: Buffer;
  }): Promise<StoredAsset>;
  get(id: string): Promise<{ meta: StoredAsset; bytes: Buffer } | null>;
  remove(asset: StoredAsset): Promise<void>;
}

export interface SavedTutorFeedback extends TutorFeedbackInput {
  schemaVersion: 1;
  submittedAt: string;
  report: Pick<PublicWorkspace, 'profile' | 'questionText' | 'analysis' | 'attachments' | 'whiteboardAsset' | 'brief'> & {
    workspaceCreatedAt: string;
  };
  /** Keep the evaluated images/files even after a new intake removes workspace assets. */
  assets: { id: string; base64: string }[];
}

export interface FeedbackStore {
  read(reportId: string): Promise<SavedTutorFeedback | null>;
  write(feedback: SavedTutorFeedback): Promise<void>;
  list(): Promise<SavedTutorFeedback[]>;
}

export interface WhiteboardFile { fileName: string; mimeType: ImageMimeType; bytes: Buffer }
export type SessionUpdater = (current: TutorSession) => TutorSession | Promise<TutorSession>;

export interface SessionStore {
  list(): Promise<TutorSession[]>;
  read(id: string): Promise<TutorSession | null>;
  create(session: Omit<TutorSession, 'whiteboards'>, whiteboards: WhiteboardFile[]): Promise<TutorSession>;
  update(id: string, updater: SessionUpdater): Promise<TutorSession>;
  remove(id: string): Promise<void>;
  readAsset(id: string, assetId: string): Promise<{ meta: StoredAsset; bytes: Buffer } | null>;
}

export type ProfileUpdater = (current: LearnerProfile) => LearnerProfile | Promise<LearnerProfile>;

export interface ProfileStore {
  read(): Promise<LearnerProfile>;
  update(updater: ProfileUpdater): Promise<LearnerProfile>;
}

export interface Stores {
  workspaceStore: CurrentWorkspaceStore;
  assetStore: AssetStore;
  feedbackStore: FeedbackStore;
  sessionStore: SessionStore;
  profileStore: ProfileStore;
}
