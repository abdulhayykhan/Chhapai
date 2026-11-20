import Link from "next/link";
import { Printer } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <Printer className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
        Chhapai
      </h1>
      <p className="text-slate-600 mb-8 font-medium">
        Scan karein, Upload karein, Print karein.
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-slate-700 text-sm max-w-xs text-left mb-6">
        <p className="font-semibold text-slate-900 mb-2">
          Walk-in Customer Guide:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-slate-600">
          <li>Dukan par maujood QR code scan karein</li>
          <li>Apni file select kar ke upload karein</li>
          <li>Settings chunain aur Token hasil karein</li>
          <li>Counter par Token bata kar cash ada karein</li>
        </ol>
      </div>

      <Link
        href="/s/main-branch"
        className="w-full max-w-xs bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl shadow transition text-center"
      >
        Main Branch Demo Par Jayein
      </Link>
    </div>
  );
}
