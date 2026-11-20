import { JobStatus, ErrorCode } from "./enums.js";

export class InvalidStateTransitionError extends Error {
  public readonly code = ErrorCode.INVALID_STATE_TRANSITION;
  constructor(from: JobStatus, to: JobStatus) {
    super(`Invalid state transition from ${from} to ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export const VALID_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  [JobStatus.PENDING_APPROVAL]: [
    JobStatus.APPROVED,
    JobStatus.REJECTED,
    JobStatus.CANCELLED,
    JobStatus.EXPIRED,
  ],
  [JobStatus.APPROVED]: [JobStatus.PRINTING, JobStatus.CANCELLED],
  [JobStatus.PRINTING]: [JobStatus.COMPLETED, JobStatus.FAILED],
  [JobStatus.FAILED]: [JobStatus.APPROVED, JobStatus.CANCELLED],
  [JobStatus.COMPLETED]: [],
  [JobStatus.REJECTED]: [],
  [JobStatus.CANCELLED]: [],
  [JobStatus.EXPIRED]: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}
