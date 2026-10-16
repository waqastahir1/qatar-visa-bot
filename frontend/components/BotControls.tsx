import { Play, Square } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

interface Props {
  botStatus: string;
  onStatusChange: (s: string) => void;
}

export default function BotControls({ botStatus, onStatusChange }: Props) {
  const isRunning = botStatus === "running";

  const handleStart = async () => {
    try {
      await axios.post("/api/bot/start");
      toast.success("Bot started!");
      onStatusChange("running");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to start bot");
    }
  };

  const handleStop = async () => {
    try {
      await axios.post("/api/bot/stop");
      toast("Bot stopped", { icon: "⏹" });
      onStatusChange("stopped");
    } catch {
      toast.error("Failed to stop bot");
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Status pill */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
        isRunning
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-slate-100 border-slate-200 text-slate-500"
      }`}>
        <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
        {isRunning ? "Running" : "Stopped"}
      </div>

      {/* Start / Stop button */}
      {isRunning ? (
        <button
          onClick={handleStop}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm shadow-sm transition"
        >
          <Square className="w-3.5 h-3.5" /> Stop Bot
        </button>
      ) : (
        <button
          onClick={handleStart}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium text-sm shadow-sm transition"
        >
          <Play className="w-3.5 h-3.5" /> Start Bot
        </button>
      )}
    </div>
  );
}
