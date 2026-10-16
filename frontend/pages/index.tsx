import { useEffect, useState, useRef, useCallback } from "react";
import Head from "next/head";
import axios from "axios";
import toast from "react-hot-toast";
import { Settings } from "lucide-react";

import StatsCards from "../components/StatsCards";
import BotControls from "../components/BotControls";
import ClientTable from "../components/ClientTable";
import LogViewer from "../components/LogViewer";
import ClientModal from "../components/ClientModal";
import SettingsPanel from "../components/SettingsPanel";

interface Client {
  id: number;
  name: string;
  passport: string;
  visa: string;
  mobile: string;
  email: string;
  priority: string;
  status: string;
  booked_date?: string;
  booked_time?: string;
  is_active: boolean;
}

interface Log {
  id?: number;
  timestamp: string;
  level: string;
  message: string;
}

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [botStatus, setBotStatus] = useState<string>("stopped");
  const [showClientModal, setShowClientModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // ─── Fetch initial data ───────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    const r = await axios.get("/api/clients");
    setClients(r.data);
  }, []);

  const fetchLogs = useCallback(async () => {
    const r = await axios.get("/api/logs?limit=200");
    setLogs(r.data);
  }, []);

  const fetchStatus = useCallback(async () => {
    const r = await axios.get("/api/bot/status");
    setBotStatus(r.data.status);
  }, []);

  useEffect(() => {
    fetchClients();
    fetchLogs();
    fetchStatus();
  }, [fetchClients, fetchLogs, fetchStatus]);

  // ─── WebSocket for real-time logs ───────────────────────────────
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket("ws://localhost:8000/ws");
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.type === "log") {
          setLogs((prev) => [
            ...prev.slice(-499),
            { timestamp: data.timestamp, level: data.level, message: data.message },
          ]);
        } else if (data.type === "status") {
          setBotStatus(data.status);
          if (data.status === "running") {
            fetchClients();
          }
        }
      };

      ws.onclose = () => {
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, [fetchClients]);

  // ─── Client CRUD ─────────────────────────────────────────────────
  const handleSaveClient = async (data: any) => {
    try {
      if (editClient?.id) {
        await axios.put(`/api/clients/${editClient.id}`, data);
        toast.success("Client updated!");
      } else {
        await axios.post("/api/clients", data);
        toast.success("Client added!");
      }
      setShowClientModal(false);
      setEditClient(null);
      fetchClients();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save client");
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!confirm("Delete this client?")) return;
    try {
      await axios.delete(`/api/clients/${id}`);
      toast("Client removed", { icon: "🗑" });
      fetchClients();
    } catch {
      toast.error("Failed to delete client");
    }
  };

  // ─── Derived stats ───────────────────────────────────────────────
  const bookedCount = clients.filter((c) => c.status === "booked").length;
  const waitingCount = clients.filter((c) => c.status === "waiting" && c.is_active).length;

  return (
    <>
      <Head>
        <title>Qatar Visa Bot</title>
      </Head>

      <div className="min-h-screen bg-slate-100 text-gray-800">
        {/* ─── Navbar ─────────────────────────────────────────────── */}
        <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow">
                Q
              </div>
              <div>
                <h1 className="font-bold text-gray-800 leading-none">Qatar Visa Bot</h1>
                <p className="text-xs text-gray-400">Appointment Monitor</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <BotControls botStatus={botStatus} onStatusChange={setBotStatus} />
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg hover:bg-slate-100 text-gray-400 hover:text-blue-600 transition"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* ─── Main Content ────────────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

          {/* Stats */}
          <StatsCards
            totalClients={clients.length}
            bookedClients={bookedCount}
            waitingClients={waitingCount}
            botStatus={botStatus}
          />

          {/* Client Table */}
          <ClientTable
            clients={clients}
            onAdd={() => { setEditClient(null); setShowClientModal(true); }}
            onEdit={(c) => { setEditClient(c); setShowClientModal(true); }}
            onDelete={handleDeleteClient}
          />

          {/* Live Logs */}
          <LogViewer
            logs={logs}
            onClear={() => setLogs([])}
          />
        </main>
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────── */}
      {showClientModal && (
        <ClientModal
          client={editClient}
          onClose={() => { setShowClientModal(false); setEditClient(null); }}
          onSave={handleSaveClient}
        />
      )}

      {showSettings && (
        <SettingsPanel onClose={() => { setShowSettings(false); fetchClients(); }} />
      )}
    </>
  );
}
