import { ErrorCode } from "./enums.js";

export class InvalidPageRangeError extends Error {
  public readonly code = ErrorCode.INVALID_PAGE_RANGE;
  constructor(message = "Invalid page range") {
    super(message);
    this.name = "InvalidPageRangeError";
  }
}

export interface ParsedPageRange {
  pages: number[];
  pagesPerCopy: number;
}

/**
 * Parses a page range string according to Section 8 of the PRD:
 * - Empty / null / undefined means all pages.
 * - Otherwise comma-separated pages or ranges (e.g. "1-3,5,8-10").
 * - Must be 1-based, strictly ascending, no overlaps, within totalPages.
 * - Any violation throws InvalidPageRangeError.
 */
export function parsePageRange(
  input: string | null | undefined,
  totalPages: number,
): ParsedPageRange {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new InvalidPageRangeError("Total pages must be a positive integer");
  }

  if (!input || input.trim() === "") {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return {
      pages,
      pagesPerCopy: totalPages,
    };
  }

  const trimmed = input.trim();
  const parts = trimmed.split(",");
  const selectedPages: number[] = [];
  let lastPage = 0;

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) {
      throw new InvalidPageRangeError("Empty range segment");
    }

    if (part.includes("-")) {
      const rangeParts = part.split("-");
      if (rangeParts.length !== 2) {
        throw new InvalidPageRangeError(`Malformed range: ${part}`);
      }

      const start = Number(rangeParts[0].trim());
      const end = Number(rangeParts[1].trim());

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end < 1
      ) {
        throw new InvalidPageRangeError(
          `Range values must be positive integers: ${part}`,
        );
      }

      if (start >= end) {
        throw new InvalidPageRangeError(
          `Range start must be strictly less than end: ${part}`,
        );
      }

      if (end > totalPages) {
        throw new InvalidPageRangeError(
          `Range end ${end} exceeds total pages ${totalPages}`,
        );
      }

      if (start <= lastPage) {
        throw new InvalidPageRangeError(
          `Page segments must be strictly ascending and non-overlapping: ${part}`,
        );
      }

      for (let p = start; p <= end; p++) {
        selectedPages.push(p);
      }
      lastPage = end;
    } else {
      const page = Number(part);
      if (!Number.isInteger(page) || page < 1) {
        throw new InvalidPageRangeError(`Invalid page number: ${part}`);
      }

      if (page > totalPages) {
        throw new InvalidPageRangeError(
          `Page ${page} exceeds total pages ${totalPages}`,
        );
      }

      if (page <= lastPage) {
        throw new InvalidPageRangeError(
          `Pages must be strictly ascending and non-overlapping: ${part}`,
        );
      }

      selectedPages.push(page);
      lastPage = page;
    }
  }

  return {
    pages: selectedPages,
    pagesPerCopy: selectedPages.length,
  };
}
