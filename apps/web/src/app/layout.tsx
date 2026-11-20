import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chhapai — Scan. Upload. Print.",
  description: "Apni file upload karein aur counter se print lein.",
  authors: [{ name: "Abdul Hayy Khan", url: "https://abdulhayykhan.dev" }],
  creator: "Abdul Hayy Khan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ur-PK" dir="ltr">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm flex flex-col justify-between">
          <div className="flex-1">{children}</div>
          <footer className="py-4 px-6 text-center text-xs text-slate-400 border-t border-slate-100">
            Free &amp; Open Source • Created by{" "}
            <a
              href="https://abdulhayykhan.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-blue-600 font-semibold underline underline-offset-2 transition-colors"
            >
              Abdul Hayy Khan
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
