import { Pencil, Trash2, Plus, AlertCircle, CheckCircle2, Clock } from "lucide-react";

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

interface Props {
  clients: Client[];
  onAdd: () => void;
  onEdit: (c: Client) => void;
  onDelete: (id: number) => void;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "booked":
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
          <CheckCircle2 className="w-3 h-3" /> Booked
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-medium">
          <AlertCircle className="w-3 h-3" /> Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
          <Clock className="w-3 h-3" /> Waiting
        </span>
      );
  }
};

const priorityBadge = (priority: string) => (
  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
    priority === "urgent"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-slate-100 text-slate-500 border-slate-200"
  }`}>
    {priority === "urgent" ? "Urgent" : "Normal"}
  </span>
);

export default function ClientTable({ clients, onAdd, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="font-semibold text-gray-800">Clients</h2>
          <p className="text-xs text-gray-400">{clients.length} total</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm rounded-xl font-medium shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Table */}
      {clients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Plus className="w-7 h-7 text-slate-400" />
          </div>
          <p className="font-medium text-gray-500">No clients yet</p>
          <p className="text-sm mt-1">Add your first client to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-3 text-left font-semibold">Name</th>
                <th className="px-6 py-3 text-left font-semibold">Passport</th>
                <th className="px-6 py-3 text-left font-semibold">Visa Ref</th>
                <th className="px-6 py-3 text-left font-semibold">Priority</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-6 py-3 text-left font-semibold">Booked Slot</th>
                <th className="px-6 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className={`hover:bg-slate-50 transition ${!c.is_active ? "opacity-40" : ""}`}
                >
                  <td className="px-6 py-4 font-semibold text-gray-800">{c.name}</td>
                  <td className="px-6 py-4 font-mono text-gray-600 text-xs">{c.passport}</td>
                  <td className="px-6 py-4 font-mono text-gray-400 text-xs">{c.visa}</td>
                  <td className="px-6 py-4">{priorityBadge(c.priority)}</td>
                  <td className="px-6 py-4">{statusBadge(c.status)}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {c.booked_date ? `${c.booked_date} ${c.booked_time || ""}` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onEdit(c)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
