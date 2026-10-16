import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, X, Mail, Info } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

interface Props {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: Props) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);
  const [showAppPass, setShowAppPass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get("/api/settings").then((r) => {
      setSettings(r.data);
      setLoading(false);
    });
  }, []);

  const set = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: string) =>
    set(key, settings[key] === "true" ? "false" : "true");

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put("/api/settings", { settings });
      toast.success("Settings saved!");
      onClose();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-300 transition";

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-gray-400 shadow-xl">Loading settings...</div>
      </div>
    );
  }

  const field = (label: string, key: string, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={settings[key] || ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );

  const toggle_row = (label: string, key: string, description: string) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => toggle(key)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${
          settings[key] === "true" ? "bg-blue-500" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
            settings[key] === "true" ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );

  const section = (title: string, children: React.ReactNode) => (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-slate-100" />
        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest px-2">{title}</h3>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">Settings</h2>
            <p className="text-xs text-gray-400">Configure bot credentials and behavior</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── QVC Login ─────────────────────────────────── */}
          {section("Qatar Visa Center Login", <>
            {field("Email Address", "qvc_email", "email", "your@email.com")}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={settings["qvc_password"] || ""}
                  onChange={(e) => set("qvc_password", e.target.value)}
                  className={inputClass + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>)}

          {/* ── Date Range ────────────────────────────────── */}
          {section("Monitoring Date Range", <>
            <div className="grid grid-cols-2 gap-3">
              {field("Start Date", "start_date", "date")}
              {field("End Date", "end_date", "date")}
            </div>
          </>)}

          {/* ── Bot Behavior ──────────────────────────────── */}
          {section("Bot Behavior", <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Check Interval (seconds)
                </label>
                <input
                  type="number" min="30" max="300"
                  value={settings["check_interval"] || "60"}
                  onChange={(e) => set("check_interval", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Months to Monitor
                </label>
                <input
                  type="number" min="1" max="6"
                  value={settings["months_to_monitor"] || "2"}
                  onChange={(e) => set("months_to_monitor", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                CAPTCHA Wait Time (seconds)
              </label>
              <input
                type="number" min="15" max="300"
                value={settings["captcha_wait_seconds"] || "60"}
                onChange={(e) => set("captcha_wait_seconds", e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">
                How long the bot pauses for you to solve CAPTCHA manually in the browser
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 border border-slate-100">
              {toggle_row("Stealth Mode", "stealth_mode", "Human-like random delays between actions")}
              {toggle_row("Auto Book", "auto_book", "Automatically book the slot when found")}
              {toggle_row("Auto Click Next", "auto_click_next", "Click Next button automatically")}
              {toggle_row("Auto Click Confirm", "auto_click_confirm", "Click Confirm button automatically")}
            </div>
          </>)}

          {/* ── Gmail Notifications ───────────────────────── */}
          {section("Gmail Email Notifications", <>
            <div className="bg-slate-50 rounded-xl px-4 border border-slate-100">
              {toggle_row("Enable Email Alerts", "email_enabled", "Receive email when slot is found, booked, or CAPTCHA appears")}
            </div>

            {field("Your Gmail Address (Sender)", "gmail_sender", "email", "yourname@gmail.com")}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Gmail App Password
              </label>
              <div className="relative">
                <input
                  type={showAppPass ? "text" : "password"}
                  value={settings["gmail_app_password"] || ""}
                  onChange={(e) => set("gmail_app_password", e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className={inputClass + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowAppPass(!showAppPass)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showAppPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {field("Recipient Email (Send Alerts To)", "gmail_recipient", "email", "yourname@gmail.com")}

            {/* How-to hint */}
            <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 space-y-1">
                <p className="font-semibold">How to get a Gmail App Password:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                  <li>Go to <strong>myaccount.google.com</strong></li>
                  <li>Security → Enable <strong>2-Step Verification</strong></li>
                  <li>Security → <strong>App Passwords</strong></li>
                  <li>Create one for "Mail" and paste it above</li>
                </ol>
                <p className="text-blue-500 pt-1">Sender and recipient can be the same Gmail address.</p>
              </div>
            </div>
          </>)}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
