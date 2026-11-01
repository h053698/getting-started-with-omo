import { expect, test } from "bun:test";
import { detectLang, padEnd } from "./i18n.ts";

test("detectLang picks Korean only for a Korean locale, with LC_ALL first", () => {
  expect(detectLang({ LANG: "ko_KR.UTF-8" })).toBe("ko");
  expect(detectLang({ LANG: "en_US.UTF-8" })).toBe("en");
  expect(detectLang({})).toBe("en");
  expect(detectLang({ LC_ALL: "en_US.UTF-8", LANG: "ko_KR.UTF-8" })).toBe("en");
});

test("padEnd pads by display width so Korean text lines up", () => {
  expect(padEnd("한국어", 8)).toBe("한국어  ");
  expect(padEnd("Pro", 5)).toBe("Pro  ");
  expect(padEnd("Enterprise", 4)).toBe("Enterprise");
});
