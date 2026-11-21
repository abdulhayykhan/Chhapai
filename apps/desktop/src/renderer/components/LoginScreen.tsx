import React, { useState, useEffect } from "react";
import { adminApi, getServerUrl } from "../lib/api";
import { AdminUser } from "../types";
import {
  LogIn,
  Server,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface Props {
  onLoginSuccess: (user: AdminUser) => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState(() => getServerUrl());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    isRunning: boolean;
    isEmbedded: boolean;
    port: number;
    error?: string;
  } | null>(null);
  const [isRestartingServer, setIsRestartingServer] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      if ((window as any).electronAPI?.getServerStatus) {
        (window as any).electronAPI.getServerStatus().then(setServerStatus);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRestartServer = async () => {
    if (!(window as any).electronAPI?.restartServer) return;
    setIsRestartingServer(true);
    setErrorMsg(null);
    try {
      const res = await (window as any).electronAPI.restartServer();
      setServerStatus(res);
    } catch (err: any) {
      setErrorMsg(`Server restart na ho saka: ${err?.message || err}`);
    } finally {
      setIsRestartingServer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await adminApi.login(
        email.trim(),
        password,
        serverUrl.trim(),
      );
      onLoginSuccess(res.user);
    } catch (err: any) {
      if (err?.code === "UNAUTHORIZED") {
        setErrorMsg("Email ya password ghalat hai.");
      } else if (err?.code === "ACCOUNT_LOCKED") {
        setErrorMsg(
          "5 ghalat koshishon ki wajah se account 15 minute ke liye lock ho gaya hai.",
        );
      } else if (err?.message === "Failed to fetch") {
        setErrorMsg(
          "Server se rabta nahi ho saka (Failed to fetch). Barah-e-karam chand second intizar karein ya Server URL check karein.",
        );
      } else {
        setErrorMsg(
          err?.message || "Login na ho saka. Server connection check karein.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-100 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-primary p-8 text-center text-white relative overflow-hidden">
          <div className="px-5 py-2 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-3xl mx-auto mb-3 shadow-inner inline-flex">
            چھپائی
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Chhapai Counter
          </h1>
          <p className="text-xs text-blue-100 font-medium mt-1">
            Dukan Operator & Owner Login
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-700 font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@chhapai.pk"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Backend Status Indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverStatus?.isRunning
                    ? "bg-emerald-500 shadow-sm shadow-emerald-400"
                    : "bg-amber-500 animate-pulse"
                }`}
              />
              <span className="font-medium">
                {serverStatus?.isRunning
                  ? `Backend Server Active (Port ${serverStatus.port})`
                  : serverStatus?.error
                  ? `Backend: ${serverStatus.error.slice(0, 45)}...`
                  : "Local backend shuru ho raha hai..."}
              </span>
            </div>
            {!serverStatus?.isRunning && (window as any).electronAPI?.restartServer && (
              <button
                type="button"
                onClick={handleRestartServer}
                disabled={isRestartingServer}
                className="text-primary hover:underline font-bold text-[10px] flex items-center gap-1"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isRestartingServer ? "animate-spin" : ""}`}
                />
                <span>Restart</span>
              </button>
            )}
          </div>

          {/* Advanced Server URL toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Advanced: Server URL</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  API Server Address
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://localhost:3001/api/v1"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover active:scale-[0.99] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Login Karein</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-400 font-medium">
            Chhapai Free &amp; Open Source • Created by{" "}
            <a
              href="https://abdulhayykhan.dev"
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 hover:text-blue-600 underline font-semibold transition-colors"
            >
              Abdul Hayy Khan
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};
