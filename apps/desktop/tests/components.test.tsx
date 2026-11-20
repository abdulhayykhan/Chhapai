import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../src/renderer/components/Header";
import { OfflineBanner } from "../src/renderer/components/OfflineBanner";
import { RejectModal } from "../src/renderer/components/RejectModal";
import { Shop, PrintJobDto } from "../src/renderer/types";

describe("Desktop UI Components (M5 Acceptance)", () => {
  const mockShop: Shop = {
    id: "shop-1",
    slug: "default",
    name: "Chhapai Alpha Print",
    isOpen: true,
    autoPrint: true,
    rateBwSingle: 5,
    rateBwDouble: 4,
    rateColorSingle: 30,
    rateColorDouble: 25,
    maxFileMb: 25,
    maxPages: 200,
    retentionMinutes: 60,
    pendingExpiryHours: 24,
  };

  const mockJob: PrintJobDto = {
    id: "job-101",
    shopId: "shop-1",
    tokenLabel: "101",
    tokenSeq: 101,
    publicToken: "nanoid-101",
    status: "PENDING_APPROVAL",
    customerName: "Zubair Shah",
    uploadId: "upload-101",
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
  };

  it("renders Header with shop details, online state, and auto-print", () => {
    render(
      <Header
        shop={mockShop}
        isConnected={true}
        soundEnabled={true}
        onToggleSound={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenReport={vi.fn()}
        onOpenQr={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    expect(screen.getByText(/Chhapai Alpha Print/i)).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText(/Auto-Print: ON/i)).toBeInTheDocument();
    expect(screen.getByText("Daily Report")).toBeInTheDocument();
    expect(screen.getByText("QR Poster")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders OfflineBanner with reconnect button", () => {
    const handleReconnect = vi.fn();
    render(<OfflineBanner onReconnect={handleReconnect} />);

    expect(screen.getByText(/Rabta Munqata:/i)).toBeInTheDocument();
    const reconnectBtn = screen.getByText("Dobara Jorein");
    expect(reconnectBtn).toBeInTheDocument();

    fireEvent.click(reconnectBtn);
    expect(handleReconnect).toHaveBeenCalledTimes(1);
  });

  it("renders RejectModal with quick-pick reasons and submits selected reason", () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <RejectModal
        job={mockJob}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    expect(screen.getByText(/Job Mustarad Karein/i)).toBeInTheDocument();
    expect(screen.getByText(/#101/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Kharab scan \/ Dhundla text/i),
    ).toBeInTheDocument();

    const submitBtn = screen.getByText("Mustarad Karein");
    fireEvent.click(submitBtn);

    expect(handleConfirm).toHaveBeenCalledWith(
      "job-101",
      expect.stringContaining("Kharab scan"),
    );
  });

  it("allows custom rejection reason in RejectModal", () => {
    const handleConfirm = vi.fn();

    render(
      <RejectModal job={mockJob} onClose={vi.fn()} onConfirm={handleConfirm} />,
    );

    const textarea = screen.getByPlaceholderText(/Wajah yahan tehreer karein/i);
    fireEvent.change(textarea, {
      target: { value: "File ka format support nahi karta" },
    });

    const submitBtn = screen.getByText("Mustarad Karein");
    fireEvent.click(submitBtn);

    expect(handleConfirm).toHaveBeenCalledWith(
      "job-101",
      "File ka format support nahi karta",
    );
  });
});
