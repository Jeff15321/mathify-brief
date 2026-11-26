import { createSession, listSessions } from '@/server/sessions/service';
import { ApiError, toApiErrorResponse } from '@/server/errors';
import type { UploadCandidate } from '@/server/upload-validation';

export const runtime = 'nodejs';

async function toCandidate(entry: FormDataEntryValue, field: string): Promise<UploadCandidate> {
  if (!(entry instanceof File)) throw new ApiError(400, 'INVALID_INPUT', `${field} must be an uploaded file`);
  return { fileName: entry.name, mimeType: entry.type, bytes: Buffer.from(await entry.arrayBuffer()) };
}

export async function GET() {
  try {
    return Response.json({ sessions: await listSessions() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

/** Saves the upload, then summarizes it; responds 201 even when the summary failed. */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const transcripts = formData.getAll('transcript');
    if (transcripts.length > 1) throw new ApiError(400, 'INVALID_INPUT', 'Upload exactly one transcript');
    const sessionDate = formData.get('sessionDate');
    const tutorNotes = formData.get('tutorNotes');
    if ((sessionDate !== null && typeof sessionDate !== 'string') || (tutorNotes !== null && typeof tutorNotes !== 'string')) {
      throw new ApiError(400, 'INVALID_INPUT', 'sessionDate and tutorNotes must be text fields');
    }

    const session = await createSession({
      transcript: transcripts[0] ? await toCandidate(transcripts[0], 'transcript') : null,
      whiteboards: await Promise.all(formData.getAll('whiteboards').map((entry) => toCandidate(entry, 'whiteboards'))),
      sessionDate: sessionDate ?? undefined,
      tutorNotes: tutorNotes ?? undefined,
    });
    return Response.json({ session }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
