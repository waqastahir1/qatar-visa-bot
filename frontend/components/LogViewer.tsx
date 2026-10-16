import { useEffect, useRef } from "react";
import { Trash2, Terminal } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

interface Log {
  id?: number;
  timestamp: string;
  level: string;
  message: string;
}

interface Props {
  logs: Log[];
  onClear: () => void;
}

const levelStyle = (level: string) => {
  switch (level) {
    case "SUCCESS": return "text-emerald-600";
    case "ERROR":   return "text-red-500";
    case "WARNING": return "text-amber-600";
    default:        return "text-gray-600";
  }
};

const dotStyle = (level: string) => {
  switch (level) {
    case "SUCCESS": return "bg-emerald-400";
    case "ERROR":   return "bg-red-400";
    case "WARNING": return "bg-amber-400";
    default:        return "bg-blue-400";
  }
};

export default function LogViewer({ logs, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleClear = async () => {
    try {
      await axios.delete("/api/logs");
      onClear();
      toast("Logs cleared", { icon: "🗑" });
    } catch {
      toast.error("Could not clear logs");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-80">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-500" />
          <h2 className="font-semibold text-gray-700 text-sm">Live Logs</h2>
          <span className="text-xs text-gray-400 bg-slate-200 px-2 py-0.5 rounded-full">{logs.length}</span>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs space-y-1.5 bg-slate-50">
        {logs.length === 0 ? (
          <p className="text-gray-400 pt-6 text-center">No logs yet. Start the bot to see activity.</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2.5 py-0.5">
              <span className="text-gray-400 shrink-0 tabular-nums">{log.timestamp}</span>
              <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${dotStyle(log.level)}`} />
              <span className={`${levelStyle(log.level)} break-all`}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
