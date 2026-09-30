"use client";

import { useState, useMemo } from "react";
import {
  Download,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  CreditCard,
  Printer,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatMoney, fromCents } from "@/lib/money";
import { useToast } from "./ToastProvider";

interface ReportsViewProps {
  user: {
    id: string;
    name: string;
    primaryCurrency: string;
  };
  transactions: any[];
  categories: any[];
  accounts: any[];
  investments: any[];
}

export function ReportsView({
  user,
  transactions,
  categories,
  accounts,
  investments,
}: ReportsViewProps) {
  const { success } = useToast();
  const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "year">("month");

  // Filtered transactions based on period
  const filteredTxs = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentYearStr = `${now.getFullYear()}`;

    if (periodFilter === "month") {
      return transactions.filter((t) => t.date.startsWith(currentMonthStr));
    }
    if (periodFilter === "year") {
      return transactions.filter((t) => t.date.startsWith(currentYearStr));
    }
    return transactions;
  }, [transactions, periodFilter]);

  // Total expense in period
  const totalExpenseCents = useMemo(() => {
    return filteredTxs
      .filter((t) => t.type === "expense" && !t.isCardBillPayment)
      .reduce((sum, t) => sum + t.amountCents, 0);
  }, [filteredTxs]);

  // Total income in period
  const totalIncomeCents = useMemo(() => {
    return filteredTxs
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amountCents, 0);
  }, [filteredTxs]);

  // Expenses by category
  const categoryStats = useMemo(() => {
    const map: Record<string, { name: string; amountCents: number; color: string }> = {};

    for (const tx of filteredTxs) {
      if (tx.type !== "expense" || tx.isCardBillPayment) continue;
      const cat = categories.find((c) => c.id === tx.categoryId);
      const name = cat?.name || "Outros";
      const color = cat?.color || "#94A3B8";

      if (!map[name]) {
        map[name] = { name, amountCents: 0, color };
      }
      map[name].amountCents += tx.amountCents;
    }

    return Object.values(map)
      .map((item) => ({
        ...item,
        value: fromCents(item.amountCents),
        percentage: totalExpenseCents > 0 ? Math.round((item.amountCents / totalExpenseCents) * 100) : 0,
      }))
      .sort((a, b) => b.amountCents - a.amountCents);
  }, [filteredTxs, categories, totalExpenseCents]);

  // Payment methods breakdown
  const paymentMethodStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of filteredTxs) {
      if (tx.type === "transfer") continue;
      const method = tx.paymentMethod || "outros";
      map[method] = (map[method] || 0) + tx.amountCents;
    }

    return Object.entries(map).map(([name, amountCents]) => ({
      name: name.toUpperCase(),
      Valor: fromCents(amountCents),
    }));
  }, [filteredTxs]);

  // Export handlers
  const handleExportCSV = () => {
    const headers = ["Data", "Tipo", "Descricao", "Valor_Centavos", "Moeda", "Categoria", "Forma_Pagamento"];
    const rows = filteredTxs.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId)?.name || "Sem categoria";
      return [
        t.date,
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amountCents,
        t.originalCurrency || user.primaryCurrency,
        `"${cat}"`,
        t.paymentMethod,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `fintrack-relatorio-${periodFilter}.csv`;
    link.click();
    success("Relatório CSV exportado com sucesso!");
  };

  const handleExportJSON = () => {
    const data = {
      user: { name: user.name, currency: user.primaryCurrency },
      period: periodFilter,
      totalIncomeCents,
      totalExpenseCents,
      transactions: filteredTxs,
      categoryStats,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `fintrack-relatorio-${periodFilter}.json`;
    link.click();
    success("Relatório JSON exportado com sucesso!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Relatórios Financeiros
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Análises profundas de distribuição, meios de pagamento e exportação.
          </p>
        </div>

        {/* Filter & Export */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => setPeriodFilter("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodFilter === "month"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setPeriodFilter("year")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodFilter === "year"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Ano Atual
            </button>
            <button
              onClick={() => setPeriodFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Todo Período
            </button>
          </div>

          {/* Export buttons */}
          <button
            onClick={handleExportCSV}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="Exportar CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="Exportar JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Top Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-panel">
          <span className="text-xs text-slate-500 font-medium">Total de Entradas</span>
          <span className="block text-2xl font-bold text-emerald-500 mt-1">
            +{formatMoney(totalIncomeCents, user.primaryCurrency)}
          </span>
        </div>
        <div className="p-5 rounded-2xl glass-panel">
          <span className="text-xs text-slate-500 font-medium">Total de Saídas</span>
          <span className="block text-2xl font-bold text-rose-500 mt-1">
            −{formatMoney(totalExpenseCents, user.primaryCurrency)}
          </span>
        </div>
        <div className="p-5 rounded-2xl glass-panel">
          <span className="text-xs text-slate-500 font-medium">Saldo Líquido</span>
          <span
            className={`block text-2xl font-bold mt-1 ${
              totalIncomeCents - totalExpenseCents >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {formatMoney(totalIncomeCents - totalExpenseCents, user.primaryCurrency)}
          </span>
        </div>
      </div>

      {/* Detailed Category Distribution Chart & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-500" />
            Distribuição por Categorias
          </h2>

          {categoryStats.length > 0 ? (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`rep-cat-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [
                      formatMoney(Math.round(Number(val) * 100), user.primaryCurrency),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Sem dados de despesas neste período.
            </div>
          )}
        </div>

        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Tabela de Participação
          </h2>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {categoryStats.map((cat) => (
              <div
                key={cat.name}
                className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {cat.percentage}% do total gasto
                    </span>
                  </div>
                </div>

                <span className="font-bold text-slate-900 dark:text-white">
                  {formatMoney(cat.amountCents, user.primaryCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods Bar Chart */}
      <div className="p-6 rounded-3xl glass-panel space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-500" />
          Gastos por Meio de Pagamento
        </h2>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paymentMethodStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
              <YAxis fontSize={11} stroke="#94A3B8" />
              <Tooltip
                formatter={(val: any) => [
                  formatMoney(Math.round(Number(val) * 100), user.primaryCurrency),
                ]}
              />
              <Bar dataKey="Valor" fill="#6366F1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
