import { expect, test } from "bun:test";
import { renderToString } from "ink";
import { createElement } from "react";
import { MarqueeText } from "./marquee.tsx";
import { createMarqueeWindow } from "./marquee-window.ts";

test.each([
  [0, 0, "abcd"],
  [1249, 0, "abcd"],
  [1250, 0, "abcd"],
  [1374, 0, "abcd"],
  [1375, 1, "bcde"],
  [1625, 3, "defg"],
  [1750, 4, "efgh"],
  [2999, 4, "efgh"],
  [3000, 4, "efgh"],
  [3125, 3, "defg"],
  [3375, 1, "bcde"],
  [3500, 0, "abcd"],
  [4749, 0, "abcd"],
  [4875, 1, "bcde"],
  [8375, 1, "bcde"],
] as const)("pauses, scrolls and reverses at elapsed %i ms", (time, offset, text) => {
  const window = createMarqueeWindow("abcdefgh", 4);

  const actual = window.at(time);

  expect(actual).toEqual({ offset, text });
});

test.each(([
  ["A가B", 2, 0, 0, "A "],
  ["A가B", 2, 1375, 1, "가"],
  ["A가B", 2, 1500, 2, " B"],
  ["A👩‍💻B", 2, 0, 0, "A "],
  ["A👩‍💻B", 2, 1375, 1, "👩‍💻"],
  ["A👩‍💻B", 2, 1500, 2, " B"],
  ["A🇰🇷B", 2, 1375, 1, "🇰🇷"],
  ["A👍🏽B", 2, 1375, 1, "👍🏽"],
  ["Ae\u0301BC", 2, 1375, 1, "e\u0301B"],
  ["가나다ABC", 4, 1375, 1, " 나 "],
  ["가나다ABC", 4, 1875, 5, " ABC"],
  ["가나다ABC", 4, 3250, 4, "다AB"],
  ["가A", 1, 0, 0, " "],
  ["가A", 1, 1375, 1, " "],
  ["가A", 1, 1500, 2, "A"],
  ["👩‍💻A", 1, 0, 0, " "],
  ["👩‍💻A", 1, 1500, 2, "A"],
] as const).map(([text, width, time, offset, visible]) => ({ text, width, time, offset, visible })))(
  "keeps graphemes intact for $text in $width cells at $time ms",
  ({ text, width, time, offset, visible }) => {
    const window = createMarqueeWindow(text, width);

    const actual = window.at(time);

    expect(actual).toEqual({ offset, text: visible });
    expect(Bun.stringWidth(actual.text)).toBeLessThanOrEqual(width);
  },
);

test.each([
  ["", 1],
  ["abc", 4],
  ["abcd", 4],
  ["한글", 4],
  ["👩‍💻", 2],
  ["e\u0301", 1],
] as const)("keeps fitting text %s stationary in %i cells", (text, width) => {
  const window = createMarqueeWindow(text, width);

  const frames = [0, 1375, 3000, 1_000_000].map((time) => window.at(time));

  expect(window.overflow).toBe(0);
  expect(frames).toEqual(Array.from({ length: 4 }, () => ({ offset: 0, text })));
});

test.each([0, -3, 0.9, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
  "bounds width %s to one usable display cell",
  (width) => {
    const window = createMarqueeWindow("AB", width);

    const final = window.at(1375);

    expect(window.width).toBe(1);
    expect(final).toEqual({ offset: 1, text: "B" });
  },
);

test("floors a fractional viewport width to whole display cells", () => {
  const window = createMarqueeWindow("ABCD", 2.9);

  const final = window.at(1500);

  expect(window.width).toBe(2);
  expect(final).toEqual({ offset: 2, text: "CD" });
});

test.each(([
  ["가나다ABC", 4, false, "가나"],
  ["A👩‍💻B", 2, false, "A"],
  ["한글", 4, true, "한글"],
  ["https://example.test/path", 80, true, "https://example.test/path"],
] as const).map(([text, width, active, expected]) => ({ text, width, active, expected })))(
  "renders the actual Ink viewport for $text at width $width",
  ({ text, width, active, expected }) => {
    const element = createElement(MarqueeText, { text, width, active });

    const output = renderToString(element, { columns: width });

    expect(output).toBe(expected);
  },
);
