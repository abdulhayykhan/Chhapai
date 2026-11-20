import React, { useState, useEffect } from "react";
import { PrintJobDto } from "../types";
import { adminApi } from "../lib/api";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Ban,
  Printer,
  DollarSign,
  FileText,
  Clock,
  User,
  Phone,
  Eye,
  History,
  AlertTriangle,
  Download,
} from "lucide-react";

interface Props {
  job: PrintJobDto | null;
  onApprove: (
    jobId: string,
    options?: { finalAmount?: number; markPaid?: boolean },
  ) => void;
  onReject: (job: PrintJobDto) => void;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  onMarkPaid: (jobId: string) => void;
  onManualPrint: (jobId: string) => void;
}

export const JobDetailPane: React.FC<Props> = ({
  job,
  onApprove,
  onReject,
  onCancel,
  onRetry,
  onMarkPaid,
  onManualPrint,
}) => {
  const [activeTab, setActiveTab] = useState<"preview" | "events">("preview");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [overridePrice, setOverridePrice] = useState<string>("");
  const [markPaidOnApprove, setMarkPaidOnApprove] = useState(false);
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // Load PDF when job changes
  useEffect(() => {
    if (!job) {
      setPdfUrl(null);
      return;
    }
    setOverridePrice(String(job.finalAmount));
    let objectUrl: string | null = null;
    let cancelled = false;

    setLoadingPdf(true);
    adminApi
      .getFileBlob(job.id)
      .then((blob) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
        }
      })
      .catch((err) => {
        console.error("Failed to load PDF preview:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingPdf(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [job?.id]);

  if (!job) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 text-center text-slate-400 select-none">
        <Printer className="w-16 h-16 stroke-1 mb-3 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-600">
          Koi Job Muntakhib Nahi Hai
        </h3>
        <p className="text-sm mt-1 max-w-sm">
          Baayein (Left) janib list se kisi print job par click karein ya arrow
          keys istemal karein.
        </p>
      </div>
    );
  }

  const isPending = [
    "PENDING_APPROVAL",
    "CLAIMED",
    "CONVERTED",
    "PRICE_CALCULATED",
  ].includes(job.status);
  const isApproved = job.status === "APPROVED";
  const isPrinting = job.status === "PRINTING";
  const isCompleted = job.status === "COMPLETED";
  const isFailed = job.status === "FAILED";
  const isPaid = job.paymentStatus === "PAID";

  const handleSavePrice = async () => {
    const parsed = parseInt(overridePrice, 10);
    if (isNaN(parsed) || parsed < 0) return;
    setIsSavingPrice(true);
    try {
      if (isPending) {
        onApprove(job.id, { finalAmount: parsed, markPaid: markPaidOnApprove });
      }
    } finally {
      setIsSavingPrice(false);
    }
  };

  const getStatusBadge = () => {
    switch (job.status) {
      case "PENDING_APPROVAL":
        return (
          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">
            Pending (Manzoori Ka Intezar)
          </span>
        );
      case "APPROVED":
        return (
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
            Approved (Manzoor Shuda)
          </span>
        );
      case "PRINTING":
        return (
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
            Printing (Print Ho Raha Hai)
          </span>
        );
      case "COMPLETED":
        return (
          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
            Completed (Mukammal)
          </span>
        );
      case "REJECTED":
        return (
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
            Mustarad (Rejected)
          </span>
        );
      case "FAILED":
        return (
          <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
            Kharabi (Failed)
          </span>
        );
      case "CANCELLED":
        return (
          <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
            Mansookh (Cancelled)
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-bold">
            {job.status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden select-none">
      {/* Top Header Card */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-3xl font-black text-primary bg-primary/10 px-3.5 py-1.5 rounded-xl border border-primary/20 shadow-xs">
              #{job.tokenLabel}
            </span>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">
                  {job.customerName}
                </h2>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 font-medium">
                {job.customerPhone && (
                  <span className="flex items-center gap-1 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {job.customerPhone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Bheja gaya:{" "}
                  {new Date(job.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {job.upload && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {job.upload.originalName} (
                    {(job.upload.sizeBytes / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rejection / Failure Reason Banner if any */}
          {(job.rejectReason || job.failReason) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium max-w-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{job.rejectReason || job.failReason}</span>
            </div>
          )}
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-200/80">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
            <span className="text-slate-400 font-medium block">
              Tadad (Copies)
            </span>
            <span className="text-sm font-bold text-slate-800">
              {job.copies} {job.copies > 1 ? "copies" : "copy"}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
            <span className="text-slate-400 font-medium block">
              Rang (Color)
            </span>
            <span
              className={`text-sm font-bold ${job.colorMode === "COLOR" ? "text-amber-600" : "text-slate-800"}`}
            >
              {job.colorMode === "COLOR"
                ? "Rangeen (Color)"
                : "Siyah/Safaid (B/W)"}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
            <span className="text-slate-400 font-medium block">Sides</span>
            <span className="text-sm font-bold text-slate-800">
              {job.sides === "SINGLE"
                ? "Aik Taraf (Single)"
                : "Dono Taraf (Double)"}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
            <span className="text-slate-400 font-medium block">
              Size & Range
            </span>
            <span className="text-sm font-bold text-slate-800">
              {job.paperSize} ({job.pageRange || "Tamaam Pages"})
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
            <span className="text-slate-400 font-medium block">
              Kul Pages (Total)
            </span>
            <span className="text-sm font-bold text-slate-800">
              {job.printedPages} pages
            </span>
          </div>
        </div>

        {/* Pricing & Actions Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-200/80">
          {/* Price Box */}
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider block">
                  Kul Qeemat
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-slate-500">Rs.</span>
                  <span className="text-2xl font-black text-slate-900">
                    {job.finalAmount}
                  </span>
                </div>
              </div>

              {/* Price Override input (only editable for pending jobs) */}
              {isPending && (
                <div className="pl-3 border-l border-slate-200 flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={overridePrice}
                    onChange={(e) => setOverridePrice(e.target.value)}
                    className="w-20 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-primary"
                    placeholder="New Rs"
                  />
                  <span className="text-[11px] text-slate-400">Override</span>
                </div>
              )}
            </div>

            {/* Payment badge & Mark Paid button */}
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  isPaid
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {isPaid ? "Ada Shuda (Paid)" : "Baqi (Unpaid)"}
              </span>

              {!isPaid && (
                <button
                  onClick={() => onMarkPaid(job.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Paid Mark Karein
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mr-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markPaidOnApprove}
                    onChange={(e) => setMarkPaidOnApprove(e.target.checked)}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  Sath hi Paid karein
                </label>

                {/* Approve Button [A] */}
                <button
                  onClick={() => {
                    const parsed = parseInt(overridePrice, 10);
                    onApprove(job.id, {
                      finalAmount:
                        !isNaN(parsed) && parsed !== job.finalAmount
                          ? parsed
                          : undefined,
                      markPaid: markPaidOnApprove,
                    });
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-success hover:bg-success-hover shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Approve Karein</span>
                  <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                    A
                  </span>
                </button>

                {/* Reject Button [R] */}
                <button
                  onClick={() => onReject(job)}
                  className="px-4 py-2.5 rounded-xl font-bold text-danger border-2 border-danger hover:bg-danger hover:text-white transition-all flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  <span>Mustarad</span>
                  <span className="border border-current text-[10px] px-1.5 py-0.5 rounded font-mono">
                    R
                  </span>
                </button>
              </>
            )}

            {isApproved && (
              <>
                <button
                  onClick={() => onManualPrint(job.id)}
                  className="px-4 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover shadow-md transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Now</span>
                </button>
                <button
                  onClick={() => onCancel(job.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            )}

            {isFailed && (
              <button
                onClick={() => onRetry(job.id)}
                className="px-4 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover shadow-md transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Dobara Koshish (Retry)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Bar: Preview vs Timeline */}
      <div className="flex border-b border-slate-200 px-5 bg-white text-xs font-semibold">
        <button
          onClick={() => setActiveTab("preview")}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "preview"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Document Preview</span>
        </button>

        <button
          onClick={() => setActiveTab("events")}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "events"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Timeline & Tareekh</span>
        </button>

        {pdfUrl && (
          <a
            href={pdfUrl}
            download={`Chhapai-${job.tokenLabel}.pdf`}
            className="ml-auto py-2 px-3 text-slate-500 hover:text-primary flex items-center gap-1 font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>
        )}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-hidden bg-slate-100 p-4">
        {activeTab === "preview" ? (
          <div className="w-full h-full bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col items-center justify-center">
            {loadingPdf ? (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">
                  Document load ho raha hai...
                </span>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={`${pdfUrl}#toolbar=1`}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="text-center text-slate-400 p-8">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">
                  Preview dastiyaab nahi hai
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-white rounded-xl shadow-xs border border-slate-200 p-6 overflow-y-auto">
            <h4 className="text-sm font-bold text-slate-800 mb-4">
              Job Ki Mukammal Tareekh (Audit Timeline)
            </h4>
            {!job.events || job.events.length === 0 ? (
              <p className="text-sm text-slate-400">
                Koi events record nahi huay.
              </p>
            ) : (
              <ol className="relative border-l border-slate-200 ml-3 space-y-6">
                {job.events.map((ev) => (
                  <li key={ev.id} className="ml-6">
                    <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full ring-4 ring-white">
                      <Clock className="w-3 h-3 text-primary" />
                    </span>
                    <div className="flex items-baseline justify-between">
                      <h5 className="text-sm font-bold text-slate-800">
                        {ev.type}
                      </h5>
                      <time className="text-xs text-slate-400 font-mono">
                        {new Date(ev.createdAt).toLocaleString()}
                      </time>
                    </div>
                    {ev.fromStatus && ev.toStatus && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        <span className="font-mono">{ev.fromStatus}</span> ➔{" "}
                        <span className="font-mono font-bold">
                          {ev.toStatus}
                        </span>
                      </p>
                    )}
                    {ev.message && (
                      <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                        {ev.message}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
