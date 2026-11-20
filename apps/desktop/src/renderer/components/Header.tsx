import React from "react";
import { Shop } from "../types";
import {
  Printer,
  Settings,
  BarChart3,
  QrCode,
  LogOut,
  Volume2,
  VolumeX,
  Radio,
} from "lucide-react";

interface Props {
  shop: Shop | null;
  isConnected: boolean;
  soundEnabled: boolean;
  serverStatus?: {
    isRunning: boolean;
    isEmbedded: boolean;
    tunnelUrl: string | null;
  } | null;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenReport: () => void;
  onOpenQr: () => void;
  onLogout: () => void;
}

export const Header: React.FC<Props> = ({
  shop,
  isConnected,
  soundEnabled,
  serverStatus,
  onToggleSound,
  onOpenSettings,
  onOpenReport,
  onOpenQr,
  onLogout,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shadow-sm select-none">
      {/* Brand & Shop info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-black text-xl shadow-inner">
            چھ
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              Chhapai{" "}
              <span className="text-xs font-normal text-slate-500 font-mono">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {shop?.name || "Counter App"}{" "}
              {shop?.isOpen ? "• Khula Hai" : "• Band Hai"}
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="hidden md:flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isConnected
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            {isConnected ? "Online" : "Offline"}
          </span>

          {serverStatus?.isEmbedded && (
            <span
              title="Shop PC par built-in API server chal raha hai"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
            >
              <Radio className="w-3.5 h-3.5" />
              Auto-Server: 3001
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              shop?.autoPrint
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Auto-Print: {shop?.autoPrint ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          title={soundEnabled ? "Awaz Band Karein" : "Awaz Kholein"}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <VolumeX className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {/* QR Poster */}
        <button
          onClick={onOpenQr}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <QrCode className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">QR Poster</span>
        </button>

        {/* Daily Report */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <BarChart3 className="w-4 h-4 text-accent" />
          <span className="hidden sm:inline">Daily Report</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-600" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Logout Karein"
          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
