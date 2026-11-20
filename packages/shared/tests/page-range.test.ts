import { describe, it, expect } from "vitest";
import { parsePageRange, InvalidPageRangeError } from "../src/page-range.js";
import { ErrorCode } from "../src/enums.js";

describe("parsePageRange", () => {
  it("returns all pages when input is empty or null", () => {
    expect(parsePageRange(null, 5)).toEqual({
      pages: [1, 2, 3, 4, 5],
      pagesPerCopy: 5,
    });
    expect(parsePageRange("", 3)).toEqual({
      pages: [1, 2, 3],
      pagesPerCopy: 3,
    });
    expect(parsePageRange("   ", 4)).toEqual({
      pages: [1, 2, 3, 4],
      pagesPerCopy: 4,
    });
  });

  it("parses valid single page numbers", () => {
    expect(parsePageRange("1", 5)).toEqual({
      pages: [1],
      pagesPerCopy: 1,
    });
    expect(parsePageRange("3", 10)).toEqual({
      pages: [3],
      pagesPerCopy: 1,
    });
  });

  it("parses valid single range", () => {
    expect(parsePageRange("1-4", 10)).toEqual({
      pages: [1, 2, 3, 4],
      pagesPerCopy: 4,
    });
  });

  it("parses mixed commas and ranges (e.g. 1-3,5,8-10)", () => {
    expect(parsePageRange("1-3,5,8-10", 10)).toEqual({
      pages: [1, 2, 3, 5, 8, 9, 10],
      pagesPerCopy: 7,
    });
  });

  it("handles spaces gracefully around commas and hyphens", () => {
    expect(parsePageRange(" 1 - 2 , 4 , 6 - 7 ", 10)).toEqual({
      pages: [1, 2, 4, 6, 7],
      pagesPerCopy: 5,
    });
  });

  it("throws INVALID_PAGE_RANGE on non-ascending pages", () => {
    expect(() => parsePageRange("5,3", 10)).toThrow(InvalidPageRangeError);
    try {
      parsePageRange("5,3", 10);
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.INVALID_PAGE_RANGE);
    }
  });

  it("throws INVALID_PAGE_RANGE on overlapping ranges", () => {
    expect(() => parsePageRange("1-4,3-6", 10)).toThrow(InvalidPageRangeError);
    expect(() => parsePageRange("1-3,3-5", 10)).toThrow(InvalidPageRangeError);
  });

  it("throws INVALID_PAGE_RANGE when range exceeds total pages", () => {
    expect(() => parsePageRange("1-11", 10)).toThrow(InvalidPageRangeError);
    expect(() => parsePageRange("11", 10)).toThrow(InvalidPageRangeError);
  });

  it("throws INVALID_PAGE_RANGE on zero or negative numbers", () => {
    expect(() => parsePageRange("0-3", 10)).toThrow(InvalidPageRangeError);
    expect(() => parsePageRange("-1,2", 10)).toThrow(InvalidPageRangeError);
  });

  it("throws INVALID_PAGE_RANGE on start >= end", () => {
    expect(() => parsePageRange("3-3", 10)).toThrow(InvalidPageRangeError);
    expect(() => parsePageRange("5-2", 10)).toThrow(InvalidPageRangeError);
  });

  it("throws INVALID_PAGE_RANGE on malformed strings", () => {
    expect(() => parsePageRange("abc", 10)).toThrow(InvalidPageRangeError);
    expect(() => parsePageRange("1--3", 10)).toThrow(InvalidPageRangeError);
    expect(() => parsePageRange("1,", 10)).toThrow(InvalidPageRangeError);
    expect(() => parsePageRange(",1", 10)).toThrow(InvalidPageRangeError);
  });
});
