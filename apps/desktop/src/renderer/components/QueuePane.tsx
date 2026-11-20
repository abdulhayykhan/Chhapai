import React, { useState, useMemo } from "react";
import { PrintJobDto, QueueTab } from "../types";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  XCircle,
  Printer,
} from "lucide-react";

interface Props {
  jobs: PrintJobDto[];
  activeJobId: string | null;
  onSelectJob: (job: PrintJobDto) => void;
  activeTab: QueueTab;
  onTabChange: (tab: QueueTab) => void;
}

export const QueuePane: React.FC<Props> = ({
  jobs,
  activeJobId,
  onSelectJob,
  activeTab,
  onTabChange,
}) => {
  const [search, setSearch] = useState("");

  // Group counts
  const counts = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let other = 0;

    for (const j of jobs) {
      if (
        [
          "PENDING_APPROVAL",
          "CLAIMED",
          "CONVERTED",
          "PRICE_CALCULATED",
        ].includes(j.status)
      ) {
        pending++;
      } else if (["APPROVED", "PRINTING"].includes(j.status)) {
        inProgress++;
      } else if (j.status === "COMPLETED") {
        completed++;
      } else {
        other++;
      }
    }

    return { pending, inProgress, completed, other };
  }, [jobs]);

  // Filtered list
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      // Tab filter
      let matchesTab = false;
      if (activeTab === "pending") {
        matchesTab = [
          "PENDING_APPROVAL",
          "CLAIMED",
          "CONVERTED",
          "PRICE_CALCULATED",
        ].includes(j.status);
      } else if (activeTab === "in_progress") {
        matchesTab = ["APPROVED", "PRINTING"].includes(j.status);
      } else if (activeTab === "completed") {
        matchesTab = j.status === "COMPLETED";
      } else {
        matchesTab = ["REJECTED", "FAILED", "CANCELLED", "EXPIRED"].includes(
          j.status,
        );
      }

      if (!matchesTab) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesToken = j.tokenLabel.toLowerCase().includes(q);
        const matchesName = j.customerName.toLowerCase().includes(q);
        const matchesPhone = j.customerPhone
          ? j.customerPhone.includes(q)
          : false;
        return matchesToken || matchesName || matchesPhone;
      }

      return true;
    });
  }, [jobs, activeTab, search]);

  return (
    <div className="w-80 md:w-96 flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col h-full select-none">
      {/* Search Bar */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Token ya Naam se dhoondein..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-transparent rounded-lg text-sm text-slate-900 focus:bg-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 bg-white px-2 pt-1 gap-1 text-xs font-semibold">
        <button
          onClick={() => onTabChange("pending")}
          className={`flex-1 py-2 px-1 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "pending"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Pending</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
              counts.pending > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {counts.pending}
          </span>
        </button>

        <button
          onClick={() => onTabChange("in_progress")}
          className={`flex-1 py-2 px-1 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "in_progress"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Jari</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
              counts.inProgress > 0
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {counts.inProgress}
          </span>
        </button>

        <button
          onClick={() => onTabChange("completed")}
          className={`flex-1 py-2 px-1 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "completed"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Mukammal</span>
          <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => onTabChange("other")}
          className={`flex-1 py-2 px-1 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "other"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Deegar</span>
          <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
            {counts.other}
          </span>
        </button>
      </div>

      {/* Jobs Cards List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Koi job moojood nahi hai</p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isSelected = job.id === activeJobId;
            const isPaid = job.paymentStatus === "PAID";
            const isBw = job.colorMode === "BW";

            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? "bg-blue-50/70 border-primary shadow-sm ring-1 ring-primary/30"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                {/* Header row: Token + Price */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                      #{job.tokenLabel}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(job.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">
                      Rs. {job.finalAmount}
                    </span>
                  </div>
                </div>

                {/* Customer name */}
                <p className="text-sm font-semibold text-slate-800 truncate mb-2">
                  {job.customerName}
                </p>

                {/* Settings badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      isBw
                        ? "bg-slate-100 text-slate-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isBw ? "Siyah/Safaid" : "Rangeen"}
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                    {job.sides === "SINGLE" ? "1-Side" : "2-Side"}
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                    {job.copies} {job.copies > 1 ? "copies" : "copy"} (
                    {job.printedPages} pages)
                  </span>

                  <span
                    className={`ml-auto px-1.5 py-0.5 rounded font-bold ${
                      isPaid
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {isPaid ? "Ada Shuda" : "Baqi"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
