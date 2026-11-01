"use client";

import dynamic from "next/dynamic";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { LoadingState } from "@/components/shared/LoadingState";

export interface SimpleWhiteboardHandle {
  exportPng(): Promise<Blob | null>;
}

export interface WhiteboardProps {
  disabled?: boolean;
  backgroundImages?: Array<{ id: string; url: string }>;
}

const Editor = dynamic(() => import("./ExcalidrawEditor"), {
  ssr: false,
  loading: () => <LoadingState label="Loading whiteboard…" />,
});

export const SimpleWhiteboard = forwardRef<SimpleWhiteboardHandle, WhiteboardProps>(
  function SimpleWhiteboard(props, ref) {
    const editorRef = useRef<SimpleWhiteboardHandle>(null);
    useImperativeHandle(ref, () => ({
      async exportPng() {
        if (!editorRef.current) throw new Error("The whiteboard is still loading. Please try again.");
        return editorRef.current.exportPng();
      },
    }));

    return <Editor {...props} boardRef={editorRef} />;
  },
);
