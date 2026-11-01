import { createRef, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ExcalidrawEditor from "@/components/whiteboard/ExcalidrawEditor";
import type { SimpleWhiteboardHandle } from "@/components/whiteboard/SimpleWhiteboard";
import { MAX_WHITEBOARD_SIZE_BYTES } from "@/lib/constants";

const state = vi.hoisted(() => ({
  api: {
    getSceneElements: vi.fn<() => Array<{ id: string; type: string; y: number; height: number }>>(),
    getAppState: vi.fn(() => ({})),
    getFiles: vi.fn(() => ({})),
    addFiles: vi.fn(),
    updateScene: vi.fn(),
    scrollToContent: vi.fn(),
  },
  exportToBlob: vi.fn<() => Promise<Blob>>(),
}));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: ({ excalidrawAPI, viewModeEnabled }: {
    excalidrawAPI: (api: typeof state.api) => void;
    viewModeEnabled?: boolean;
  }) => {
    useEffect(() => excalidrawAPI(state.api), [excalidrawAPI]);
    return <div data-testid="editor" data-locked={!!viewModeEnabled} />;
  },
  MainMenu: Object.assign(() => null, { DefaultItems: { ClearCanvas: () => null } }),
  CaptureUpdateAction: { NEVER: "NEVER" },
  convertToExcalidrawElements: (elements: unknown[]) => elements,
  getDataURL: async () => "data:image/png;base64,test",
  exportToBlob: state.exportToBlob,
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.api.getSceneElements.mockReturnValue([]);
  state.exportToBlob.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 100, height: 50, close: vi.fn() })));
});

afterEach(() => vi.unstubAllGlobals());

describe("Excalidraw whiteboard", () => {
  it("omits a genuinely blank scene", async () => {
    const ref = createRef<SimpleWhiteboardHandle>();
    render(<ExcalidrawEditor boardRef={ref} />);
    expect(await ref.current!.exportPng()).toBeNull();
    expect(state.exportToBlob).not.toHaveBeenCalled();
  });

  it("exports the scene with files, white background, and bounded PNG dimensions", async () => {
    state.api.getSceneElements.mockReturnValue([{ id: "ink", type: "freedraw", y: 0, height: 20 }]);
    const ref = createRef<SimpleWhiteboardHandle>();
    render(<ExcalidrawEditor boardRef={ref} disabled />);
    expect(screen.getByTestId("editor")).toHaveAttribute("data-locked", "true");
    expect(await ref.current!.exportPng()).toBeInstanceOf(Blob);
    expect(state.exportToBlob).toHaveBeenCalledWith(expect.objectContaining({
      mimeType: "image/png",
      maxWidthOrHeight: 1600,
      appState: expect.objectContaining({ exportBackground: true, viewBackgroundColor: "#ffffff", exportEmbedScene: false }),
    }));
  });

  it("rejects oversized exports rather than dropping student work", async () => {
    state.api.getSceneElements.mockReturnValue([{ id: "image", type: "image", y: 0, height: 50 }]);
    state.exportToBlob.mockResolvedValue(new Blob([new Uint8Array(MAX_WHITEBOARD_SIZE_BYTES + 1)]));
    const ref = createRef<SimpleWhiteboardHandle>();
    render(<ExcalidrawEditor boardRef={ref} />);
    await expect(ref.current!.exportPng()).rejects.toThrow("too large");
  });

  it("imports every uploaded image once without replacing existing ink", async () => {
    state.api.getSceneElements.mockReturnValue([{ id: "ink", type: "freedraw", y: 0, height: 20 }]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("image", { headers: { "Content-Type": "image/png" } })));
    const ref = createRef<SimpleWhiteboardHandle>();
    const images = [{ id: "a", url: "/api/assets/a" }, { id: "b", url: "/api/assets/b" }];
    const { rerender } = render(<ExcalidrawEditor boardRef={ref} backgroundImages={images} />);
    await waitFor(() => expect(state.api.addFiles).toHaveBeenCalledTimes(2));
    expect(state.api.updateScene).toHaveBeenLastCalledWith(expect.objectContaining({
      elements: expect.arrayContaining([expect.objectContaining({ id: "ink" }), expect.objectContaining({ fileId: "b" })]),
    }));
    rerender(<ExcalidrawEditor boardRef={ref} backgroundImages={[...images]} />);
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(state.api.scrollToContent).toHaveBeenCalledTimes(1);
    expect(state.api.addFiles).toHaveBeenCalledTimes(2);
  });

  it("provides manual fit-to-work without changing the scene and locks it during submission", () => {
    const ref = createRef<SimpleWhiteboardHandle>();
    const { rerender } = render(<ExcalidrawEditor boardRef={ref} />);
    fireEvent.click(screen.getByRole("button", { name: "Fit to work" }));
    expect(state.api.scrollToContent).toHaveBeenCalledWith(undefined, { fitToViewport: true });
    expect(state.api.updateScene).not.toHaveBeenCalled();
    rerender(<ExcalidrawEditor boardRef={ref} disabled />);
    expect(screen.getByRole("button", { name: "Fit to work" })).toBeDisabled();
  });

  it("shows image-load failures, blocks submission, and allows an explicit retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response("image", { headers: { "Content-Type": "image/png" } }));
    vi.stubGlobal("fetch", fetchMock);
    const ref = createRef<SimpleWhiteboardHandle>();
    render(<ExcalidrawEditor boardRef={ref} backgroundImages={[{ id: "a", url: "/api/assets/a" }]} />);
    await screen.findByRole("alert");
    await expect(ref.current!.exportPng()).rejects.toThrow("Retry loading");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(state.api.addFiles).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
