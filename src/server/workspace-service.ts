import { DEMO_PROFILE, toPublicWorkspace } from '@/types/domain';
import type { CurrentWorkspace, PublicWorkspace, StoredAsset } from '@/types/domain';
import { MAX_QUESTION_TEXT_LENGTH } from '@/lib/constants';
import { validateFileBatch, type UploadCandidate } from './upload-validation';
import { ApiError } from './errors';
import { getStores, type createStores } from './storage';

type Stores = ReturnType<typeof createStores>;

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
      schemaVersion: 1,
      demoProfile: DEMO_PROFILE,
      questionText,
      attachments: newAssets,
      createdAt: now,
      updatedAt: now,
      phase: 'intake',
      analysis: null,
      answers: {},
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
