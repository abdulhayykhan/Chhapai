"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Printer,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  Palette,
  Copy,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import {
  fetchShop,
  uploadDocument,
  fetchQuote,
  submitPrintJob,
  ShopInfo,
  UploadResult,
  QuoteResult,
} from "@/lib/api";
import { ColorMode, PaperSize, Sides } from "@chhapai/shared";

export default function ShopOrderPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = (params.shopSlug as string) || "main-branch";

  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);

  // Active saved token in localStorage
  const [activeToken, setActiveToken] = useState<{
    tokenLabel: string;
    publicToken: string;
  } | null>(null);

  // Step 1: Upload state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 & 3: Settings state
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<ColorMode>(ColorMode.BW);
  const [sides, setSides] = useState<Sides>(Sides.SINGLE);
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.A4);
  const [pageRange, setPageRange] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  // Quote state
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load shop details and check active token
  useEffect(() => {
    async function load() {
      try {
        setLoadingShop(true);
        const data = await fetchShop(shopSlug);
        setShop(data);
      } catch (err: any) {
        setShopError(err.message || "Dukan ki maloomat nahi mil saki");
      } finally {
        setLoadingShop(false);
      }
    }

    load();

    // Check localStorage for active job
    try {
      const saved = localStorage.getItem(`chhapai_job_${shopSlug}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.publicToken) {
          setActiveToken(parsed);
        }
      }
    } catch {}
  }, [shopSlug]);

  // Debounced quote calculation (300 ms debounce per PRD Section 4 C4)
  useEffect(() => {
    if (!uploadResult) return;

    setQuoteLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = await fetchQuote({
          uploadId: uploadResult.uploadId,
          copies,
          colorMode,
          sides,
          paperSize,
          pageRange: pageRange.trim() || undefined,
        });
        setQuote(q);
      } catch (err: any) {
        // If range is invalid, keep previous quote or show inline error
      } finally {
        setQuoteLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [uploadResult, copies, colorMode, sides, paperSize, pageRange]);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadResult(null);
    setQuote(null);

    // Client pre-check
    if (shop) {
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > shop.maxFileMb) {
        setUploadError(
          `File ka size bohot bara hai (${sizeMb.toFixed(1)} MB). Limit: ${shop.maxFileMb} MB.`,
        );
        return;
      }
    }

    try {
      setUploadProgress(0);
      setUploadStatusText("File upload ho rahi hai...");

      const result = await uploadDocument(shopSlug, file, (percent) => {
        setUploadProgress(percent);
        if (percent >= 100) {
          setUploadStatusText(
            "Document convert aur pages count ho rahe hain...",
          );
        }
      });

      setUploadResult(result);
      setUploadProgress(null);
      setUploadStatusText("");
    } catch (err: any) {
      setUploadError(err.message || "File upload mein masla aaya");
      setUploadProgress(null);
      setUploadStatusText("");
    }
  };

  // Handle Submit Job
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadResult) return;

    if (!customerName.trim()) {
      setSubmitError("Aapka naam likhna zaroori hai");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const job = await submitPrintJob({
        uploadId: uploadResult.uploadId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        copies,
        colorMode,
        sides,
        paperSize,
        pageRange: pageRange.trim() || undefined,
      });

      // Save to localStorage for zero-friction recovery
      try {
        localStorage.setItem(
          `chhapai_job_${shopSlug}`,
          JSON.stringify({
            publicToken: job.publicToken,
            tokenLabel: job.tokenLabel,
            createdAt: new Date().toISOString(),
          }),
        );
      } catch {}

      // Navigate to public token screen
      router.push(`/j/${job.publicToken}`);
    } catch (err: any) {
      setSubmitError(err.message || "Job submit karne mein masla aaya");
      setSubmitting(false);
    }
  };

  if (loadingShop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-700" />
        <p className="font-medium">Dukan ki maloomat load ho rahi hai...</p>
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Dukan nahi mili
        </h2>
        <p className="text-slate-600 text-sm mb-6">
          {shopError || "Slug ghalat hai ya dukan register nahi hai."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl"
        >
          Dobara Koshish Karein
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 pb-32">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">
              {shop.name}
            </h1>
            <p className="text-xs text-slate-500">Chhapai Self-Service Print</p>
          </div>
        </div>

        {/* Shop Open / Closed Badge */}
        <div>
          {shop.isOpen ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
              Khula Hai
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              Band Hai
            </span>
          )}
        </div>
      </header>

      {/* Active Token Recovery Banner */}
      {activeToken && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center justify-between text-xs text-amber-900">
          <div>
            Aapka pichla order{" "}
            <strong className="font-bold">{activeToken.tokenLabel}</strong> jari
            hai.
          </div>
          <button
            onClick={() => router.push(`/j/${activeToken.publicToken}`)}
            className="font-bold underline text-amber-800 ml-2"
          >
            Status Dekhein
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="p-5 space-y-6">
        {/* Closed Notice */}
        {!shop.isOpen ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800 space-y-2">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h2 className="font-bold text-base">Dukan Filhal Band Hai</h2>
            <p className="text-sm text-red-700">
              Is waqt prints qabool nahi kiye ja rahe. Dukan khulne par dobara
              tashreef layein.
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: Upload Box */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Step 1
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Max {shop.maxFileMb} MB · {shop.maxPages} pages
                </span>
              </div>

              {!uploadResult ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[170px] ${
                    uploadProgress !== null
                      ? "border-blue-300 bg-blue-50/50"
                      : "border-slate-300 hover:border-blue-500 hover:bg-slate-50/80 bg-white"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={uploadProgress !== null}
                  />

                  {uploadProgress !== null ? (
                    <div className="w-full max-w-xs space-y-3">
                      <Loader2 className="w-8 h-8 text-blue-700 animate-spin mx-auto" />
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {uploadStatusText}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm mb-1">
                        File select karein ya yahan drop karein
                      </p>
                      <p className="text-xs text-slate-500">
                        PDF, Word, Excel, PowerPoint, Images (JPG, PNG)
                      </p>
                    </>
                  )}
                </div>
              ) : (
                /* Uploaded File Chip */
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {uploadResult.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {uploadResult.pageCount}{" "}
                        {uploadResult.pageCount === 1 ? "Page" : "Pages"} ·{" "}
                        {(uploadResult.sizeBytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadResult(null);
                      setQuote(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg shrink-0"
                  >
                    Tabdeel Karein
                  </button>
                </div>
              )}

              {/* Privacy Line */}
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 px-1">
                <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <span>
                  Aapki file printing ke baad server se delete kar di jaye gi.
                </span>
              </div>

              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}
            </section>

            {/* Step 2: Print Settings */}
            {uploadResult && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <section className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step 2: Print Settings
                  </span>

                  {/* Copies */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-900">Copies</p>
                      <p className="text-xs text-slate-500">
                        Tadaad (1 se 100)
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setCopies((c) => Math.max(1, c - 1))}
                        className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center text-lg transition"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={copies}
                        onChange={(e) =>
                          setCopies(
                            Math.min(
                              100,
                              Math.max(1, parseInt(e.target.value) || 1),
                            ),
                          )
                        }
                        className="w-12 h-10 text-center font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setCopies((c) => Math.min(100, c + 1))}
                        className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center text-lg transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Color Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Rang (Color)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setColorMode(ColorMode.BW)}
                        className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between min-h-[64px] ${
                          colorMode === ColorMode.BW
                            ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="font-bold text-sm text-slate-900">
                          Black & White
                        </span>
                        <span className="text-xs text-slate-500">
                          Rs. {shop.rates.rateBwSingle}/page
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setColorMode(ColorMode.COLOR)}
                        className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between min-h-[64px] ${
                          colorMode === ColorMode.COLOR
                            ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="font-bold text-sm text-slate-900">
                          Color (رنگین)
                        </span>
                        <span className="text-xs text-slate-500">
                          Rs. {shop.rates.rateColorSingle}/page
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Sides (Single vs Double Sided) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Sides
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSides(Sides.SINGLE)}
                        className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between min-h-[64px] ${
                          sides === Sides.SINGLE
                            ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="font-bold text-sm text-slate-900">
                          Single Sided
                        </span>
                        <span className="text-xs text-slate-500">Ek taraf</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSides(Sides.DOUBLE)}
                        className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between min-h-[64px] ${
                          sides === Sides.DOUBLE
                            ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="font-bold text-sm text-slate-900">
                          Double Sided
                        </span>
                        <span className="text-xs text-slate-500">
                          Dono taraf (Sasta)
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Paper Size & Page Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Paper Size
                      </label>
                      <select
                        value={paperSize}
                        onChange={(e) =>
                          setPaperSize(e.target.value as PaperSize)
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-blue-600"
                      >
                        <option value={PaperSize.A4}>A4 (Standard)</option>
                        <option value={PaperSize.A3}>A3 (Bara Size)</option>
                        <option value={PaperSize.LEGAL}>Legal</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Page Range
                      </label>
                      <input
                        type="text"
                        value={pageRange}
                        onChange={(e) => setPageRange(e.target.value)}
                        placeholder="Misal: 1-3, 5"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-blue-600 placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Tamam pages print karne ke liye Page Range ko khali
                    chhorein.
                  </p>
                </section>

                {/* Step 3: Customer Details */}
                <section className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step 3: Aapki Maloomat
                  </span>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Aapka Naam <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Apna poora naam likhein"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-blue-600 placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Phone Number{" "}
                        <span className="text-slate-400 font-normal">
                          (Ikhtiyari)
                        </span>
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="03001234567"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-blue-600 placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}
                </section>

                {/* Sticky Bottom Price Bar */}
                <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-5 py-3.5 shadow-lg">
                  <div className="mx-auto max-w-md flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        Kul Raqam (Cash at counter)
                      </p>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-2xl font-black text-slate-900">
                          Rs. {quote ? quote.total : "..."}
                        </span>
                        {quote && (
                          <span className="text-xs text-slate-500">
                            ({quote.printedPages}{" "}
                            {quote.printedPages === 1 ? "page" : "pages"})
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !customerName.trim()}
                      className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-sm transition flex items-center space-x-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submit...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Karein</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
