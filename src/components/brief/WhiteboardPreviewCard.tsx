import { Card } from "@/components/shared/Card";

/** The student's final whiteboard, or a note that nothing was drawn. */
export function WhiteboardPreviewCard({ assetId }: { assetId: string | null }) {
  return (
    <Card title="Attached work" className={assetId ? "" : "flex-1"}>
      {assetId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/assets/${assetId}`}
          alt="Student's whiteboard"
          className="max-h-72 w-full rounded-lg border border-slate-200 object-contain"
        />
      ) : (
        <p className="text-sm text-slate-500">No drawing attached. Original sources are shown above.</p>
      )}
    </Card>
  );
}
