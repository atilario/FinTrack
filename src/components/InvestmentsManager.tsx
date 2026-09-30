"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Plus, PieChart as PieIcon, ShieldCheck, X } from "lucide-react";
import { formatMoney, fromCents } from "@/lib/money";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { createInvestment } from "@/app/actions/finance";
import { useToast } from "./ToastProvider";

interface InvestmentsManagerProps {
  user: {
    id: string;
    primaryCurrency: string;
  };
  investments: any[];
}

export function InvestmentsManager({ user, investments }: InvestmentsManagerProps) {
  const { success, error } = useToast();
  const [openModal, setOpenModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState("fixed_income");
  const [institution, setInstitution] = useState("");
  const [totalInvested, setTotalInvested] = useState("");
  const [currentValue, setCurrentValue] = useState("");

  const summary = useMemo(() => {
    let invested = 0;
    let current = 0;
    for (const inv of investments) {
      invested += inv.totalInvestedCents;
      current += inv.currentValueCents;
    }
    const profit = current - invested;
    const yieldPct = invested > 0 ? (profit / invested) * 100 : 0;
    return { invested, current, profit, yieldPct };
  }, [investments]);

  // Chart allocation
  const allocationData = useMemo(() => {
    const map: Record<string, number> = {};
    const typeNames: Record<string, string> = {
      fixed_income: "Renda Fixa",
      stocks: "Ações",
      reits: "FIIs",
      crypto: "Cripto",
      funds: "Fundos",
      other: "Outros",
    };
    const colors = ["#10B981", "#6366F1", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6"];

    for (const inv of investments) {
      const label = typeNames[inv.type] || "Outros";
      map[label] = (map[label] || 0) + fromCents(inv.currentValueCents);
    }

    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [investments]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !totalInvested) return;
    try {
      await createInvestment({
        name: name.trim(),
        type,
        institution: institution.trim() || "Corretora",
        quantity: "1",
        averagePrice: totalInvested,
        totalInvested,
        currentValue: currentValue || totalInvested,
      });
      success("Ativo de investimento registrado com sucesso!");
      setOpenModal(false);
      setName("");
      setTotalInvested("");
      setCurrentValue("");
      window.location.reload();
    } catch {
      error("Erro ao registrar investimento.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Carteira de Investimentos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhe patrimônio investido, rentabilidade e alocação por classes de ativos.
          </p>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Ativo
        </button>
      </div>

      {/* Summary Hero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl glass-panel">
          <span className="text-xs text-slate-500 font-medium">Total Investido</span>
          <span className="block text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatMoney(summary.invested, user.primaryCurrency)}
          </span>
        </div>

        <div className="p-5 rounded-3xl glass-panel">
          <span className="text-xs text-slate-500 font-medium">Valor Atual</span>
          <span className="block text-2xl font-bold text-emerald-500 mt-1">
            {formatMoney(summary.current, user.primaryCurrency)}
          </span>
        </div>

        <div className="p-5 rounded-3xl glass-panel">
          <span className="text-xs text-slate-500 font-medium">Rentabilidade Global</span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                summary.profit >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {summary.yieldPct >= 0 ? "+" : ""}
              {summary.yieldPct.toFixed(2)}%
            </span>
            <span className="text-xs text-slate-400">
              ({formatMoney(summary.profit, user.primaryCurrency)})
            </span>
          </div>
        </div>
      </div>

      {/* Allocation Chart & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation */}
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-500" />
            Alocação por Tipo
          </h2>

          {allocationData.length > 0 ? (
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`all-${index}`} fill={entry.color} />
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
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              Nenhum ativo cadastrado.
            </div>
          )}
        </div>

        {/* Investment Items Table */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-panel space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Posição dos Ativos
          </h2>

          <div className="space-y-3">
            {investments.map((inv) => {
              const profit = inv.currentValueCents - inv.totalInvestedCents;
              const yieldPct = inv.totalInvestedCents > 0 ? (profit / inv.totalInvestedCents) * 100 : 0;

              return (
                <div
                  key={inv.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shadow-sm"
                >
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white block">
                      {inv.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {inv.institution} • Quantidade: {inv.quantity}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-sm text-slate-900 dark:text-white block">
                      {formatMoney(inv.currentValueCents, inv.currency || user.primaryCurrency)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        profit >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {yieldPct >= 0 ? "+" : ""}
                      {yieldPct.toFixed(1)}% ({formatMoney(profit, user.primaryCurrency)})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL NOVO ATIVO */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Adicionar Ativo de Investimento
              </h3>
              <button onClick={() => setOpenModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nome do Ativo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Tesouro Selic, PETR4, Bitcoin..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="fixed_income">Renda Fixa</option>
                    <option value="stocks">Ações</option>
                    <option value="reits">FIIs</option>
                    <option value="crypto">Criptomoedas</option>
                    <option value="etfs">ETFs</option>
                    <option value="funds">Fundos</option>
                    <option value="other">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Instituição / Corretora
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Ex: XP, Nubank..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Total Aportado (R$)
                  </label>
                  <input
                    type="text"
                    value={totalInvested}
                    onChange={(e) => setTotalInvested(e.target.value)}
                    placeholder="Ex: 5000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Valor Atual (R$)
                  </label>
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="Ex: 5400"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors mt-2"
              >
                Salvar Investimento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
