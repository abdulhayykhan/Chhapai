import React, { useState } from "react";
import { PrintJobDto } from "../types";
import { X, AlertTriangle } from "lucide-react";

interface Props {
  job: PrintJobDto | null;
  onClose: () => void;
  onConfirm: (jobId: string, reason: string) => void;
}

const QUICK_REASONS = [
  "Kharab scan / Dhundla text parha nahi ja raha",
  "File corrupt ya kharab hai",
  "Font samajh nahi aa raha / formatting kharab hai",
  "Shop band ho rahi hai",
  "Ink ya kaghaz khatam ho gaya hai",
];

export const RejectModal: React.FC<Props> = ({ job, onClose, onConfirm }) => {
  const [selectedReason, setSelectedReason] = useState<string>(
    QUICK_REASONS[0],
  );
  const [customReason, setCustomReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customReason.trim()
      ? customReason.trim()
      : selectedReason;
    if (!finalReason) return;
    setIsSubmitting(true);
    onConfirm(job.id, finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-slate-900">
              Job Mustarad Karein (Reject)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <p className="text-sm text-slate-600 font-medium mb-1">
              Job{" "}
              <strong className="text-primary font-mono font-bold">
                #{job.tokenLabel}
              </strong>{" "}
              ({job.customerName}) ko reject karne ki wajah muntakhib karein:
            </p>
            <p className="text-xs text-slate-400">
              Yeh wajah customer ko unki tracking screen par nazar aayegi.
            </p>
          </div>

          {/* Quick Reasons Radio */}
          <div className="space-y-2">
            {QUICK_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedReason === reason && !customReason.trim()
                    ? "bg-red-50/60 border-danger text-red-950 font-semibold"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="reject_reason"
                  checked={selectedReason === reason && !customReason.trim()}
                  onChange={() => {
                    setSelectedReason(reason);
                    setCustomReason("");
                  }}
                  className="mt-0.5 text-danger focus:ring-danger"
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>

          {/* Custom Reason Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ya koi doosri wajah likhein (Ikhtiyari):
            </label>
            <textarea
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Wajah yahan tehreer karein..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-danger transition-colors resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-danger hover:bg-danger-hover shadow-sm transition-all"
            >
              {isSubmitting ? "Mustarad ho raha hai..." : "Mustarad Karein"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
