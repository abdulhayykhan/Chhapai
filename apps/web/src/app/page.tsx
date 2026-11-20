"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Printer,
  QrCode,
  UploadCloud,
  FileCheck2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const [recentToken, setRecentToken] = useState<{
    tokenLabel: string;
    publicToken: string;
  } | null>(null);

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith("chhapai_job_")) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const data = JSON.parse(raw);
            if (data?.publicToken && data?.tokenLabel) {
              setRecentToken(data);
              break;
            }
          }
        }
      }
    } catch {}
  }, []);

  return (
    <div className="flex flex-col items-center justify-between min-h-[85vh] px-5 py-8 text-center select-none">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Emblem */}
        <div className="relative inline-block mx-auto mt-2">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white rounded-3xl flex items-center justify-center font-black text-4xl shadow-xl shadow-blue-500/25 ring-4 ring-blue-100">
            چھ
          </div>
          <span className="absolute -bottom-2 -right-1 bg-amber-400 text-amber-950 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 border border-white">
            <Sparkles className="w-3 h-3" />
            Fast
          </span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Chhapai <span className="text-blue-700">(چھپائی)</span>
          </h1>
          <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            Dukan par walk-in self-service printing. Scan karein, file bhejein, aur counter se foran print lein!
          </p>
        </div>

        {/* Active Order Recovery Pill if present */}
        {recentToken && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 text-left shadow-xs space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Aapka pichla print order:
              </span>
              <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-amber-200 font-bold">
                {recentToken.tokenLabel}
              </span>
            </div>
            <Link
              href={`/j/${recentToken.publicToken}`}
              className="w-full flex items-center justify-between px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <span>Live Status Check Karein</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* 3 Step Visual Flow */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 text-left space-y-3.5 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Customer Guide (Aasan Tareeqa):
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">1. Counter QR Scan Karein</p>
                <p className="text-[11px] text-slate-500">Mobile camera se scan karein, koi app download nahi karni.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">2. File &amp; Settings Chunein</p>
                <p className="text-[11px] text-slate-500">PDF ya Image upload karein, live PKR price check karein.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">3. Token Batayein &amp; Print Lein</p>
                <p className="text-[11px] text-slate-500">Counter par token bata kar cash ada karein aur print lein.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-1.5 justify-center bg-white border border-slate-100 rounded-xl py-2 px-1 shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant Silent Print</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center bg-white border border-slate-100 rounded-xl py-2 px-1 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            <span>Files Auto-Delete</span>
          </div>
        </div>

        {/* Main CTA */}
        <Link
          href="/s/main-branch"
          className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
        >
          <Printer className="w-5 h-5 text-blue-200" />
          <span>Main Branch Demo Par Jayein</span>
          <ArrowRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
