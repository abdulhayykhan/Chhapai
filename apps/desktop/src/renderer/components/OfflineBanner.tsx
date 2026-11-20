import React from "react";
import { WifiOff, RefreshCw } from "lucide-react";

interface Props {
  onReconnect?: () => void;
}

export const OfflineBanner: React.FC<Props> = ({ onReconnect }) => {
  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-md text-sm font-medium animate-pulse">
      <div className="flex items-center gap-2">
        <WifiOff className="w-5 h-5 flex-shrink-0" />
        <span>
          <strong>Rabta Munqata:</strong> Server ya Internet se rabta toot gaya
          hai. Auto-reconnect koshish jari hai...
        </span>
      </div>
      {onReconnect && (
        <button
          onClick={onReconnect}
          className="flex items-center gap-1.5 bg-white text-red-700 hover:bg-red-50 px-3 py-1 rounded text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Dobara Jorein
        </button>
      )}
    </div>
  );
};
