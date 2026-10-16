import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocument, GlobalWorkerOptions, Util } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { RenderTask } from "pdfjs-dist";
import type { ReviewWorkspace } from "@ecus/api-client";
import { locatePdfQuote } from "./pdf-quote";

type OCRPage = NonNullable<
  NonNullable<ReviewWorkspace["workspace"]["documents"]>[number]["ocr_pages"]
>[string];

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreview({
  url,
  pageNumber,
  quote,
  ocrPage,
  sourceOffset,
}: {
  url: string;
  pageNumber: number;
  quote: string;
  ocrPage?: OCRPage;
  sourceOffset?: number;
}) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [matches, setMatches] = useState(0);
  const [ambiguous, setAmbiguous] = useState(false);
  useEffect(() => {
    let disposed = false;
    let render: RenderTask | undefined;
    const task = getDocument({ url });
    task.onPassword = () => {
      setStatus("error");
      void task.destroy();
    };
    const target = canvas.current;
    void (async () => {
      const document = await task.promise;
      if (disposed || !target) return;
      const page = await document.getPage(pageNumber);
      if (disposed) return;
      const viewport = page.getViewport({ scale: 1.5 });
      target.width = viewport.width;
      target.height = viewport.height;
      const context = target.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      render = page.render({ canvas: target, canvasContext: context, viewport });
      await render.promise;
      const text = await page.getTextContent();
      if (disposed) return;
      let count = 0;
      let repeated = false;
      if (quote && ocrPage && sourceOffset !== undefined) {
        const end = sourceOffset + Array.from(quote).length;
        for (const word of ocrPage.words) {
          if (word.offset >= end || word.offset + Array.from(word.text).length <= sourceOffset)
            continue;
          const [left = 0, top = 0, right = 0, bottom = 0] = word.box;
          const [x1, y1, x2, y2] =
            ocrPage.rotation === 90
              ? [top, 1 - right, bottom, 1 - left]
              : ocrPage.rotation === 180
                ? [1 - right, 1 - bottom, 1 - left, 1 - top]
                : ocrPage.rotation === 270
                  ? [1 - bottom, left, 1 - top, right]
                  : [left, top, right, bottom];
          context.fillStyle = "rgba(255, 193, 7, 0.35)";
          context.fillRect(
            x1! * viewport.width,
            y1! * viewport.height,
            (x2! - x1!) * viewport.width,
            (y2! - y1!) * viewport.height,
          );
          count += 1;
        }
      } else if (quote) {
        const located = locatePdfQuote(
          text.items.filter((item) => "str" in item),
          quote,
        );
        repeated = located.occurrences > 1;
        for (const item of located.items) {
          const transform = Util.transform(viewport.transform, item.transform);
          const height = Math.hypot(transform[2], transform[3]);
          context.fillStyle = "rgba(255, 193, 7, 0.35)";
          context.fillRect(
            transform[4],
            transform[5] - height,
            item.width * viewport.scale,
            height * 1.2,
          );
        }
        count = located.occurrences;
      }
      setMatches(count);
      setAmbiguous(repeated);
      setStatus("ready");
    })().catch(() => {
      if (!disposed) setStatus("error");
    });
    return () => {
      disposed = true;
      render?.cancel();
      void task.destroy();
    };
  }, [url, pageNumber, quote, ocrPage, sourceOffset]);
  return (
    <div
      className="review-pdf"
      aria-busy={status === "loading"}
      data-render-status={status}
      data-highlight-count={status === "ready" ? matches : undefined}
      data-highlight-ambiguous={status === "ready" ? ambiguous : undefined}
    >
      {status === "loading" && <p role="status">{t("workbench.reading")}</p>}
      {status === "error" && <p role="alert">{t("workbench.pdfError")}</p>}
      <canvas ref={canvas} aria-label={t("workbench.originalView")} />
      {status === "ready" && quote && (
        <p className="review-hint">
          {ambiguous
            ? t("workbench.ambiguousTextMatch", { count: matches })
            : matches
              ? `${t("workbench.matches")}: ${matches}`
              : t("workbench.noTextMatch")}
        </p>
      )}
    </div>
  );
}
