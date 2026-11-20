import React, { useState, useEffect } from "react";
import { DailyReportDto } from "../types";
import { adminApi } from "../lib/api";
import {
  X,
  Calendar,
  Download,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

export const DailyReportModal: React.FC<Props> = ({ onClose }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [report, setReport] = useState<DailyReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadReport(selectedDate);
  }, [selectedDate]);

  const loadReport = async (date: string) => {
    setIsLoading(true);
    try {
      const data = await adminApi.getDailyReport(date);
      setReport(data);
    } catch (err: any) {
      console.error("Failed to load report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!report || !report.jobs) return;

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
    const rows = report.jobs.map((j) => [
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
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Chhapai-Daily-Report-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-slate-900 text-base">
              Rozana Ki Report (Daily Report)
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Date selector */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary shadow-2xs"
            />

            {/* Export CSV button */}
            <button
              onClick={handleExportCsv}
              disabled={!report || report.totalJobs === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4" />
              <span>CSV Export</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500">
              <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">
                Report tayyar ho rahi hai...
              </p>
            </div>
          ) : report ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                  <span className="text-xs text-blue-700 font-semibold uppercase tracking-wider block">
                    Kul Jobs
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-blue-950">
                      {report.totalJobs}
                    </span>
                    <span className="text-xs text-blue-600 font-medium">
                      {report.completedJobs} mukammal
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                  <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider block">
                    Kul Kamai (Revenue)
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xs font-bold text-emerald-600">
                      Rs.
                    </span>
                    <span className="text-2xl font-black text-emerald-950">
                      {report.totalRevenuePkr}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Rs. {report.paidRevenuePkr} received • Rs.{" "}
                    {report.unpaidRevenuePkr} baqi
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider block">
                    Kul Chhapay Pages
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900">
                      {report.totalPrintedPages}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      pages
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {report.bwPages} B/W • {report.colorPages} Color
                  </p>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100">
                  <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider block">
                    Mustarad / Fail
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-amber-950">
                      {report.rejectedJobs + report.failedJobs}
                    </span>
                    <span className="text-xs text-amber-600 font-medium">
                      ({report.rejectedJobs} rej / {report.failedJobs} fail)
                    </span>
                  </div>
                </div>
              </div>

              {/* Jobs Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Rozana Ki Jobs Ki List ({report.jobs?.length || 0})
                </h4>

                {!report.jobs || report.jobs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">
                      Is tareekh ko koi jobs record nahi huin.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 font-mono">Token</th>
                          <th className="py-2.5 px-3">Gahak (Customer)</th>
                          <th className="py-2.5 px-3">Pages / Format</th>
                          <th className="py-2.5 px-3">Qeemat (PKR)</th>
                          <th className="py-2.5 px-3">Payment</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Waqt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {report.jobs.map((j) => (
                          <tr
                            key={j.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-primary">
                              #{j.tokenLabel}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {j.customerName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {j.printedPages} pgs • {j.colorMode} ({j.sides})
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              Rs. {j.finalAmount}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  j.paymentStatus === "PAID"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {j.paymentStatus === "PAID"
                                  ? "Ada Shuda"
                                  : "Baqi"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  j.status === "COMPLETED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : j.status === "REJECTED"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {j.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono">
                              {new Date(j.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
