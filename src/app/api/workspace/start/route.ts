import { z } from 'zod';
import { startWorkspace } from '@/server/workspace-service';
import { ApiError, toApiErrorResponse } from '@/server/errors';
import type { UploadCandidate } from '@/server/upload-validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const questionText = formData.get('questionText');
    const fileEntries = formData.getAll('files');

    if (typeof questionText !== 'string') {
      throw new ApiError(400, 'INVALID_INPUT', 'questionText must be a string field');
    }

    const files: UploadCandidate[] = [];
    for (const entry of fileEntries) {
      if (!(entry instanceof File)) {
        throw new ApiError(400, 'INVALID_INPUT', 'files must be uploaded file entries');
      }
      const bytes = Buffer.from(await entry.arrayBuffer());
      files.push({ fileName: entry.name, mimeType: entry.type, bytes });
    }

    const draftId = z.uuid().safeParse(formData.get('draftId'));
    const expected = formData.get('expectedWorkspaceId');
    if (!draftId.success || (expected !== '' && !z.uuid().safeParse(expected).success)) throw new ApiError(400, 'INVALID_INPUT', 'Draft identity and expected workspace are required');
    const workspace = await startWorkspace({ questionText, files, draftId: draftId.data, expectedWorkspaceId: expected as string || null });

    return Response.json({ workspaceId: workspace.workspaceId }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
