export type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL: boolean;
};

// PDF generators can split one printed value across adjacent glyph runs.
// Join only touching runs on the same baseline; never join across table cells.
export function locatePdfQuote(items: PdfTextItem[], quote: string) {
  const groups: PdfTextItem[][] = [];
  for (const item of items) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    const [a = 0, b = 0, , , x = 0, y = 0] = item.transform;
    const size = Math.hypot(a, b);
    let adjacent = false;
    if (previous && previous.str && item.str && !previous.hasEOL && size > 0) {
      const [pa = 0, pb = 0, , , px = 0, py = 0] = previous.transform;
      const previousSize = Math.hypot(pa, pb);
      const dx = x - px;
      const dy = y - py;
      const gap = (dx * a + dy * b) / size - previous.width;
      const baselineDistance = Math.abs((-dx * b + dy * a) / size);
      adjacent =
        previousSize > 0 &&
        Math.abs(a / size - pa / previousSize) < 0.01 &&
        Math.abs(b / size - pb / previousSize) < 0.01 &&
        baselineDistance <= size * 0.2 &&
        Math.abs(gap) <= size * 0.25;
    }
    if (adjacent) group!.push(item);
    else groups.push([item]);
  }
  let occurrences = 0;
  const matchingItems: PdfTextItem[] = [];
  if (quote) {
    for (const group of groups) {
      const text = group.map((item) => item.str).join("");
      let start = text.indexOf(quote);
      while (start >= 0) {
        occurrences += 1;
        let offset = 0;
        const matched = group.filter((item) => {
          const end = offset + item.str.length;
          const overlaps = end > start && offset < start + quote.length;
          offset = end;
          return overlaps;
        });
        for (const item of matched) {
          if (!matchingItems.includes(item)) matchingItems.push(item);
        }
        start = text.indexOf(quote, start + quote.length);
      }
    }
  }
  // Backend character offsets are not PDF.js glyph offsets. Show every matching
  // location for repeated quotes and keep that ambiguity explicit in the viewer.
  return { occurrences, items: matchingItems };
}
