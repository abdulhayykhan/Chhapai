import { describe, it, expect, vi } from "vitest";
import { TokenService } from "../src/token/token.service.js";

describe("TokenService", () => {
  it("formats token numbers with leading zeroes (#001, #047, #100)", () => {
    const tokenService = new TokenService(null as any);
    expect(tokenService.formatTokenLabel(1)).toBe("#001");
    expect(tokenService.formatTokenLabel(9)).toBe("#009");
    expect(tokenService.formatTokenLabel(47)).toBe("#047");
    expect(tokenService.formatTokenLabel(100)).toBe("#100");
    expect(tokenService.formatTokenLabel(999)).toBe("#999");
    expect(tokenService.formatTokenLabel(1000)).toBe("#1000");
  });

  it("increments sequence per shop per day", async () => {
    const mockPrisma = {
      printJob: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ tokenSeq: 1 }),
      },
    };

    const tokenService = new TokenService(mockPrisma as any);

    const token1 = await tokenService.getNextToken("shop-1");
    expect(token1.tokenSeq).toBe(1);
    expect(token1.tokenLabel).toBe("#001");

    const token2 = await tokenService.getNextToken("shop-1");
    expect(token2.tokenSeq).toBe(2);
    expect(token2.tokenLabel).toBe("#002");
  });
});
