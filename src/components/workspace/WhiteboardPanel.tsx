import { forwardRef, useMemo } from "react";
import { SimpleWhiteboard, type WhiteboardProps, type SimpleWhiteboardHandle } from "@/components/whiteboard/SimpleWhiteboard";
import { isImageMimeType, type StoredAsset } from "@/contracts/assets";

export const WhiteboardPanel = forwardRef<SimpleWhiteboardHandle, WhiteboardProps & { attachments?: StoredAsset[] }>(
  function WhiteboardPanel({ disabled, attachments = [], ...props }, ref) {
    const bgImages = useMemo(() => attachments
      .filter((a) => isImageMimeType(a.mimeType))
      .map((a) => ({ id: a.id, url: `/api/assets/${a.id}` })), [attachments]);

    return (
      <div className="flex h-full flex-col gap-3">
        <div className="min-h-0 flex-1">
          <SimpleWhiteboard ref={ref} {...props} disabled={disabled} backgroundImages={bgImages} />
        </div>
      </div>
    );
  },
);
