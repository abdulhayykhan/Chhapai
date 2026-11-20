import { describe, it, expect } from "vitest";
import {
  quoteRequestSchema,
  createJobSchema,
  authLoginSchema,
  rejectJobSchema,
} from "../src/schemas.js";
import { ColorMode, PaperSize, Sides } from "../src/enums.js";

describe("Zod schemas", () => {
  it("validates a valid quote request", () => {
    const validData = {
      uploadId: "123e4567-e89b-12d3-a456-426614174000",
      copies: 3,
      colorMode: ColorMode.BW,
      sides: Sides.SINGLE,
      paperSize: PaperSize.A4,
      pageRange: "1-3,5",
    };

    const parsed = quoteRequestSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid quote request (e.g. copies > 100 or bad uuid)", () => {
    const badCopies = {
      uploadId: "123e4567-e89b-12d3-a456-426614174000",
      copies: 101,
      colorMode: ColorMode.BW,
      sides: Sides.SINGLE,
    };
    expect(quoteRequestSchema.safeParse(badCopies).success).toBe(false);

    const badUuid = {
      uploadId: "not-a-uuid",
      copies: 1,
      colorMode: ColorMode.BW,
      sides: Sides.SINGLE,
    };
    expect(quoteRequestSchema.safeParse(badUuid).success).toBe(false);
  });

  it("validates createJobSchema with customer name", () => {
    const validJob = {
      uploadId: "123e4567-e89b-12d3-a456-426614174000",
      customerName: "Ali Khan",
      customerPhone: "03001234567",
      copies: 1,
      colorMode: ColorMode.COLOR,
      sides: Sides.DOUBLE,
      paperSize: PaperSize.A4,
    };
    expect(createJobSchema.safeParse(validJob).success).toBe(true);

    const missingName = {
      ...validJob,
      customerName: "",
    };
    expect(createJobSchema.safeParse(missingName).success).toBe(false);
  });

  it("validates reject reason is required", () => {
    expect(
      rejectJobSchema.safeParse({ reason: "File unreadable" }).success,
    ).toBe(true);
    expect(rejectJobSchema.safeParse({ reason: "" }).success).toBe(false);
  });

  it("validates login password minimum 10 characters", () => {
    expect(
      authLoginSchema.safeParse({
        email: "test@example.com",
        password: "short",
      }).success,
    ).toBe(false);
    expect(
      authLoginSchema.safeParse({
        email: "test@example.com",
        password: "securePassword123",
      }).success,
    ).toBe(true);
  });
});
