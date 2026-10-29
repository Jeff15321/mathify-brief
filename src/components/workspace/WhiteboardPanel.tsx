import { forwardRef } from "react";
import { SimpleWhiteboard, type SimpleWhiteboardHandle } from "@/components/whiteboard/SimpleWhiteboard";
import type { StoredAsset } from "@/types/domain";

/** Filter attachments to image types that can be rendered as canvas backgrounds. */
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const WhiteboardPanel = forwardRef<SimpleWhiteboardHandle, { disabled?: boolean; attachments?: StoredAsset[] }>(
  function WhiteboardPanel({ disabled, attachments = [] }, ref) {
    const bgImages = attachments
      .filter((a) => IMAGE_MIME_TYPES.has(a.mimeType))
      .map((a) => ({ id: a.id, url: `/api/assets/${a.id}` }));

    return (
      <div className="flex h-full flex-col gap-3">
        <div className="min-h-0 flex-1">
          <SimpleWhiteboard ref={ref} disabled={disabled} backgroundImages={bgImages} />
        </div>
      </div>
    );
  },
);
