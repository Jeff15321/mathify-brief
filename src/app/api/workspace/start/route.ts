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

    await startWorkspace({ questionText, files });

    return Response.json({ ok: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
