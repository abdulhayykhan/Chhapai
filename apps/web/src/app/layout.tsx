import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chhapai — Scan. Upload. Print.",
  description: "Apni file upload karein aur counter se print lein.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ur-PK" dir="ltr">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
