import 'server-only';
import { LocalFeedbackStore } from './local-feedback-store';
import { LocalAssetStore } from './local-asset-store';
import { LocalProfileStore } from './local-profile-store';
import { LocalSessionStore } from './local-session-store';
import { LocalWorkspaceStore } from './local-workspace-store';
import type { Stores } from './contracts';

export type { Stores } from './contracts';

export function createStores(dataDir: string): Stores {
  const workspaceStore = new LocalWorkspaceStore(dataDir);
  const assetStore = new LocalAssetStore(dataDir, workspaceStore);
  return {
    workspaceStore, assetStore, feedbackStore: new LocalFeedbackStore(dataDir),
    sessionStore: new LocalSessionStore(dataDir), profileStore: new LocalProfileStore(dataDir),
  };
}

let cached: Stores | null = null;

/** Single construction point for production/dev routes (IMPLEMENTATION_PLAN.md Section 7.1). */
export function getStores(): Stores {
  if (!cached) {
    const dataDir = process.env.LOCAL_DATA_DIR || './data';
    cached = createStores(dataDir);
  }
  return cached;
}
