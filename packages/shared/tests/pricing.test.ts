import { describe, it, expect } from "vitest";
import { calcQuote, getUnitRate, ShopRates } from "../src/pricing.js";
import { ColorMode, Sides } from "../src/enums.js";

const mockRates: ShopRates = {
  rateBwSingle: 5,
  rateBwDouble: 4,
  rateColorSingle: 30,
  rateColorDouble: 25,
};

describe("pricing & calcQuote", () => {
  it("correctly selects unit rate based on mode and sides", () => {
    expect(getUnitRate(mockRates, ColorMode.BW, Sides.SINGLE)).toBe(5);
    expect(getUnitRate(mockRates, ColorMode.BW, Sides.DOUBLE)).toBe(4);
    expect(getUnitRate(mockRates, ColorMode.COLOR, Sides.SINGLE)).toBe(30);
    expect(getUnitRate(mockRates, ColorMode.COLOR, Sides.DOUBLE)).toBe(25);
  });

  it("calculates PRD example: 10 pages, 2 copies, B/W single at 5 PKR gives 100 PKR", () => {
    const result = calcQuote({
      totalPages: 10,
      copies: 2,
      colorMode: ColorMode.BW,
      sides: Sides.SINGLE,
      rates: mockRates,
    });

    expect(result.pagesPerCopy).toBe(10);
    expect(result.printedPages).toBe(20);
    expect(result.unitRate).toBe(5);
    expect(result.calculatedAmount).toBe(100);
  });

  it("calculates B/W double sided correctly", () => {
    const result = calcQuote({
      totalPages: 10,
      copies: 2,
      colorMode: ColorMode.BW,
      sides: Sides.DOUBLE,
      rates: mockRates,
    });

    expect(result.pagesPerCopy).toBe(10);
    expect(result.printedPages).toBe(20);
    expect(result.unitRate).toBe(4);
    expect(result.calculatedAmount).toBe(80);
  });

  it("applies page range to calculation", () => {
    const result = calcQuote({
      totalPages: 10,
      copies: 2,
      colorMode: ColorMode.BW,
      sides: Sides.SINGLE,
      pageRange: "1-3,5",
      rates: mockRates,
    });

    // 4 pages per copy * 2 copies = 8 printed pages
    expect(result.pagesPerCopy).toBe(4);
    expect(result.printedPages).toBe(8);
    expect(result.calculatedAmount).toBe(40);
  });

  it("handles fractional rates with integer paisa ceiling", () => {
    const fractionalRates: ShopRates = {
      rateBwSingle: 3.5,
      rateBwDouble: 2.75,
      rateColorSingle: 25,
      rateColorDouble: 20,
    };

    // 3 pages * 3.5 = 10.5 => ceil is 11 PKR
    const result = calcQuote({
      totalPages: 3,
      copies: 1,
      colorMode: ColorMode.BW,
      sides: Sides.SINGLE,
      rates: fractionalRates,
    });

    expect(result.calculatedAmount).toBe(11);
  });

  it("rejects copies outside 1 to 100 range", () => {
    expect(() =>
      calcQuote({
        totalPages: 5,
        copies: 0,
        colorMode: ColorMode.BW,
        sides: Sides.SINGLE,
        rates: mockRates,
      }),
    ).toThrow();

    expect(() =>
      calcQuote({
        totalPages: 5,
        copies: 101,
        colorMode: ColorMode.BW,
        sides: Sides.SINGLE,
        rates: mockRates,
      }),
    ).toThrow();
  });
});
