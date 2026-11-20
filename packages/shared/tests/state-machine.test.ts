import { describe, it, expect } from "vitest";
import {
  canTransition,
  validateTransition,
  InvalidStateTransitionError,
} from "../src/state-machine.js";
import { JobStatus, ErrorCode } from "../src/enums.js";

describe("Job State Machine transitions (PRD Section 3.3)", () => {
  it("allows valid transitions from PENDING_APPROVAL", () => {
    expect(canTransition(JobStatus.PENDING_APPROVAL, JobStatus.APPROVED)).toBe(
      true,
    );
    expect(canTransition(JobStatus.PENDING_APPROVAL, JobStatus.REJECTED)).toBe(
      true,
    );
    expect(canTransition(JobStatus.PENDING_APPROVAL, JobStatus.CANCELLED)).toBe(
      true,
    );
    expect(canTransition(JobStatus.PENDING_APPROVAL, JobStatus.EXPIRED)).toBe(
      true,
    );
  });

  it("allows valid transitions from APPROVED", () => {
    expect(canTransition(JobStatus.APPROVED, JobStatus.PRINTING)).toBe(true);
    expect(canTransition(JobStatus.APPROVED, JobStatus.CANCELLED)).toBe(true);
  });

  it("allows valid transitions from PRINTING", () => {
    expect(canTransition(JobStatus.PRINTING, JobStatus.COMPLETED)).toBe(true);
    expect(canTransition(JobStatus.PRINTING, JobStatus.FAILED)).toBe(true);
  });

  it("allows valid transitions from FAILED", () => {
    expect(canTransition(JobStatus.FAILED, JobStatus.APPROVED)).toBe(true);
    expect(canTransition(JobStatus.FAILED, JobStatus.CANCELLED)).toBe(true);
  });

  it("blocks invalid transitions", () => {
    // Cannot skip directly from PENDING_APPROVAL to PRINTING or COMPLETED
    expect(canTransition(JobStatus.PENDING_APPROVAL, JobStatus.PRINTING)).toBe(
      false,
    );
    expect(canTransition(JobStatus.PENDING_APPROVAL, JobStatus.COMPLETED)).toBe(
      false,
    );

    // Cannot jump from APPROVED directly to COMPLETED without PRINTING
    expect(canTransition(JobStatus.APPROVED, JobStatus.COMPLETED)).toBe(false);

    // Terminal states cannot transition anywhere
    expect(canTransition(JobStatus.COMPLETED, JobStatus.PRINTING)).toBe(false);
    expect(canTransition(JobStatus.REJECTED, JobStatus.APPROVED)).toBe(false);
    expect(canTransition(JobStatus.EXPIRED, JobStatus.APPROVED)).toBe(false);
    expect(canTransition(JobStatus.CANCELLED, JobStatus.APPROVED)).toBe(false);
  });

  it("throws InvalidStateTransitionError with code 409 / INVALID_STATE_TRANSITION", () => {
    expect(() =>
      validateTransition(JobStatus.PENDING_APPROVAL, JobStatus.COMPLETED),
    ).toThrow(InvalidStateTransitionError);

    try {
      validateTransition(JobStatus.PENDING_APPROVAL, JobStatus.COMPLETED);
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
    }
  });
});
