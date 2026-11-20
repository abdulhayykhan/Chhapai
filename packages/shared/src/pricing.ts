import { ColorMode, Sides } from "./enums.js";
import { parsePageRange } from "./page-range.js";

export interface ShopRates {
  rateBwSingle: number;
  rateBwDouble: number;
  rateColorSingle: number;
  rateColorDouble: number;
}

export interface QuoteInput {
  totalPages: number;
  copies: number;
  colorMode: ColorMode;
  sides: Sides;
  pageRange?: string | null;
  rates: ShopRates;
}

export interface QuoteResult {
  pagesPerCopy: number;
  printedPages: number;
  unitRate: number;
  calculatedAmount: number;
}

/**
 * Returns the unit rate (PKR per content page) based on color mode and sides.
 */
export function getUnitRate(
  rates: ShopRates,
  colorMode: ColorMode,
  sides: Sides,
): number {
  if (colorMode === ColorMode.BW) {
    return sides === Sides.SINGLE ? rates.rateBwSingle : rates.rateBwDouble;
  }
  return sides === Sides.SINGLE ? rates.rateColorSingle : rates.rateColorDouble;
}

/**
 * Calculates a print job quote according to Section 8 of the PRD:
 * - Copies: integer 1 to 100
 * - printedPages = pagesPerCopy * copies
 * - calculatedAmount = ceil(printedPages * unitRate) in whole PKR using integer paisa maths:
 *   Math.ceil(printedPages * Math.round(unitRate * 100) / 100)
 */
export function calcQuote(input: QuoteInput): QuoteResult {
  const { totalPages, copies, colorMode, sides, pageRange, rates } = input;

  if (!Number.isInteger(copies) || copies < 1 || copies > 100) {
    throw new Error("Copies must be an integer between 1 and 100");
  }

  const { pagesPerCopy } = parsePageRange(pageRange, totalPages);
  const printedPages = pagesPerCopy * copies;
  const unitRate = getUnitRate(rates, colorMode, sides);

  // Integer paisa math specified in PRD Section 8:
  const paisaRate = Math.round(unitRate * 100);
  const calculatedAmount = Math.ceil((printedPages * paisaRate) / 100);

  return {
    pagesPerCopy,
    printedPages,
    unitRate,
    calculatedAmount,
  };
}
