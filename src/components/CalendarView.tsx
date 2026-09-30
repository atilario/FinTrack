"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Repeat,
} from "lucide-react";
import { formatMoney } from "@/lib/money";

interface CalendarViewProps {
  user: {
    id: string;
    primaryCurrency: string;
  };
  transactions: any[];
  recurring: any[];
  cards: any[];
}

export function CalendarView({
  user,
  transactions,
  recurring,
  cards,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 to 11

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0: Sun, 1: Mon...

  // Map movements by day of the month
  const movementsByDay = useMemo(() => {
    const map: Record<number, { transactions: any[]; recurring: any[]; cardEvents: any[] }> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      map[d] = { transactions: [], recurring: [], cardEvents: [] };
    }

    const monthStr = String(month + 1).padStart(2, "0");
    const prefix = `${year}-${monthStr}`;

    // 1. Transactions
    for (const tx of transactions) {
      if (tx.date.startsWith(prefix)) {
        const day = parseInt(tx.date.split("-")[2], 10);
        if (map[day]) {
          map[day].transactions.push(tx);
        }
      }
    }

    // 2. Recurring bills
    for (const r of recurring) {
      if (r.isActive && r.billingDay <= daysInMonth) {
        map[r.billingDay]?.recurring.push(r);
      }
    }

    // 3. Card due & closing days
    for (const c of cards) {
      if (c.dueDay <= daysInMonth) {
        map[c.dueDay]?.cardEvents.push({ type: "due", name: c.name });
      }
      if (c.closingDay <= daysInMonth) {
        map[c.closingDay]?.cardEvents.push({ type: "closing", name: c.name });
      }
    }

    return map;
  }, [year, month, daysInMonth, transactions, recurring, cards]);

  const selectedDayItems = selectedDay ? movementsByDay[selectedDay] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Calendário Financeiro
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Visualize vencimentos de contas, parcelas, faturas e recebimentos ao longo do mês.
          </p>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 px-3 min-w-[130px] text-center select-none">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-panel space-y-4 shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Empty slots for offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 sm:h-20 rounded-2xl bg-transparent" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const info = movementsByDay[day];
              const isSelected = selectedDay === day;

              const hasIncome = info?.transactions.some((t) => t.type === "income");
              const hasExpense = info?.transactions.some((t) => t.type === "expense");
              const hasRecurring = info?.recurring.length > 0;
              const hasCard = info?.cardEvents.length > 0;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-2xl flex flex-col justify-between items-start border transition-all text-left ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm"
                      : "border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      isSelected
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {day}
                  </span>

                  {/* Indicators */}
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {hasIncome && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Receita" />}
                    {hasExpense && <span className="w-2 h-2 rounded-full bg-rose-500" title="Despesa" />}
                    {hasRecurring && <span className="w-2 h-2 rounded-full bg-amber-500" title="Recorrência" />}
                    {hasCard && <span className="w-2 h-2 rounded-full bg-indigo-500" title="Cartão" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="p-6 rounded-3xl glass-panel space-y-4 shadow-sm self-start">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-500" />
              Dia {selectedDay} de {monthNames[month]}
            </h2>
            <span className="text-[11px] text-slate-400">
              {(selectedDayItems?.transactions.length || 0) +
                (selectedDayItems?.recurring.length || 0) +
                (selectedDayItems?.cardEvents.length || 0)}{" "}
              eventos
            </span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {/* Transactions on day */}
            {selectedDayItems?.transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  {tx.type === "income" ? (
                    <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-rose-500" />
                  )}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {tx.description}
                  </span>
                </div>
                <span
                  className={`font-bold ${
                    tx.type === "income" ? "text-emerald-500" : "text-slate-900 dark:text-white"
                  }`}
                >
                  {tx.type === "income" ? "+" : "−"}
                  {formatMoney(tx.amountCents, user.primaryCurrency)}
                </span>
              </div>
            ))}

            {/* Recurring bills on day */}
            {selectedDayItems?.recurring.map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      {rec.description}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      Recorrente ({rec.frequency})
                    </span>
                  </div>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatMoney(rec.amountCents, user.primaryCurrency)}
                </span>
              </div>
            ))}

            {/* Card events on day */}
            {selectedDayItems?.cardEvents.map((evt, idx) => (
              <div
                key={`ce-${idx}`}
                className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 font-semibold"
              >
                <CreditCard className="w-4 h-4 text-indigo-500" />
                <span>
                  {evt.type === "due"
                    ? `Vencimento fatura ${evt.name}`
                    : `Fechamento fatura ${evt.name}`}
                </span>
              </div>
            ))}

            {(!selectedDayItems ||
              (selectedDayItems.transactions.length === 0 &&
                selectedDayItems.recurring.length === 0 &&
                selectedDayItems.cardEvents.length === 0)) && (
              <p className="text-center text-xs text-slate-400 py-6">
                Nenhum lançamento ou vencimento previsto para este dia.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
