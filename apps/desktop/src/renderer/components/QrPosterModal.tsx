import React, { useState, useEffect } from "react";
import { Shop } from "../types";
import { adminApi, getServerUrl } from "../lib/api";
import {
  X,
  Download,
  Printer,
  QrCode,
  Smartphone,
  Upload,
  CheckCircle2,
} from "lucide-react";

interface Props {
  shop: Shop | null;
  onClose: () => void;
}

export const QrPosterModal: React.FC<Props> = ({ shop, onClose }) => {
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [svgData, setSvgData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      adminApi.getQrCode("png").then(setPngUrl),
      adminApi.getQrCode("svg").then(setSvgData),
    ])
      .catch((err) => console.error("Failed to load QR code:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleDownloadPng = () => {
    if (!pngUrl) return;
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `Chhapai-QR-${shop?.slug || "shop"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSvg = () => {
    if (!svgData) return;
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Chhapai-QR-${shop?.slug || "shop"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  const shopUrl = `${getServerUrl().replace(":3001", ":3000")}/s/${shop?.slug || "default"}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-900 text-base">
              Shop QR Poster (Dukan Ka Poster)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPng}
              disabled={!pngUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG</span>
            </button>
            <button
              onClick={handleDownloadSvg}
              disabled={!svgData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SVG</span>
            </button>
            <button
              onClick={handlePrintPoster}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Poster Print Karein</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Poster Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
          <div
            id="printable-poster"
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-300 p-8 text-center flex flex-col items-center"
          >
            {/* Poster Header */}
            <div className="px-4 py-2 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-2xl shadow-md mb-3">
              چھپائی
            </div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">
              Chhapai
            </h1>
            <p className="text-sm font-bold text-primary mt-1">
              Mobile Se Khud Print Karein!
            </p>

            {/* QR Code Container */}
            <div className="my-6 p-4 bg-white rounded-2xl border-4 border-primary/20 shadow-md">
              {isLoading ? (
                <div className="w-52 h-52 flex items-center justify-center text-slate-400">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pngUrl ? (
                <img
                  src={pngUrl}
                  alt="Shop QR Code"
                  className="w-52 h-52 object-contain"
                />
              ) : null}
            </div>

            {/* 3 Step Instructions */}
            <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2.5 mb-5 text-xs font-medium text-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                  1
                </span>
                <span>Mobile camera se QR Code scan karein</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                  2
                </span>
                <span>Apni file upload karein aur copies chunein</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                  3
                </span>
                <span>Token number counter pe batayein aur print lein!</span>
              </div>
            </div>

            {/* Shop Footer */}
            <div className="border-t border-slate-200 pt-3 w-full text-center">
              <p className="text-sm font-bold text-slate-900">
                {shop?.name || "Chhapai Print Shop"}
              </p>
              {shop?.phone && (
                <p className="text-xs text-slate-500 font-medium">
                  Phone: {shop.phone}
                </p>
              )}
              <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                {shopUrl}
              </p>
              <p className="text-[9px] text-slate-400 mt-2 font-medium">
                Powered by Chhapai • Open Source by{" "}
                <a
                  href="https://abdulhayykhan.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-slate-600"
                >
                  Abdul Hayy Khan
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
