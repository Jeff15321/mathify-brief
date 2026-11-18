import { LocalFeedbackStore } from './local-feedback-store';
import { LocalAssetStore } from './local-asset-store';
import { LocalProfileStore } from './local-profile-store';
import { LocalSessionStore } from './local-session-store';
import { LocalWorkspaceStore } from './local-workspace-store';
import type { AssetStore, CurrentWorkspaceStore } from './contracts';

export function createStores(dataDir: string): {
  workspaceStore: CurrentWorkspaceStore;
  assetStore: AssetStore;
  feedbackStore: LocalFeedbackStore;
  sessionStore: LocalSessionStore;
  profileStore: LocalProfileStore;
} {
  const workspaceStore = new LocalWorkspaceStore(dataDir);
  const assetStore = new LocalAssetStore(dataDir, workspaceStore);
  return {
    workspaceStore, assetStore, feedbackStore: new LocalFeedbackStore(dataDir),
    sessionStore: new LocalSessionStore(dataDir), profileStore: new LocalProfileStore(dataDir),
  };
}

let cached: ReturnType<typeof createStores> | null = null;

/** Single construction point for production/dev routes (IMPLEMENTATION_PLAN.md Section 7.1). */
export function getStores(): ReturnType<typeof createStores> {
  if (!cached) {
    const dataDir = process.env.LOCAL_DATA_DIR || './data';
    cached = createStores(dataDir);
  }
  return cached;
}
