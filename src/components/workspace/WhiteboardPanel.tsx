import { forwardRef } from "react";
import { SimpleWhiteboard, type SimpleWhiteboardHandle } from "@/components/whiteboard/SimpleWhiteboard";

export const WhiteboardPanel = forwardRef<SimpleWhiteboardHandle, { disabled?: boolean }>(
  function WhiteboardPanel({ disabled }, ref) {
    return (
      <div className="flex h-full flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Whiteboard</h2>
        <div className="min-h-0 flex-1">
          <SimpleWhiteboard ref={ref} disabled={disabled} />
        </div>
      </div>
    );
  },
);
