import { z } from "zod";
import { getStores } from "@/server/storage";
import { ApiError, toApiErrorResponse } from "@/server/errors";
import { LocalFeedbackStore } from "@/server/storage/local-feedback-store";
import path from "node:path";

export const runtime = "nodejs";

const feedbackSchema = z.object({
  overallUsefulness: z.number().int().min(1).max(5),
  breakdownAccuracy: z.number().int().min(1).max(5),
  probeQuality: z.number().int().min(1).max(5),
  comments: z.string().max(5000),
  submittedAt: z.string().min(1),
});

/** POST /api/feedback — stores tutor feedback locally (best-effort, no auth). */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "INVALID_INPUT", "Body must be JSON");
    }
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "INVALID_INPUT", `Invalid feedback: ${parsed.error.message}`);
    }

    // Store in the same data directory as workspace data
    const dataDir = process.env.LOCAL_DATA_DIR || "./data";
    const store = new LocalFeedbackStore(dataDir);
    await store.add(parsed.data);

    return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
