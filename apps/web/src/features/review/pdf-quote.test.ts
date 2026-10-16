import { describe, expect, it } from "vitest";
import { locatePdfQuote, type PdfTextItem } from "./pdf-quote";

const run = (str: string, x: number, y = 100): PdfTextItem => ({
  str,
  transform: [6, 0, 0, 6, x, y],
  width: str.length * 3,
  height: 6,
  hasEOL: false,
});

describe("PDF evidence location", () => {
  it("locates a printed number split across adjacent glyph runs", () => {
    const items = [run("42", 10), run("3", 16), run("40", 19)];
    expect(locatePdfQuote(items, "42340")).toEqual({ occurrences: 1, items });
  });

  it("does not concatenate values from separate cells or lines", () => {
    expect(locatePdfQuote([run("42", 10), run("340", 100)], "42340").occurrences).toBe(0);
    expect(locatePdfQuote([run("42", 10), run("340", 16, 110)], "42340").occurrences).toBe(0);
  });

  it("returns every candidate rather than assigning a unique repeated-value location", () => {
    const items = [run("42240", 10), run("42240", 10, 110)];
    expect(locatePdfQuote(items, "42240")).toEqual({
      occurrences: 2,
      items,
    });
  });

  it("counts repeated matches within one glyph run without painting it twice", () => {
    const items = [run("42240 / 42240", 10)];
    expect(locatePdfQuote(items, "42240")).toEqual({ occurrences: 2, items });
  });
});
