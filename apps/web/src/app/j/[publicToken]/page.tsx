"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Printer,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Banknote,
  RotateCcw,
  Store,
  ChevronLeft,
} from "lucide-react";
import { fetchJobStatus, cancelPrintJob, JobStatusInfo } from "@/lib/api";
import { JobStatus } from "@chhapai/shared";

export default function TokenStatusPage() {
  const params = useParams();
  const router = useRouter();
  const publicToken = params.publicToken as string;

  const [job, setJob] = useState<JobStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Poll every 3 seconds per PRD Section 3.1 Step 7
  useEffect(() => {
    let isMounted = true;

    async function poll() {
      try {
        const data = await fetchJobStatus(publicToken);
        if (isMounted) {
          setJob(data);
          setError(null);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Status load karne mein masla aaya");
          setLoading(false);
        }
      }
    }

    poll();
    const interval = setInterval(poll, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [publicToken]);

  const handleCancel = async () => {
    const confirmed = window.confirm(
      "Kya aap waqayi apna print order cancel karna chahte hain?",
    );
    if (!confirmed) return;

    try {
      setCancelling(true);
      setCancelError(null);
      await cancelPrintJob(publicToken);
      // Immediately refresh status
      const updated = await fetchJobStatus(publicToken);
      setJob(updated);
    } catch (err: any) {
      setCancelError(err.message || "Order cancel nahi ho saka");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-700" />
        <p className="font-medium">Order status check ho raha hai...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-6 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Order nahi mila
        </h2>
        <p className="text-slate-600 text-sm mb-6">
          {error || "Yeh link durust nahi hai ya expire ho chuka hai."}
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl"
        >
          Naya Order Karein
        </button>
      </div>
    );
  }

  const isPending = job.status === JobStatus.PENDING_APPROVAL;
  const isApproved = job.status === JobStatus.APPROVED;
  const isPrinting = job.status === JobStatus.PRINTING;
  const isCompleted = job.status === JobStatus.COMPLETED;
  const isRejected = job.status === JobStatus.REJECTED;
  const isFailed = job.status === JobStatus.FAILED;
  const isCancelled = job.status === JobStatus.CANCELLED;

  return (
    <div className="flex flex-col flex-1 p-5 pb-12 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2 text-slate-600 text-xs font-semibold">
          <Store className="w-4 h-4 text-slate-400" />
          <span>{job.shopName}</span>
        </div>
        <span className="text-xs text-slate-400">Chhapai Live</span>
      </header>

      {/* Hero Token Card */}
      <div className="bg-gradient-to-b from-blue-700 to-blue-800 text-white rounded-3xl p-6 text-center shadow-md space-y-4">
        <p className="text-xs font-semibold tracking-wider uppercase text-blue-200">
          Aapka Token Number
        </p>

        <div className="py-2">
          <span className="text-6xl font-black tracking-tight tracking-wide drop-shadow-sm">
            {job.tokenLabel}
          </span>
        </div>

        <div className="inline-flex items-center space-x-2 bg-blue-900/60 rounded-full px-4 py-1.5 text-xs font-medium text-blue-100">
          <Banknote className="w-3.5 h-3.5 text-amber-300" />
          <span>Kul Raqam: Rs. {job.total} (Cash at counter)</span>
        </div>
      </div>

      {/* Live Status Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Current Status
          </span>
          <span className="flex items-center text-[11px] text-slate-400 space-x-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping inline-block" />
            <span>Live updates</span>
          </span>
        </div>

        {/* Dynamic Status Presentation */}
        {isPending && (
          <div className="flex items-start space-x-3.5 bg-amber-50 border border-amber-200/80 rounded-xl p-4 text-amber-900">
            <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-bold text-sm">Approval Ka Intezar Hai</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Shop operator aapki file check kar raha hai. Approval ke baad
                foran print start ho jaye ga.
              </p>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="flex items-start space-x-3.5 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900">
            <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Job Approve Ho Gaya Hai</p>
              <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                Operator ne order approve kar diya hai. Printer queue mein lag
                chuka hai.
              </p>
            </div>
          </div>
        )}

        {isPrinting && (
          <div className="flex items-start space-x-3.5 bg-blue-50 border border-blue-300 rounded-xl p-4 text-blue-900">
            <Printer className="w-6 h-6 text-blue-700 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <p className="font-bold text-sm">Print Ho Raha Hai...</p>
              <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                Aapke documents printer se nikal rahe hain.
              </p>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="flex items-start space-x-3.5 bg-green-50 border border-green-200 rounded-xl p-4 text-green-900">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Print Tayyar Hai!</p>
              <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                Apna token number <strong>{job.tokenLabel}</strong> counter par
                dikhayein, cash ada karein aur print collect karein.
              </p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="flex items-start space-x-3.5 bg-red-50 border border-red-200 rounded-xl p-4 text-red-900">
            <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Job Reject Ho Gaya</p>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                {job.rejectReason ||
                  "File mein issue ki wajah se order cancel kar diya gaya."}
              </p>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="flex items-start space-x-3.5 bg-red-50 border border-red-200 rounded-xl p-4 text-red-900">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Printing Mein Masla Aaya</p>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                Printer mein technical masla aaya hai. Counter par staff se
                rabta karein.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="flex items-start space-x-3.5 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700">
            <XCircle className="w-6 h-6 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Job Cancel Ho Gaya</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Yeh print order cancel kar diya gaya hai.
              </p>
            </div>
          </div>
        )}

        {/* Step Indicator Visual */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className={isPending ? "text-amber-600 font-extrabold" : ""}>
              1. Pending
            </span>
            <span>&rarr;</span>
            <span className={isApproved ? "text-blue-600 font-extrabold" : ""}>
              2. Approved
            </span>
            <span>&rarr;</span>
            <span className={isPrinting ? "text-blue-700 font-extrabold" : ""}>
              3. Printing
            </span>
            <span>&rarr;</span>
            <span
              className={isCompleted ? "text-green-600 font-extrabold" : ""}
            >
              4. Ready
            </span>
          </div>
        </div>
      </div>

      {/* Payment Instructions Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
        <p className="font-bold text-slate-800">
          Counter Par Payment Ki Hidayat:
        </p>
        <p>
          Print collect karte waqt counter par apna Token{" "}
          <strong>{job.tokenLabel}</strong> batayein aur{" "}
          <strong>Rs. {job.total}</strong> cash ada karein.
        </p>
      </div>

      {/* Cancel Order Action (Only while Pending per PRD Section 3.1 Step 6) */}
      {isPending && (
        <div className="pt-2 text-center space-y-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline px-4 py-2 transition"
          >
            {cancelling ? "Cancel ho raha hai..." : "Order Cancel Karein"}
          </button>
          {cancelError && <p className="text-xs text-red-600">{cancelError}</p>}
        </div>
      )}

      {/* Back to Shop / New Order */}
      <div className="pt-4 text-center">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 py-2 px-3 rounded-lg hover:bg-slate-100 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Naya Print Order Karein</span>
        </button>
      </div>
    </div>
  );
}
