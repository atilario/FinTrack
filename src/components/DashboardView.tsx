"use client";

import { useState, useMemo } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Plus,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Percent,
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
  Legend,
} from "recharts";
import { formatMoney, fromCents } from "@/lib/money";
import {
  calculateFinancialSummary,
  calculateCreditCardUsage,
} from "@/lib/finance";
import Link from "next/link";
import { populateUserWithDemoData } from "@/app/actions/finance";
import { useToast } from "./ToastProvider";

interface DashboardViewProps {
  user: {
    id: string;
    name: string;
    primaryCurrency: string;
  };
  accounts: any[];
  cards: any[];
  categories: any[];
  transactions: any[];
  investments: any[];
  recurring: any[];
  goals: any[];
  onOpenQuickAdd: () => void;
}

export function DashboardView({
  user,
  accounts,
  cards,
  categories,
  transactions,
  investments,
  recurring,
  goals,
  onOpenQuickAdd,
}: DashboardViewProps) {
  const { success, error } = useToast();
  const [loadingSeed, setLoadingSeed] = useState(false);

  // Period state: current month by default
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0 to 11

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Filter transactions for the selected month
  const periodTransactions = useMemo(() => {
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const prefix = `${currentYear}-${monthStr}`;
    return transactions.filter((t) => t.date.startsWith(prefix));
  }, [transactions, currentYear, currentMonth]);

  // Financial summary
  const summary = useMemo(() => {
    return calculateFinancialSummary({
      accounts,
      transactions: periodTransactions,
      investments,
      creditCards: cards,
    });
  }, [accounts, periodTransactions, investments, cards]);

  // Overall account balances (all time up to today)
  const allTimeSummary = useMemo(() => {
    return calculateFinancialSummary({
      accounts,
      transactions,
      investments,
      creditCards: cards,
    });
  }, [accounts, transactions, investments, cards]);

  // Category breakdown for Pie Chart
  const categoryChartData = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {};

    for (const tx of periodTransactions) {
      if (tx.type !== "expense" || tx.isCardBillPayment) continue;
      const cat = categories.find((c) => c.id === tx.categoryId);
      const catName = cat?.name || "Outros";
      const catColor = cat?.color || "#94A3B8";

      if (!map[catName]) {
        map[catName] = { name: catName, value: 0, color: catColor };
      }
      map[catName].value += fromCents(tx.amountCents);
    }

    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [periodTransactions, categories]);

  // Cash flow comparative chart
  const cashFlowChartData = useMemo(() => {
    return [
      {
        name: `${monthNames[currentMonth]} ${currentYear}`,
        Receitas: fromCents(summary.totalIncomeCents),
        Despesas: fromCents(summary.totalExpenseCents),
      },
    ];
  }, [monthNames, currentMonth, currentYear, summary]);

  // Fixed vs Variable proportion
  const fixedVariableData = useMemo(() => {
    const fixed = fromCents(summary.fixedExpenseCents);
    const variable = fromCents(summary.variableExpenseCents);
    if (fixed === 0 && variable === 0) return [];
    return [
      { name: "Gastos Fixos", value: fixed, color: "#6366F1" },
      { name: "Gastos Variáveis", value: variable, color: "#EC4899" },
    ];
  }, [summary]);

  // Upcoming bills from recurring transactions
  const upcomingBills = useMemo(() => {
    return recurring.filter((r) => r.isActive).slice(0, 4);
  }, [recurring]);

  const handleSeedDemo = async () => {
    try {
      setLoadingSeed(true);
      await populateUserWithDemoData();
      success("Dados demonstrativos carregados com sucesso!");
    } catch (err: any) {
      error("Erro ao carregar dados de demonstração.");
    } finally {
      setLoadingSeed(false);
    }
  };

  const hasData = transactions.length > 0 || accounts.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* --- TOP HEADER & PERIOD PICKER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Olá, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Confira a visão geral das suas finanças neste mês.
          </p>
        </div>

        {/* Period navigator */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 px-3 min-w-[130px] text-center select-none">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* --- EMPTY STATE HELPER IF NO DATA --- */}
      {!hasData && (
        <div className="p-6 rounded-3xl glass-panel border border-emerald-500/30 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Bem-vindo ao FinTrack!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Comece lançando seu primeiro gasto ou gere dados fictícios realistas com 1 clique para explorar todos os recursos do aplicativo.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenQuickAdd}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              Adicionar primeira transação
            </button>
            <button
              onClick={handleSeedDemo}
              disabled={loadingSeed}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-2"
            >
              {loadingSeed ? "Carregando..." : "Carregar Dados de Demonstração"}
            </button>
          </div>
        </div>
      )}

      {/* --- 1. RESUMO FINANCEIRO (HERO CARDS) --- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Saldo Disponível */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl p-4 glass-panel flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Saldo Disponível
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatMoney(allTimeSummary.totalAvailableBalanceCents, user.primaryCurrency)}
            </span>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              {accounts.length} contas cadastradas
            </span>
          </div>
        </div>

        {/* Receitas */}
        <div className="rounded-2xl p-4 glass-panel flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Receitas do Mês
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              +{formatMoney(summary.totalIncomeCents, user.primaryCurrency)}
            </span>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              Entradas no período
            </span>
          </div>
        </div>

        {/* Despesas */}
        <div className="rounded-2xl p-4 glass-panel flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Despesas do Mês
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              −{formatMoney(summary.totalExpenseCents, user.primaryCurrency)}
            </span>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              Saídas no período
            </span>
          </div>
        </div>

        {/* Investimentos */}
        <div className="rounded-2xl p-4 glass-panel flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Investimentos
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {formatMoney(allTimeSummary.totalInvestmentValueCents, user.primaryCurrency)}
            </span>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              Rentabilidade:{" "}
              <strong className={allTimeSummary.investmentProfitCents >= 0 ? "text-emerald-500" : "text-rose-500"}>
                {allTimeSummary.investmentYieldPercent.toFixed(1)}%
              </strong>
            </span>
          </div>
        </div>

        {/* Patrimônio Líquido */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex flex-col justify-between shadow-md shadow-emerald-900/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-100">
              Patrimônio Líquido
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-black tracking-tight">
              {formatMoney(allTimeSummary.netWorthCents, user.primaryCurrency)}
            </span>
            <span className="block text-[11px] text-emerald-200 mt-0.5">
              Contas + Investimentos
            </span>
          </div>
        </div>
      </div>

      {/* --- 2. GRÁFICOS DO DASHBOARD (SEÇÃO 7) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Gastos por Categoria (Donut) */}
        <div className="rounded-3xl p-5 glass-panel flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Gastos por Categoria
            </h2>
            <Link
              href="/reports"
              className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            >
              Ver relatório
            </Link>
          </div>

          {categoryChartData.length > 0 ? (
            <div className="space-y-4">
              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [
                        formatMoney(Math.round(Number(val) * 100), user.primaryCurrency),
                        "Total",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* List top categories */}
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {categoryChartData.slice(0, 5).map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatMoney(Math.round(item.value * 100), user.primaryCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
              <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
              Nenhuma despesa registrada neste mês.
            </div>
          )}
        </div>

        {/* Gráfico 2: Receitas x Despesas (Bar Chart) */}
        <div className="rounded-3xl p-5 glass-panel flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              Receitas x Despesas
            </h2>
            <span className="text-xs text-slate-400">Fluxo Mensal</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                <YAxis fontSize={11} stroke="#94A3B8" />
                <Tooltip
                  formatter={(val: any) => [
                    formatMoney(Math.round(Number(val) * 100), user.primaryCurrency),
                  ]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="Receitas" fill="#10B981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Despesas" fill="#F43F5E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Saldo Líquido do Mês:</span>
            <span
              className={`font-bold ${
                summary.totalIncomeCents - summary.totalExpenseCents >= 0
                  ? "text-emerald-500"
                  : "text-rose-500"
              }`}
            >
              {formatMoney(
                summary.totalIncomeCents - summary.totalExpenseCents,
                user.primaryCurrency
              )}
            </span>
          </div>
        </div>

        {/* Gráfico 3: Fixos x Variáveis (Proporção) */}
        <div className="rounded-3xl p-5 glass-panel flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Gastos Fixos x Variáveis
            </h2>
            <span className="text-xs text-slate-400">Estrutura de Gastos</span>
          </div>

          {fixedVariableData.length > 0 ? (
            <div className="space-y-4">
              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fixedVariableData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {fixedVariableData.map((entry, index) => (
                        <Cell key={`fv-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [
                        formatMoney(Math.round(Number(val) * 100), user.primaryCurrency),
                        "Total",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50">
                  <span className="block text-indigo-600 dark:text-indigo-400 font-semibold">
                    Fixos (Essenciais)
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">
                    {formatMoney(summary.fixedExpenseCents, user.primaryCurrency)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/50">
                  <span className="block text-pink-600 dark:text-pink-400 font-semibold">
                    Variáveis (Livres)
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">
                    {formatMoney(summary.variableExpenseCents, user.primaryCurrency)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
              Sem dados de despesas para comparar.
            </div>
          )}
        </div>
      </div>

      {/* --- 3. SEÇÃO INFERIOR: CARTÕES & PRÓXIMOS PAGAMENTOS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cartões de Crédito */}
        <div className="rounded-3xl p-5 glass-panel space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              Cartões de Crédito
            </h2>
            <Link
              href="/cards"
              className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            >
              Gerenciar cartões
            </Link>
          </div>

          {cards.length > 0 ? (
            <div className="space-y-4">
              {cards.map((card) => {
                const usage = calculateCreditCardUsage(card, transactions);
                return (
                  <div
                    key={card.id}
                    className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm">{card.name}</span>
                        <span className="block text-[10px] text-slate-300">
                          •••• {card.lastFourDigits || "0000"} | Vence dia {card.dueDay}
                        </span>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10">
                        {card.brand}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Fatura / Utilizado: {formatMoney(usage.usedLimitCents, card.currency)}</span>
                        <span>Disponível: {formatMoney(usage.availableLimitCents, card.currency)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usage.usagePercentage > 85 ? "bg-rose-500" : "bg-emerald-400"
                          }`}
                          style={{ width: `${usage.usagePercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Limite Total: {formatMoney(card.limitCents, card.currency)}</span>
                      <span>{usage.usagePercentage}% em uso</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhum cartão de crédito cadastrado.
            </div>
          )}
        </div>

        {/* Próximos Pagamentos e Recorrências */}
        <div className="rounded-3xl p-5 glass-panel space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Próximos Pagamentos & Contas
            </h2>
            <Link
              href="/planning"
              className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            >
              Ver todas
            </Link>
          </div>

          {upcomingBills.length > 0 ? (
            <div className="space-y-2.5">
              {upcomingBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-xs shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        bill.type === "expense"
                          ? "bg-rose-500/10 text-rose-500"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {bill.billingDay}º
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {bill.description}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {bill.frequency} • Dia {bill.billingDay}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`font-bold ${
                      bill.type === "expense"
                        ? "text-slate-900 dark:text-white"
                        : "text-emerald-500"
                    }`}
                  >
                    {bill.type === "expense" ? "−" : "+"}
                    {formatMoney(bill.amountCents, bill.currency || user.primaryCurrency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhuma despesa ou receita recorrente cadastrada.
            </div>
          )}
        </div>
      </div>

      {/* --- 4. TRANSAÇÕES RECENTES --- */}
      <div className="rounded-3xl p-5 glass-panel space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Transações Recentes
          </h2>
          <Link
            href="/transactions"
            className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
          >
            Ver todas ({transactions.length})
          </Link>
        </div>

        {periodTransactions.length > 0 ? (
          <div className="space-y-2">
            {periodTransactions.slice(0, 6).map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-xs transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === "income"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : tx.type === "transfer"
                          ? "bg-sky-500/10 text-sky-500"
                          : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {tx.type === "income" ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : tx.type === "transfer" ? (
                        <ArrowRightLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {tx.description}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {cat?.name || "Sem categoria"} • {tx.date}
                        {tx.originalCurrency && tx.originalCurrency !== user.primaryCurrency && (
                          <span className="ml-1 text-slate-400">
                            ({formatMoney(tx.originalAmountCents, tx.originalCurrency)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`font-bold ${
                      tx.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : tx.type === "transfer"
                        ? "text-sky-600 dark:text-sky-400"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : ""}
                    {formatMoney(tx.amountCents, user.primaryCurrency)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhuma transação no período selecionado.
          </div>
        )}
      </div>
    </div>
  );
}
