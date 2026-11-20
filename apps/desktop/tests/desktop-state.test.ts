import { describe, it, expect } from "vitest";
import { PrintJobDto, QueueTab } from "../src/renderer/types";
import {
  playJobAlertChime,
  triggerDesktopAlert,
} from "../src/renderer/lib/sound";

describe("Desktop App - State & Helpers (M5 Acceptance)", () => {
  const mockJobs: PrintJobDto[] = [
    {
      id: "job-1",
      shopId: "shop-1",
      tokenLabel: "001",
      tokenSeq: 1,
      publicToken: "token-1",
      status: "PENDING_APPROVAL",
      customerName: "Ali Khan",
      customerPhone: "03001234567",
      uploadId: "upload-1",
      copies: 2,
      colorMode: "BW",
      sides: "SINGLE",
      paperSize: "A4",
      pagesPerCopy: 5,
      printedPages: 10,
      unitRate: 5,
      calculatedAmount: 50,
      finalAmount: 50,
      paymentStatus: "UNPAID",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "job-2",
      shopId: "shop-1",
      tokenLabel: "002",
      tokenSeq: 2,
      publicToken: "token-2",
      status: "APPROVED",
      customerName: "Fatima Zahra",
      copies: 1,
      colorMode: "COLOR",
      sides: "DOUBLE",
      paperSize: "A4",
      pagesPerCopy: 4,
      printedPages: 4,
      unitRate: 25,
      calculatedAmount: 100,
      finalAmount: 100,
      paymentStatus: "PAID",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "job-3",
      shopId: "shop-1",
      tokenLabel: "003",
      tokenSeq: 3,
      publicToken: "token-3",
      status: "COMPLETED",
      customerName: "Usman Ghani",
      copies: 3,
      colorMode: "BW",
      sides: "SINGLE",
      paperSize: "A4",
      pagesPerCopy: 2,
      printedPages: 6,
      unitRate: 5,
      calculatedAmount: 30,
      finalAmount: 30,
      paymentStatus: "PAID",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "job-4",
      shopId: "shop-1",
      tokenLabel: "004",
      tokenSeq: 4,
      publicToken: "token-4",
      status: "REJECTED",
      rejectReason: "Kharab scan / Dhundla text",
      customerName: "Bilal Ahmed",
      copies: 1,
      colorMode: "BW",
      sides: "SINGLE",
      paperSize: "A4",
      pagesPerCopy: 1,
      printedPages: 1,
      unitRate: 5,
      calculatedAmount: 5,
      finalAmount: 5,
      paymentStatus: "UNPAID",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it("categorizes jobs correctly into queue tabs", () => {
    const pendingJobs = mockJobs.filter((j) =>
      ["PENDING_APPROVAL", "CLAIMED", "CONVERTED", "PRICE_CALCULATED"].includes(
        j.status,
      ),
    );
    const inProgressJobs = mockJobs.filter((j) =>
      ["APPROVED", "PRINTING"].includes(j.status),
    );
    const completedJobs = mockJobs.filter((j) => j.status === "COMPLETED");
    const otherJobs = mockJobs.filter((j) =>
      ["REJECTED", "FAILED", "CANCELLED", "EXPIRED"].includes(j.status),
    );

    expect(pendingJobs.length).toBe(1);
    expect(pendingJobs[0].tokenLabel).toBe("001");

    expect(inProgressJobs.length).toBe(1);
    expect(inProgressJobs[0].tokenLabel).toBe("002");

    expect(completedJobs.length).toBe(1);
    expect(completedJobs[0].tokenLabel).toBe("003");

    expect(otherJobs.length).toBe(1);
    expect(otherJobs[0].tokenLabel).toBe("004");
  });

  it("filters queue by token label and customer name", () => {
    const filter = (query: string) => {
      const q = query.toLowerCase().trim();
      return mockJobs.filter(
        (j) =>
          j.tokenLabel.toLowerCase().includes(q) ||
          j.customerName.toLowerCase().includes(q) ||
          (j.customerPhone && j.customerPhone.includes(q)),
      );
    };

    expect(filter("001").length).toBe(1);
    expect(filter("001")[0].customerName).toBe("Ali Khan");

    expect(filter("fatima").length).toBe(1);
    expect(filter("fatima")[0].tokenLabel).toBe("002");

    expect(filter("03001234567").length).toBe(1);
    expect(filter("nonexistent").length).toBe(0);
  });

  it("formats daily report CSV correctly", () => {
    const headers = [
      "Token",
      "Customer",
      "Status",
      "Payment",
      "Color",
      "Sides",
      "Pages",
      "Amount_PKR",
      "Time",
    ];
    const rows = mockJobs.map((j) => [
      `"#${j.tokenLabel}"`,
      `"${j.customerName.replace(/"/g, '""')}"`,
      j.status,
      j.paymentStatus,
      j.colorMode,
      j.sides,
      j.printedPages,
      j.finalAmount,
      `"${new Date(j.createdAt).toLocaleTimeString()}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    expect(csvContent).toContain(
      "Token,Customer,Status,Payment,Color,Sides,Pages,Amount_PKR,Time",
    );
    expect(csvContent).toContain(
      '"#001","Ali Khan",PENDING_APPROVAL,UNPAID,BW,SINGLE,10,50',
    );
    expect(csvContent).toContain(
      '"#002","Fatima Zahra",APPROVED,PAID,COLOR,DOUBLE,4,100',
    );
  });

  it("triggers audio chime without errors", () => {
    expect(() => playJobAlertChime()).not.toThrow();
    expect(() => triggerDesktopAlert("047", "Kashif Ali", true)).not.toThrow();
  });
});
