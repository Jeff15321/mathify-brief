import type { PublicWorkspace } from '@/contracts/workspace';
export type WorkspaceView = 'draft' | 'uploading' | 'analyzing' | 'probing' | 'submitting' | 'complete';
export function viewFor(workspace: PublicWorkspace | null): WorkspaceView {
  if (!workspace) return 'draft';
  if (workspace.phase === 'complete') return 'complete';
  return workspace.phase === 'ready' ? 'probing' : 'analyzing';
}
