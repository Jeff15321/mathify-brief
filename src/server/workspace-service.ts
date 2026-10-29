import { DEMO_PROFILE, toPublicAnalysis } from '@/types/domain';
import type { CurrentWorkspace, PublicWorkspace, StoredAsset } from '@/types/domain';
import { MAX_QUESTION_TEXT_LENGTH } from '@/lib/constants';
import { validateFileBatch, type UploadCandidate } from './upload-validation';
import { ApiError } from './errors';
import { getStores, type createStores } from './storage';
import { toPublicProbing } from './helpers/probe-flow-helper';

type Stores = ReturnType<typeof createStores>;

/**
 * Projects the stored workspace into the browser-safe view. Answer keys and unserved
 * (buffered) probes are never included; the brief is only present after submission.
 */
export function toPublicWorkspace(workspace: CurrentWorkspace): PublicWorkspace {
  return {
    profile: workspace.demoProfile,
    questionText: workspace.questionText,
    attachments: workspace.attachments,
    phase: workspace.phase,
    analysis: workspace.analysis ? toPublicAnalysis(workspace.analysis) : null,
    probing: workspace.analysis ? toPublicProbing(workspace.probeSteps, workspace.cursor, workspace.updatedAt) : null,
    whiteboardAsset: workspace.whiteboardAsset,
    brief: workspace.brief,
  };
}

export async function getPublicWorkspace(stores: Stores = getStores()): Promise<PublicWorkspace | null> {
  const { workspaceStore } = stores;
  const workspace = await workspaceStore.read();
  return workspace ? toPublicWorkspace(workspace) : null;
}

export interface StartWorkspaceInput {
  questionText: string;
  files: UploadCandidate[];
}

export async function startWorkspace(
  input: StartWorkspaceInput,
  stores: Stores = getStores(),
): Promise<void> {
  const questionText = input.questionText.trim();

  if (questionText.length > MAX_QUESTION_TEXT_LENGTH) {
    throw new ApiError(
      400,
      'INVALID_INPUT',
      `questionText must be at most ${MAX_QUESTION_TEXT_LENGTH} characters`,
    );
  }

  if (questionText.length === 0 && input.files.length === 0) {
    throw new ApiError(
      400,
      'INVALID_INPUT',
      'Provide a typed question or at least one attached file',
    );
  }

  const fileErrors = validateFileBatch(input.files);
  if (fileErrors.length > 0) {
    throw new ApiError(400, 'INVALID_INPUT', fileErrors.join('; '));
  }

  const { workspaceStore, assetStore } = stores;
  const previousWorkspace = await workspaceStore.read();

  const newAssets: StoredAsset[] = [];
  try {
    for (const file of input.files) {
      const asset = await assetStore.put({
        kind: 'attachment',
        fileName: file.fileName,
        // validateFileBatch already confirmed this is an allowed MimeType.
        mimeType: file.mimeType as StoredAsset['mimeType'],
        bytes: file.bytes,
      });
      newAssets.push(asset);
    }

    const now = new Date().toISOString();
    const newWorkspace: CurrentWorkspace = {
      schemaVersion: 4,
      demoProfile: DEMO_PROFILE,
      questionText,
      attachments: newAssets,
      createdAt: now,
      updatedAt: now,
      phase: 'intake',
      analysis: null,
      probeSteps: [],
      cursor: null,
      whiteboardAsset: null,
      brief: null,
    };

    await workspaceStore.write(newWorkspace);
  } catch (err) {
    // Roll back newly uploaded assets; the previous workspace (if any) remains untouched
    // because write() only replaces workspace.json on a successful atomic rename.
    await Promise.allSettled(newAssets.map((asset) => assetStore.remove(asset)));
    throw err;
  }

  if (previousWorkspace) {
    const staleAssets = [...previousWorkspace.attachments, previousWorkspace.whiteboardAsset].filter(
      (asset): asset is StoredAsset => asset !== null,
    );
    await Promise.allSettled(staleAssets.map((asset) => assetStore.remove(asset)));
  }
}
