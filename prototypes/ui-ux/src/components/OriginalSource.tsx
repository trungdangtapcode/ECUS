import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, Util } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { copy } from '../lib/copy';

GlobalWorkerOptions.workerSrc = workerUrl;

export function OriginalSource({ file, initialPage }: { file: File; initialPage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(false);
  const [reading, setReading] = useState(true);
  const [positions, setPositions] = useState<string[]>([]);
  useEffect(() => {
    let disposed = false;
    const task = file.arrayBuffer().then((data) => {
      const loading = getDocument({ data });
      loading.onPassword = () => {
        setError(true);
        void loading.destroy();
      };
      return loading;
    });
    void task
      .then(async (loading) => {
        const document = await loading.promise;
        if (disposed) return;
        setPdf(document);
        setPageNumber(Math.min(initialPage, document.numPages));
        setError(false);
      })
      .catch(() => {
        if (!disposed) {
          setError(true);
          setReading(false);
        }
      });
    return () => {
      disposed = true;
      void task.then((loading) => loading.destroy()).catch(() => {});
    };
  }, [file, initialPage]);

  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let disposed = false;
    let task: RenderTask | undefined;
    setReading(true);
    setPositions([]);
    const target = canvas.current;
    void (async () => {
      const page = await pdf.getPage(pageNumber);
      if (disposed) return;
      const viewport = page.getViewport({ scale: 1.4 });
      target.width = viewport.width;
      target.height = viewport.height;
      const context = target.getContext('2d');
      if (!context) return;
      task = page.render({ canvas: target, canvasContext: context, viewport });
      await task.promise;
      const content = await page.getTextContent();
      if (disposed) return;
      const found: string[] = [];
      if (search.trim()) {
        for (const item of content.items) {
          if (
            !('str' in item) ||
            !item.str.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
          )
            continue;
          const transform = Util.transform(viewport.transform, item.transform);
          const height = Math.hypot(transform[2], transform[3]);
          context.fillStyle = 'rgba(255, 193, 7, 0.35)';
          context.fillRect(
            transform[4],
            transform[5] - height,
            item.width * viewport.scale,
            height * 1.2,
          );
          found.push(
            `${item.str} · x=${Math.round(item.transform[4])}, y=${Math.round(item.transform[5])}`,
          );
        }
      }
      setPositions(found);
      setReading(false);
      setError(false);
    })().catch((failure: unknown) => {
      if (
        !disposed &&
        !(failure instanceof Error && failure.name === 'RenderingCancelledException')
      ) {
        setError(true);
        setReading(false);
      }
    });
    return () => {
      disposed = true;
      task?.cancel();
    };
  }, [pdf, pageNumber, search]);

  return (
    <div className="original-source">
      <div className="original-source-controls">
        <label>
          {copy.page}
          <input
            type="number"
            min={1}
            max={pdf?.numPages ?? initialPage}
            value={pageNumber}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (pdf && Number.isInteger(value) && value >= 1 && value <= pdf.numPages)
                setPageNumber(value);
            }}
          />
        </label>
        <span>/ {pdf?.numPages ?? '—'}</span>
        <label>
          {copy.searchSource}
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>
      {reading && <p role="status">{copy.reading}</p>}
      {error && <p role="alert">{copy.pdfError}</p>}
      <canvas ref={canvas} aria-label={copy.originalView} />
      <div className="original-source-position">
        <strong>
          {copy.originalSelected}: {file.name} · {copy.page} {pageNumber}
        </strong>
        {search && !reading && (
          <p>{positions.length ? `${copy.matches}: ${positions.length}` : copy.noTextMatch}</p>
        )}
        {positions.map((position, index) => (
          <p key={index}>{position}</p>
        ))}
      </div>
    </div>
  );
}
