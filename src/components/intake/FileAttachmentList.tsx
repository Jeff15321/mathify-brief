'use client';
import { useEffect, useRef } from 'react';
function Preview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    if (link.current) link.current.href = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (file.type === 'application/pdf') return <a ref={link} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Open PDF</a>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} alt={`Preview of ${file.name}`} className="h-20 w-20 rounded object-contain bg-slate-50" />;
}
export function FileAttachmentList({ files, onRemove, onMove }: { files: File[]; onRemove: (index: number) => void; onMove?: (index: number, direction: -1 | 1) => void }) {
  return <ol className="flex flex-col gap-2">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} className="flex flex-wrap items-center gap-3 rounded border border-slate-200 p-2 text-xs">
    <Preview file={file} /><span className="min-w-0 flex-1 break-all">{index + 1}. {file.name}</span>
    <div className="flex flex-wrap gap-2">
      {onMove && <><button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={`Move ${file.name} earlier`} className="disabled:opacity-30">↑</button>
        <button type="button" disabled={index === files.length - 1} onClick={() => onMove(index, 1)} aria-label={`Move ${file.name} later`} className="disabled:opacity-30">↓</button></>}
      <button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`} className="text-red-700">Remove</button>
    </div>
  </li>)}</ol>;
}
