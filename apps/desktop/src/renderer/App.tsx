import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PrintJobDto, Shop, AdminUser, QueueTab } from "./types";
import { adminApi } from "./lib/api";
import { adminSocket } from "./lib/socket";
import { storage } from "./lib/storage";
import { triggerDesktopAlert } from "./lib/sound";
import { printWorker } from "./lib/printWorker";
import { Header } from "./components/Header";
import { OfflineBanner } from "./components/OfflineBanner";
import { QueuePane } from "./components/QueuePane";
import { JobDetailPane } from "./components/JobDetailPane";
import { RejectModal } from "./components/RejectModal";
import { SettingsModal } from "./components/SettingsModal";
import { DailyReportModal } from "./components/DailyReportModal";
import { QrPosterModal } from "./components/QrPosterModal";
import { LoginScreen } from "./components/LoginScreen";

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [serverStatus, setServerStatus] = useState<{
    isRunning: boolean;
    isEmbedded: boolean;
    tunnelUrl: string | null;
  } | null>(null);

  // Queue state
  const [jobs, setJobs] = useState<PrintJobDto[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<QueueTab>("pending");

  // Modals state
  const [rejectingJob, setRejectingJob] = useState<PrintJobDto | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // 1. Initial auth check
  useEffect(() => {
    if (window.electronAPI?.getServerStatus) {
      window.electronAPI.getServerStatus().then(setServerStatus);
    }

    storage.get<boolean>("sound_enabled").then((val) => {
      if (val !== null) setSoundEnabled(val);
    });

    adminApi
      .init()
      .then(async (res) => {
        if (res.authenticated && res.user) {
          setCurrentUser(res.user);
          await loadShopAndJobs();
        }
      })
      .catch((err) => {
        console.error("Initialization error:", err);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  // 2. Load shop details & initial jobs
  const loadShopAndJobs = useCallback(async () => {
    try {
      const [shopData, jobsRes] = await Promise.all([
        adminApi.getSettings(),
        adminApi.getJobs({ pageSize: 100 }),
      ]);
      setShop(shopData);
      printWorker.setShop(shopData);
      setJobs(jobsRes.data);

      if (jobsRes.data.length > 0) {
        setActiveJobId(jobsRes.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load shop or jobs:", err);
    }
  }, []);

  // 3. Socket event setup
  useEffect(() => {
    if (!currentUser) return;

    adminSocket.connect();

    const unsubConn = adminSocket.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    const unsubReconnect = adminSocket.onReconnect(() => {
      loadShopAndJobs();
      printWorker.syncBacklog();
    });

    const unsubCreated = adminSocket.onJobCreated((newJob) => {
      setJobs((prev) => {
        if (prev.some((j) => j.id === newJob.id)) return prev;
        return [newJob, ...prev];
      });
      triggerDesktopAlert(newJob.tokenLabel, newJob.customerName, soundEnabled);
    });

    const unsubUpdated = adminSocket.onJobUpdated((updatedJob) => {
      setJobs((prev) =>
        prev.map((j) => (j.id === updatedJob.id ? { ...j, ...updatedJob } : j)),
      );
    });

    const unsubApproved = adminSocket.onJobApproved((approvedJob) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === approvedJob.id ? { ...j, ...approvedJob } : j,
        ),
      );
      printWorker.handleJobApproved(approvedJob);
    });

    return () => {
      unsubConn();
      unsubReconnect();
      unsubCreated();
      unsubUpdated();
      unsubApproved();
      adminSocket.disconnect();
    };
  }, [currentUser, soundEnabled, loadShopAndJobs]);

  // Selected job
  const activeJob = useMemo(() => {
    return jobs.find((j) => j.id === activeJobId) || null;
  }, [jobs, activeJobId]);

  // Filtered jobs for keyboard navigation
  const visibleJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (activeTab === "pending") {
        return [
          "PENDING_APPROVAL",
          "CLAIMED",
          "CONVERTED",
          "PRICE_CALCULATED",
        ].includes(j.status);
      } else if (activeTab === "in_progress") {
        return ["APPROVED", "PRINTING"].includes(j.status);
      } else if (activeTab === "completed") {
        return j.status === "COMPLETED";
      } else {
        return ["REJECTED", "FAILED", "CANCELLED", "EXPIRED"].includes(
          j.status,
        );
      }
    });
  }, [jobs, activeTab]);

  // 4. Keyboard Shortcuts (A11 per PRD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      // Close modal on Escape
      if (e.key === "Escape") {
        setRejectingJob(null);
        setShowSettings(false);
        setShowReport(false);
        setShowQr(false);
        return;
      }

      // Arrow navigation
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (visibleJobs.length === 0) return;
        const currentIndex = visibleJobs.findIndex((j) => j.id === activeJobId);
        if (e.key === "ArrowDown") {
          const nextIndex =
            currentIndex < visibleJobs.length - 1 ? currentIndex + 1 : 0;
          setActiveJobId(visibleJobs[nextIndex].id);
        } else {
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : visibleJobs.length - 1;
          setActiveJobId(visibleJobs[prevIndex].id);
        }
        return;
      }

      // 'A' or 'Enter' to Approve
      if ((e.key === "a" || e.key === "A" || e.key === "Enter") && activeJob) {
        if (
          [
            "PENDING_APPROVAL",
            "CLAIMED",
            "CONVERTED",
            "PRICE_CALCULATED",
          ].includes(activeJob.status)
        ) {
          e.preventDefault();
          handleApprove(activeJob.id);
        }
      }

      // 'R' to Reject
      if ((e.key === "r" || e.key === "R") && activeJob) {
        if (
          [
            "PENDING_APPROVAL",
            "CLAIMED",
            "CONVERTED",
            "PRICE_CALCULATED",
          ].includes(activeJob.status)
        ) {
          e.preventDefault();
          setRejectingJob(activeJob);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeJob, visibleJobs, activeJobId]);

  // Actions
  const handleApprove = async (
    jobId: string,
    options?: { finalAmount?: number; markPaid?: boolean },
  ) => {
    try {
      const updated = await adminApi.approveJob(jobId, options);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } catch (err: any) {
      alert(`Approve na ho saka: ${err.message}`);
    }
  };

  const handleConfirmReject = async (jobId: string, reason: string) => {
    try {
      const updated = await adminApi.rejectJob(jobId, reason);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      setRejectingJob(null);
    } catch (err: any) {
      alert(`Reject na ho saka: ${err.message}`);
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      const updated = await adminApi.cancelJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } catch (err: any) {
      alert(`Cancel na ho saka: ${err.message}`);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      const updated = await adminApi.retryJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } catch (err: any) {
      alert(`Retry na ho saka: ${err.message}`);
    }
  };

  const handleMarkPaid = async (jobId: string) => {
    try {
      const updated = await adminApi.markPaid(jobId);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } catch (err: any) {
      alert(`Paid mark na ho saka: ${err.message}`);
    }
  };

  const handleManualPrint = (jobId: string) => {
    printWorker.enqueue(jobId);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    storage.set("sound_enabled", next);
  };

  const handleLogout = async () => {
    await adminApi.logout();
    setCurrentUser(null);
    setJobs([]);
    setActiveJobId(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={async (user) => {
          setCurrentUser(user);
          await loadShopAndJobs();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Offline Alert Banner */}
      {!isConnected && (
        <OfflineBanner onReconnect={() => adminSocket.connect()} />
      )}

      {/* Main App Header */}
      <Header
        shop={shop}
        isConnected={isConnected}
        soundEnabled={soundEnabled}
        serverStatus={serverStatus}
        onToggleSound={handleToggleSound}
        onOpenSettings={() => setShowSettings(true)}
        onOpenReport={() => setShowReport(true)}
        onOpenQr={() => setShowQr(true)}
        onLogout={handleLogout}
      />

      {/* Two Panes Workspace */}
      <main className="flex-1 flex overflow-hidden">
        <QueuePane
          jobs={jobs}
          activeJobId={activeJobId}
          onSelectJob={(j) => setActiveJobId(j.id)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <JobDetailPane
          job={activeJob}
          onApprove={handleApprove}
          onReject={setRejectingJob}
          onCancel={handleCancel}
          onRetry={handleRetry}
          onMarkPaid={handleMarkPaid}
          onManualPrint={handleManualPrint}
        />
      </main>

      {/* Modals */}
      {rejectingJob && (
        <RejectModal
          job={rejectingJob}
          onClose={() => setRejectingJob(null)}
          onConfirm={handleConfirmReject}
        />
      )}

      {showSettings && (
        <SettingsModal
          shop={shop}
          onClose={() => setShowSettings(false)}
          onSave={(updated) => {
            setShop(updated);
            printWorker.setShop(updated);
          }}
        />
      )}

      {showReport && <DailyReportModal onClose={() => setShowReport(false)} />}

      {showQr && <QrPosterModal shop={shop} onClose={() => setShowQr(false)} />}
    </div>
  );
};
