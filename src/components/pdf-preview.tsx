"use client";

import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import {
  GlobalWorkerOptions,
  getDocument,
  PasswordResponses,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type RenderTask,
  version,
} from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

const assets = `/pdfjs/${version}/`;
const maxCanvasPixels = 12_000_000;

export function PdfPreview({ blob }: { blob: Blob }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [width, setWidth] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [renderError, setRenderError] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let task: PDFDocumentLoadingTask | undefined;
    let cancelled = false;
    const base = new URL(assets, window.location.origin);
    GlobalWorkerOptions.workerSrc = new URL("pdf.worker.mjs", base).href;

    async function load() {
      try {
        const data = await blob.arrayBuffer();
        if (cancelled) return;
        task = getDocument({
          data,
          cMapUrl: new URL("cmaps/", base).href,
          standardFontDataUrl: new URL("standard_fonts/", base).href,
          iccUrl: new URL("iccs/", base).href,
          wasmUrl: new URL("wasm/", base).href,
          maxImageSize: 32_000_000,
        });
        const loaded = await task.promise;
        if (!cancelled) setPdf(loaded);
      } catch (error) {
        if (cancelled) return;
        const protectedPdf =
          error instanceof Error &&
          "code" in error &&
          error.code === PasswordResponses.NEED_PASSWORD;
        setLoadError(
          protectedPdf
            ? "Este PDF está protegido por senha. Baixe o arquivo para abri-lo."
            : "Não foi possível exibir este PDF. Você pode baixar o arquivo.",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
      void task?.destroy().catch(() => {});
    };
  }, [blob]);

  useEffect(() => {
    const element = scroller.current;
    if (!pdf || !element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [pdf]);

  useEffect(() => {
    const element = canvas.current;
    if (!pdf || !element || width <= 32) return;
    let rendering: RenderTask | undefined;
    let cancelled = false;

    async function render() {
      if (!pdf || !element) return;
      try {
        const current = await pdf.getPage(page);
        if (cancelled) return;
        const original = current.getViewport({ scale: 1 });
        const scale = (Math.min(width - 32, 850) / original.width) * (zoom / 100);
        const viewport = current.getViewport({ scale });
        const density = Math.min(
          window.devicePixelRatio || 1,
          Math.sqrt(maxCanvasPixels / (viewport.width * viewport.height)),
          8192 / Math.max(viewport.width, viewport.height),
        );
        element.width = Math.max(1, Math.floor(viewport.width * density));
        element.height = Math.max(1, Math.floor(viewport.height * density));
        element.style.width = `${viewport.width}px`;
        element.style.height = `${viewport.height}px`;
        rendering = current.render({
          canvas: element,
          transform: [density, 0, 0, density, 0, 0],
          viewport,
        });
        await rendering.promise;
        if (!cancelled) setRenderError(false);
      } catch {
        if (!cancelled) setRenderError(true);
      }
    }

    void render();
    return () => {
      cancelled = true;
      rendering?.cancel();
    };
  }, [pdf, page, width, zoom]);

  if (loadError)
    return (
      <p className="attachment-preview-status" role="alert">
        {loadError}
      </p>
    );
  if (!pdf)
    return (
      <p className="attachment-preview-status" role="status">
        Carregando PDF…
      </p>
    );

  function changePage(next: number) {
    setPage(next);
    scroller.current?.scrollTo({ top: 0 });
  }

  return (
    <div className="attachment-pdf">
      <div className="attachment-pdf-toolbar">
        <div role="group" aria-label="Páginas do PDF">
          <button
            className="icon-button"
            type="button"
            aria-label="Página anterior"
            disabled={page === 1}
            onClick={() => changePage(page - 1)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span aria-live="polite">
            Página {page} de {pdf.numPages}
          </span>
          <button
            className="icon-button"
            type="button"
            aria-label="Próxima página"
            disabled={page === pdf.numPages}
            onClick={() => changePage(page + 1)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <div role="group" aria-label="Zoom do PDF">
          <button
            className="icon-button"
            type="button"
            aria-label="Diminuir zoom"
            disabled={zoom === 50}
            onClick={() => setZoom(zoom - 25)}
          >
            <Minus size={17} aria-hidden="true" />
          </button>
          <span aria-live="polite">{zoom}%</span>
          <button
            className="icon-button"
            type="button"
            aria-label="Aumentar zoom"
            disabled={zoom === 200}
            onClick={() => setZoom(zoom + 25)}
          >
            <Plus size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="attachment-pdf-scroller"
        ref={scroller}
        role="region"
        aria-label="Conteúdo do PDF"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll the PDF.
        tabIndex={0}
      >
        {renderError && (
          <p className="attachment-preview-status" role="alert">
            Não foi possível exibir esta página. Você pode navegar ou baixar o arquivo.
          </p>
        )}
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Página ${page} de ${pdf.numPages} do PDF`}
          hidden={renderError}
        />
      </div>
    </div>
  );
}
