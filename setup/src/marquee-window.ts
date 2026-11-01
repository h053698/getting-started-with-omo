const CELL_MS = 125;
const PAUSE_MS = 1250;
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** A single-line, plain-text viewport measured in terminal display cells. */
export function createMarqueeWindow(text: string, width: number) {
  const columns = Number.isFinite(width) ? Math.max(1, Math.floor(width)) : 1;
  let cells = 0;
  const glyphs = Array.from(segmenter.segment(text), ({ segment }) => {
    const start = cells;
    cells += Bun.stringWidth(segment);
    return { text: segment, start, end: cells };
  });
  const overflow = Math.max(0, cells - columns);
  const travel = overflow * CELL_MS;
  const cycle = 2 * (PAUSE_MS + travel);

  return {
    width: columns,
    overflow,
    at(time: number): { readonly offset: number; readonly text: string } {
      if (overflow === 0) return { offset: 0, text };
      const phase = Math.max(0, time) % cycle;
      const offset =
        phase < PAUSE_MS
          ? 0
          : phase < PAUSE_MS + travel
            ? Math.floor((phase - PAUSE_MS) / CELL_MS)
            : phase < 2 * PAUSE_MS + travel
              ? overflow
              : overflow - Math.floor((phase - 2 * PAUSE_MS - travel) / CELL_MS);
      const right = offset + columns;
      let visible = "";
      for (const glyph of glyphs) {
        if (glyph.end <= offset) continue;
        if (glyph.start >= right) break;
        // A partial wide grapheme occupies blank cells, never a broken glyph.
        visible +=
          glyph.start < offset || glyph.end > right
            ? " ".repeat(Math.min(glyph.end, right) - Math.max(glyph.start, offset))
            : glyph.text;
      }
      return { offset, text: visible };
    },
  };
}
