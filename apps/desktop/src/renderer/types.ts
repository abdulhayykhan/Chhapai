import {
  JobStatus,
  PaymentStatus,
  ColorMode,
  Sides,
  PaperSize,
} from "@chhapai/shared";

export interface Shop {
  id: string;
  slug: string;
  name: string;
  nameUrdu?: string;
  phone?: string;
  address?: string;
  isOpen: boolean;
  autoPrint: boolean;
  bwPrinter?: string;
  colorPrinter?: string;
  rateBwSingle: number | string;
  rateBwDouble: number | string;
  rateColorSingle: number | string;
  rateColorDouble: number | string;
  maxFileMb: number;
  maxPages: number;
  retentionMinutes: number;
  pendingExpiryHours: number;
}

export interface AdminUser {
  id: string;
  shopId: string;
  email: string;
  name: string;
  role: string;
}

export interface JobEventDto {
  id: string;
  jobId: string;
  type: string;
  fromStatus?: JobStatus | null;
  toStatus?: JobStatus | null;
  actorUserId?: string | null;
  message?: string | null;
  createdAt: string;
}

export interface UploadDto {
  id: string;
  originalName: string;
  originalMime: string;
  sizeBytes: number;
  pageCount: number;
}

export interface PrintJobDto {
  id: string;
  shopId: string;
  tokenLabel: string;
  tokenSeq: number;
  publicToken: string;
  status: JobStatus;
  customerName: string;
  customerPhone?: string | null;
  uploadId: string;
  upload?: UploadDto;
  copies: number;
  colorMode: ColorMode;
  sides: Sides;
  paperSize: PaperSize;
  pageRange?: string | null;
  pagesPerCopy: number;
  printedPages: number;
  unitRate: number | string;
  calculatedAmount: number;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  paidAt?: string | null;
  rejectReason?: string | null;
  failReason?: string | null;
  approvedAt?: string | null;
  printStartedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: JobEventDto[];
}

export type QueueTab = "pending" | "in_progress" | "completed" | "other";

export interface DailyReportDto {
  date: string;
  totalJobs: number;
  completedJobs: number;
  rejectedJobs: number;
  failedJobs: number;
  totalRevenuePaisa: number;
  totalRevenuePkr: number;
  paidRevenuePkr: number;
  unpaidRevenuePkr: number;
  totalPrintedPages: number;
  bwPages: number;
  colorPages: number;
  jobs: Array<{
    id: string;
    tokenLabel: string;
    customerName: string;
    status: JobStatus;
    paymentStatus: PaymentStatus;
    finalAmount: number;
    colorMode: ColorMode;
    sides: Sides;
    printedPages: number;
    createdAt: string;
  }>;
}
