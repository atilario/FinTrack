"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Plus, PieChart as PieIcon, ShieldCheck, X, Edit2, Trash2, ArrowUpRight, DollarSign, RefreshCw } from "lucide-react";
import { formatMoney, fromCents, toCents } from "@/lib/money";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  createInvestment,
  updateInvestment,
  contributeInvestment,
  updateInvestmentValue,
  deleteInvestment,
} from "@/app/actions/finance";
import { useToast } from "./ToastProvider";

interface InvestmentsManagerProps {
  user: {
    id: string;
    primaryCurrency: string;
  };
  investments: any[];
  accounts?: any[];
}

const TYPE_NAMES: Record<string, string> = {
  fixed_income: "Renda Fixa",
  stocks: "Ações",
  reits: "FIIs",
  crypto: "Criptomoedas",
  etfs: "ETFs",
  funds: "Fundos",
  other: "Outros",
};

export function InvestmentsManager({ user, investments, accounts = [] }: InvestmentsManagerProps) {
  const { success, error } = useToast();

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [openAporteModal, setOpenAporteModal] = useState(false);
  const [openUpdateValueModal, setOpenUpdateValueModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);

  // Selected item states
  const [selectedInv, setSelectedInv] = useState<any>(null);

  // New investment form states
  const [name, setName] = useState("");
  const [type, setType] = useState("fixed_income");
  const [institution, setInstitution] = useState("");
  const [totalInvested, setTotalInvested] = useState("");
  const [currentValue, setCurrentValue] = useState("");

  // Aporte form states
  const [aporteAmount, setAporteAmount] = useState("");
  const [aporteNewCurrentValue, setAporteNewCurrentValue] = useState("");
  const [aporteAccountId, setAporteAccountId] = useState(accounts[0]?.id || "");

  // Update value form states
  const [newCurrentValueInput, setNewCurrentValueInput] = useState("");

  // Edit form states
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("fixed_income");
  const [editInstitution, setEditInstitution] = useState("");
  const [editTotalInvested, setEditTotalInvested] = useState("");
  const [editCurrentValue, setEditCurrentValue] = useState("");

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
    const colors = ["#10B981", "#6366F1", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6"];

    for (const inv of investments) {
      const label = TYPE_NAMES[inv.type] || "Outros";
      map[label] = (map[label] || 0) + fromCents(inv.currentValueCents);
    }

    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [investments]);

  // Handlers
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

  const handleOpenAporte = (inv: any) => {
    setSelectedInv(inv);
    setAporteAmount("");
    setAporteNewCurrentValue("");
    setAporteAccountId(accounts[0]?.id || "");
    setOpenAporteModal(true);
  };

  const handleAporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv || !aporteAmount) return;
    try {
      await contributeInvestment({
        investmentId: selectedInv.id,
        contributionAmount: aporteAmount,
        newCurrentValue: aporteNewCurrentValue || undefined,
        accountId: aporteAccountId || undefined,
      });
      success(`Aporte no ativo "${selectedInv.name}" registrado com sucesso!`);
      setOpenAporteModal(false);
      setSelectedInv(null);
      window.location.reload();
    } catch (err: any) {
      error(err?.message || "Erro ao registrar aporte.");
    }
  };

  const handleOpenUpdateValue = (inv: any) => {
    setSelectedInv(inv);
    setNewCurrentValueInput(fromCents(inv.currentValueCents).toString());
    setOpenUpdateValueModal(true);
  };

  const handleUpdateValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv || !newCurrentValueInput) return;
    try {
      await updateInvestmentValue({
        investmentId: selectedInv.id,
        currentValue: newCurrentValueInput,
      });
      success(`Cotação de "${selectedInv.name}" atualizada!`);
      setOpenUpdateValueModal(false);
      setSelectedInv(null);
      window.location.reload();
    } catch (err: any) {
      error(err?.message || "Erro ao atualizar valor.");
    }
  };

  const handleOpenEdit = (inv: any) => {
    setSelectedInv(inv);
    setEditName(inv.name);
    setEditType(inv.type);
    setEditInstitution(inv.institution || "");
    setEditTotalInvested(fromCents(inv.totalInvestedCents).toString());
    setEditCurrentValue(fromCents(inv.currentValueCents).toString());
    setOpenEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv || !editName.trim() || !editTotalInvested) return;
    try {
      await updateInvestment(selectedInv.id, {
        name: editName.trim(),
        type: editType,
        institution: editInstitution.trim() || "Corretora",
        totalInvested: editTotalInvested,
        currentValue: editCurrentValue || editTotalInvested,
      });
      success("Ativo atualizado com sucesso!");
      setOpenEditModal(false);
      setSelectedInv(null);
      window.location.reload();
    } catch (err: any) {
      error(err?.message || "Erro ao atualizar investimento.");
    }
  };

  const handleDelete = async (inv: any) => {
    if (!confirm(`Tem certeza que deseja excluir o investimento "${inv.name}"?`)) return;
    try {
      await deleteInvestment(inv.id);
      success("Investimento excluído com sucesso.");
      window.location.reload();
    } catch (err: any) {
      error(err?.message || "Erro ao excluir investimento.");
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
            Acompanhe patrimônio investido, registre aportes, atualize cotações e veja a rentabilidade real.
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
          <span className="text-xs text-slate-500 font-medium">Valor Atual Total</span>
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
            Posição dos Ativos & Ações ({investments.length})
          </h2>

          {investments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              Nenhum investimento cadastrado ainda. Clique em "Novo Ativo" para começar a controlar sua carteira.
            </div>
          ) : (
            <div className="space-y-3">
              {investments.map((inv) => {
                const profit = inv.currentValueCents - inv.totalInvestedCents;
                const yieldPct = inv.totalInvestedCents > 0 ? (profit / inv.totalInvestedCents) * 100 : 0;

                return (
                  <div
                    key={inv.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 space-y-3 shadow-sm hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {inv.name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {TYPE_NAMES[inv.type] || inv.type}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {inv.institution} • Aportado: <strong>{formatMoney(inv.totalInvestedCents, inv.currency || user.primaryCurrency)}</strong>
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          Valor Atual
                        </span>
                        <span className="font-extrabold text-base text-slate-900 dark:text-white block">
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

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenAporte(inv)}
                          className="py-1 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Aportar Dinheiro
                        </button>

                        <button
                          onClick={() => handleOpenUpdateValue(inv)}
                          className="py-1 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition-colors flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Atualizar Saldo
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(inv)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                          title="Editar Investimento"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(inv)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Excluir Investimento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                  required
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
                    required
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

      {/* MODAL NOVO APORTE ("Coloquei mais esse dinheiro") */}
      {openAporteModal && selectedInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Aportar Dinheiro — {selectedInv.name}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Saldo atual: {formatMoney(selectedInv.currentValueCents, user.primaryCurrency)}
                </span>
              </div>
              <button onClick={() => setOpenAporteModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAporte} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Valor do Aporte (R$) *
                </label>
                <input
                  type="text"
                  value={aporteAmount}
                  onChange={(e) => setAporteAmount(e.target.value)}
                  placeholder="Ex: 500"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Novo Valor Total da Posição (opcional)
                </label>
                <input
                  type="text"
                  value={aporteNewCurrentValue}
                  onChange={(e) => setAporteNewCurrentValue(e.target.value)}
                  placeholder={`Se vazio, soma ${aporteAmount ? "R$ " + aporteAmount : "o aporte"} ao saldo atual`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Debitar de Conta Bancária (opcional)
                  </label>
                  <select
                    value={aporteAccountId}
                    onChange={(e) => setAporteAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Não debitar de conta cadastrada</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.institution})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 space-y-1">
                <div>✓ Incrementa o total aportado deste ativo.</div>
                <div>✓ Atualiza a posição patrimonial automaticamente.</div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
              >
                Confirmar Novo Aporte
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ATUALIZAR COTAÇÃO / SALDO ATUAL ("Atualmente está x valor") */}
      {openUpdateValueModal && selectedInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Atualizar Cotação / Saldo Atual
                </h3>
                <span className="text-[11px] text-slate-400">
                  {selectedInv.name} ({selectedInv.institution})
                </span>
              </div>
              <button onClick={() => setOpenUpdateValueModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateValue} className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Total Aportado:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatMoney(selectedInv.totalInvestedCents, user.primaryCurrency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Valor Gravado Anterior:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatMoney(selectedInv.currentValueCents, user.primaryCurrency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Novo Saldo Atual (R$) *
                </label>
                <input
                  type="text"
                  value={newCurrentValueInput}
                  onChange={(e) => setNewCurrentValueInput(e.target.value)}
                  placeholder="Ex: 5800"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-base font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
              >
                Salvar Novo Valor de Mercado
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ATIVO */}
      {openEditModal && selectedInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Editar Ativo — {selectedInv.name}
              </h3>
              <button onClick={() => setOpenEditModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nome do Ativo
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
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
                    Instituição
                  </label>
                  <input
                    type="text"
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
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
                    value={editTotalInvested}
                    onChange={(e) => setEditTotalInvested(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Valor Atual (R$)
                  </label>
                  <input
                    type="text"
                    value={editCurrentValue}
                    onChange={(e) => setEditCurrentValue(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenEditModal(false)}
                  className="w-1/3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
