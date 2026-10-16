import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Client {
  id?: number;
  name: string;
  passport: string;
  visa: string;
  mobile: string;
  email: string;
  priority: string;
  is_active: boolean;
}

interface Props {
  client?: Client | null;
  onClose: () => void;
  onSave: (data: Client) => void;
}

const empty: Client = {
  name: "",
  passport: "",
  visa: "",
  mobile: "",
  email: "",
  priority: "normal",
  is_active: true,
};

export default function ClientModal({ client, onClose, onSave }: Props) {
  const [form, setForm] = useState<Client>(empty);

  useEffect(() => {
    setForm(client ? { ...client } : empty);
  }, [client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-300 transition";

  const field = (label: string, name: keyof Client, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={form[name] as string}
        onChange={handleChange}
        placeholder={placeholder}
        required
        className={inputClass}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-gray-800">
              {client ? "Edit Client" : "Add New Client"}
            </h2>
            <p className="text-xs text-gray-400">Fill in the client's visa details</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {field("Full Name", "name", "text", "e.g. John Doe")}
          {field("Passport Number", "passport", "text", "e.g. SW6805761")}
          {field("Visa Reference Number", "visa", "text", "e.g. 382025529624")}
          {field("Mobile (with country code)", "mobile", "text", "e.g. 00923155811112")}
          {field("Email Address", "email", "email", "e.g. john@email.com")}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="urgent">Urgent</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <span className="text-sm font-medium text-gray-600">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-gray-500 hover:bg-slate-50 font-medium transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold text-sm shadow-sm transition"
            >
              {client ? "Save Changes" : "Add Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
