import { z } from "zod";
import {
  ColorMode,
  PaperSize,
  Sides,
  JobStatus,
  PaymentStatus,
  UserRole,
} from "./enums.js";

export const quoteRequestSchema = z.object({
  uploadId: z.string().uuid(),
  copies: z.number().int().min(1).max(100),
  colorMode: z.nativeEnum(ColorMode),
  sides: z.nativeEnum(Sides),
  paperSize: z.nativeEnum(PaperSize).default(PaperSize.A4),
  pageRange: z.string().trim().optional().nullable(),
});

export type QuoteRequestDto = z.infer<typeof quoteRequestSchema>;

export const createJobSchema = z.object({
  uploadId: z.string().uuid(),
  customerName: z.string().trim().min(1, "Name zaroori hai").max(100),
  customerPhone: z.string().trim().max(20).optional().nullable(),
  copies: z.number().int().min(1).max(100),
  colorMode: z.nativeEnum(ColorMode),
  sides: z.nativeEnum(Sides),
  paperSize: z.nativeEnum(PaperSize).default(PaperSize.A4),
  pageRange: z.string().trim().optional().nullable(),
});

export type CreateJobDto = z.infer<typeof createJobSchema>;

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(10, "Password kam az kam 10 characters ka hona chahiye"),
});

export type AuthLoginDto = z.infer<typeof authLoginSchema>;

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(10, "Naya password kam az kam 10 characters ka hona chahiye"),
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const approveJobSchema = z.object({
  finalAmount: z.number().int().min(0).optional(),
  markPaid: z.boolean().optional(),
});

export type ApproveJobDto = z.infer<typeof approveJobSchema>;

export const rejectJobSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Reject ki wajah likhna zaroori hai")
    .max(255),
});

export type RejectJobDto = z.infer<typeof rejectJobSchema>;

export const failJobSchema = z.object({
  reason: z.string().trim().min(1).max(255),
});

export type FailJobDto = z.infer<typeof failJobSchema>;

export const updateSettingsSchema = z.object({
  name: z.string().trim().min(1).optional(),
  nameUrdu: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  isOpen: z.boolean().optional(),
  autoPrint: z.boolean().optional(),
  bwPrinter: z.string().trim().optional().nullable(),
  colorPrinter: z.string().trim().optional().nullable(),
  rateBwSingle: z.number().min(0).optional(),
  rateBwDouble: z.number().min(0).optional(),
  rateColorSingle: z.number().min(0).optional(),
  rateColorDouble: z.number().min(0).optional(),
  maxFileMb: z.number().int().min(1).max(100).optional(),
  maxPages: z.number().int().min(1).max(1000).optional(),
  retentionMinutes: z.number().int().min(5).max(1440).optional(),
  pendingExpiryHours: z.number().int().min(1).max(168).optional(),
});

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
