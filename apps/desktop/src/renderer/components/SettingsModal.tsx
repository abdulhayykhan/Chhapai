import React, { useState, useEffect } from "react";
import { Shop } from "../types";
import { adminApi } from "../lib/api";
import { storage } from "../lib/storage";
import {
  X,
  Save,
  Printer,
  DollarSign,
  ShieldAlert,
  Sliders,
  Volume2,
  Power,
} from "lucide-react";

interface Props {
  shop: Shop | null;
  onClose: () => void;
  onSave: (updated: Shop) => void;
}

export const SettingsModal: React.FC<Props> = ({ shop, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Shop>>({});
  const [printers, setPrinters] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name,
        phone: shop.phone || "",
        isOpen: shop.isOpen,
        autoPrint: shop.autoPrint,
        bwPrinter: shop.bwPrinter || "",
        colorPrinter: shop.colorPrinter || "",
        rateBwSingle: Number(shop.rateBwSingle),
        rateBwDouble: Number(shop.rateBwDouble),
        rateColorSingle: Number(shop.rateColorSingle),
        rateColorDouble: Number(shop.rateColorDouble),
        maxFileMb: shop.maxFileMb,
        maxPages: shop.maxPages,
        retentionMinutes: shop.retentionMinutes,
      });
    }

    // Load system printers
    if (
      typeof window !== "undefined" &&
      (window as any).electronAPI?.getPrinters
    ) {
      (window as any).electronAPI.getPrinters().then((list: string[]) => {
        if (list && list.length > 0) setPrinters(list);
      });
    } else {
      setPrinters([
        "Default Printer",
        "Microsoft Print to PDF",
        "HP LaserJet Pro",
        "Canon LBP2900",
      ]);
    }

    // Load local settings
    storage.get<boolean>("sound_enabled").then((val) => {
      if (val !== null) setSoundEnabled(val);
    });
    storage.get<boolean>("autostart_enabled").then((val) => {
      if (val !== null) setAutostartEnabled(val);
    });
  }, [shop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Save shop settings on API
      const updated = await adminApi.updateSettings(formData);

      // Save local sound & autostart settings
      await storage.set("sound_enabled", soundEnabled);
      await storage.set("autostart_enabled", autostartEnabled);
      if (
        typeof window !== "undefined" &&
        (window as any).electronAPI?.setAutostart
      ) {
        await (window as any).electronAPI.setAutostart(autostartEnabled);
      }

      setSaveSuccess(true);
      onSave(updated);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      alert(`Settings save na ho sakeen: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Sliders className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-900 text-base">
              Shop Settings (Dukan Ki Trateeb)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Section 1: Shop Status & Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Shop Info
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dukan Ka Naam
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-primary font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rabta Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-primary font-medium"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={formData.isOpen ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, isOpen: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span>Dukan Khuli Hai (Open for Orders)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={formData.autoPrint ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, autoPrint: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span>Auto-Print On Approval</span>
              </label>
            </div>
          </div>

          {/* Section 2: Pricing Rates (PKR) */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Print Rates (PKR per page)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  B/W Aik Taraf
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-bold">Rs.</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.rateBwSingle ?? 5}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateBwSingle: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm font-bold text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  B/W Dono Taraf
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-bold">Rs.</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.rateBwDouble ?? 4}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateBwDouble: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm font-bold text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Color Aik Taraf
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-bold">Rs.</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.rateColorSingle ?? 30}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateColorSingle: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm font-bold text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Color Dono Taraf
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-bold">Rs.</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.rateColorDouble ?? 25}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateColorDouble: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm font-bold text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Hardware Printers */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-primary" />
              Printers Selection
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Siyah/Safaid (B/W) Printer
                </label>
                <select
                  value={formData.bwPrinter || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, bwPrinter: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-primary font-medium"
                >
                  <option value="">-- Printer Chunein --</option>
                  {printers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rangeen (Color) Printer
                </label>
                <select
                  value={formData.colorPrinter || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, colorPrinter: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-primary font-medium"
                >
                  <option value="">-- Printer Chunein --</option>
                  {printers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Limits & Retention */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Limits & File Retention
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Pages Fi Job
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxPages ?? 200}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxPages: parseInt(e.target.value, 10) || 200,
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxFileMb ?? 25}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxFileMb: parseInt(e.target.value, 10) || 25,
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  File Retention (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  value={formData.retentionMinutes ?? 60}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      retentionMinutes: parseInt(e.target.value, 10) || 60,
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 5: App Preferences (Sound & Autostart) */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-blue-600" />
              Counter App Trateeb
            </h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span>Naye print job par awaz (Chime) sunayein</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={autostartEnabled}
                  onChange={(e) => setAutostartEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span>
                  Windows chalu hone par Chhapai khud-ba-khud start karein
                </span>
              </label>
            </div>
          </div>

          {/* About & Author Credits */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Chhapai v1.0.0 (Free &amp; Open Source)</p>
              <p className="mt-0.5">
                Authored by{" "}
                <a
                  href="https://abdulhayykhan.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  Abdul Hayy Khan
                </a>
              </p>
            </div>
            <a
              href="https://abdulhayykhan.dev"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
            >
              abdulhayykhan.dev
            </a>
          </div>

          {/* Footer Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {saveSuccess ? (
              <span className="text-xs font-bold text-emerald-600 animate-fade-in">
                ✓ Trateeb kamyabi se mehfooz ho gayi hai!
              </span>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Band Karein
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-md transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSaving
                    ? "Mehfooz ho raha hai..."
                    : "Mehfooz Karein (Save)"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
