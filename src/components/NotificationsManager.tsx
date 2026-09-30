"use client";

import { Bell, CheckCircle2, AlertTriangle, CreditCard, PiggyBank } from "lucide-react";
import Link from "next/link";

interface NotificationsManagerProps {
  notifications: any[];
}

export function NotificationsManager({ notifications }: NotificationsManagerProps) {
  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Central de Notificações
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Alertas de vencimento de faturas, contas próximas e avisos de limites de orçamento.
        </p>
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl glass-panel flex items-start gap-3.5 shadow-sm border transition-all ${
                !n.isRead ? "border-emerald-500/40" : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === "statement_closing"
                    ? "bg-indigo-500/10 text-indigo-500"
                    : n.type === "budget_alert"
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-emerald-500/10 text-emerald-500"
                }`}
              >
                {n.type === "statement_closing" ? (
                  <CreditCard className="w-5 h-5" />
                ) : n.type === "budget_alert" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {n.title}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {n.message}
                </p>

                {n.link && (
                  <Link
                    href={n.link}
                    className="inline-block mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Ver detalhes →
                  </Link>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center glass-panel rounded-3xl space-y-2">
            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Nenhuma notificação pendente
            </p>
            <p className="text-xs text-slate-400">
              Você está em dia com todas as suas faturas e limites orçamentários.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
