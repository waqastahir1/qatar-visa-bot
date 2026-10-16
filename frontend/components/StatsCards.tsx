import { Users, CheckCircle, Clock, Activity } from "lucide-react";

interface Props {
  totalClients: number;
  bookedClients: number;
  waitingClients: number;
  botStatus: string;
}

export default function StatsCards({ totalClients, bookedClients, waitingClients, botStatus }: Props) {
  const cards = [
    {
      label: "Total Clients",
      value: totalClients,
      icon: <Users className="w-5 h-5" />,
      iconBg: "bg-blue-100 text-blue-600",
      value_color: "text-blue-700",
      border: "border-blue-100",
    },
    {
      label: "Booked",
      value: bookedClients,
      icon: <CheckCircle className="w-5 h-5" />,
      iconBg: "bg-emerald-100 text-emerald-600",
      value_color: "text-emerald-700",
      border: "border-emerald-100",
    },
    {
      label: "Waiting",
      value: waitingClients,
      icon: <Clock className="w-5 h-5" />,
      iconBg: "bg-amber-100 text-amber-600",
      value_color: "text-amber-700",
      border: "border-amber-100",
    },
    {
      label: "Bot Status",
      value: botStatus === "running" ? "Running" : "Stopped",
      icon: <Activity className="w-5 h-5" />,
      iconBg: botStatus === "running" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400",
      value_color: botStatus === "running" ? "text-emerald-700" : "text-slate-500",
      border: botStatus === "running" ? "border-emerald-100" : "border-slate-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white rounded-2xl border ${card.border} shadow-sm p-5 flex items-center gap-4`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg} shrink-0`}>
            {card.icon}
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">{card.label}</p>
            <p className={`text-2xl font-bold ${card.value_color}`}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
