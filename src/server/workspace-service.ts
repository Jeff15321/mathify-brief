import { createHash, randomUUID } from 'node:crypto';
import { getFeedbackReportId } from './feedback-report';
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
    workspaceId: workspace.workspaceId,
    draftId: workspace.draftId,
    analysisStatus: workspace.analysis ? 'ready' : workspace.analysisOperation?.status === 'generating'
      && Date.now() - Date.parse(workspace.analysisOperation.startedAt) < 120_000 ? 'generating'
      : workspace.analysisOperation ? 'failed' : 'idle',
    whiteboardState: workspace.whiteboardState,
    feedbackReportId: getFeedbackReportId(workspace),
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
  draftId?: string;
  expectedWorkspaceId?: string | null;
}

export async function startWorkspace(
  input: StartWorkspaceInput,
  stores: Stores = getStores(),
): Promise<CurrentWorkspace> {
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

  const draftId = input.draftId ?? randomUUID();
  const inputHash = createHash('sha256').update(JSON.stringify([questionText, ...input.files.map(f =>
    [f.fileName, f.mimeType, createHash('sha256').update(f.bytes).digest('hex')])])).digest('hex');
  if (previousWorkspace?.draftId === draftId) {
    if (previousWorkspace.inputHash !== inputHash) throw new ApiError(409, 'INVALID_STATE', 'This draft was already begun with different sources. Start a new question.');
    return previousWorkspace;
  }
  const expectedId = input.expectedWorkspaceId === undefined ? previousWorkspace?.workspaceId ?? null : input.expectedWorkspaceId;
  const newAssets: StoredAsset[] = [];
  let saved: CurrentWorkspace;
  let replaced: CurrentWorkspace | null = null;
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
      schemaVersion: 5,
      workspaceId: randomUUID(), draftId, inputHash,
      analysisOperation: null, submissionId: null, whiteboardState: 'none',
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

    saved = await workspaceStore.update(current => {
      if (current?.draftId === draftId && current.inputHash === inputHash) return current;
      if ((current?.workspaceId ?? null) !== expectedId) throw new ApiError(409, 'INVALID_STATE', 'The workspace changed. Reload before starting a new question.');
      replaced = current;
      return newWorkspace;
    });
    if (saved.workspaceId !== newWorkspace.workspaceId) {
      await Promise.allSettled(newAssets.map(asset => assetStore.remove(asset)));
    }
  } catch (err) {
    // Roll back newly uploaded assets; the previous workspace (if any) remains untouched
    // because write() only replaces workspace.json on a successful atomic rename.
    await Promise.allSettled(newAssets.map((asset) => assetStore.remove(asset)));
    throw err;
  }

  if (replaced) {
    const previous = replaced as CurrentWorkspace;
    const staleAssets = [...previous.attachments, previous.whiteboardAsset].filter(
      (asset): asset is StoredAsset => asset !== null,
    );
    await Promise.allSettled(staleAssets.map((asset) => assetStore.remove(asset)));
  }
  return saved!;
}
