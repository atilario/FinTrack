"use client";

import { useState } from "react";
import { Wallet, Plus, Trash2, Landmark, ShieldCheck, TrendingUp, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { calculateAccountBalance } from "@/lib/finance";
import { createAccount, deleteAccount } from "@/app/actions/finance";
import { useToast } from "./ToastProvider";

interface AccountsManagerProps {
  user: {
    id: string;
    primaryCurrency: string;
  };
  accounts: any[];
  transactions: any[];
}

export function AccountsManager({
  user,
  accounts,
  transactions,
}: AccountsManagerProps) {
  const { success, error } = useToast();
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState("checking");
  const [initialBalance, setInitialBalance] = useState("");
  const [color, setColor] = useState("#10B981");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createAccount({
        name: name.trim(),
        institution: institution.trim() || "Outro",
        type,
        initialBalance: initialBalance || "0",
        color,
      });
      success("Conta cadastrada com sucesso!");
      setOpenModal(false);
      setName("");
      setInstitution("");
      setInitialBalance("");
      window.location.reload();
    } catch {
      error("Erro ao cadastrar conta.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;
    try {
      await deleteAccount(id);
      success("Conta excluída com sucesso.");
      window.location.reload();
    } catch {
      error("Erro ao excluir conta.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Contas & Carteiras
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie contas correntes, poupanças, carteiras físicas e contas de investimento.
          </p>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const balance = calculateAccountBalance(acc, transactions);

          return (
            <div
              key={acc.id}
              className="p-5 rounded-3xl glass-panel space-y-4 shadow-sm relative overflow-hidden group border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: acc.color || "#10B981" }}
                  >
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {acc.name}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {acc.institution} • {acc.type}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(acc.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Excluir conta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-medium">Saldo Atual</span>
                <span
                  className={`block text-2xl font-black tracking-tight mt-0.5 ${
                    balance >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"
                  }`}
                >
                  {formatMoney(balance, acc.currency || user.primaryCurrency)}
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Saldo inicial: {formatMoney(acc.initialBalanceCents, acc.currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cadastrar Nova Conta
              </h3>
              <button onClick={() => setOpenModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nome da Conta
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Nubank, Itaú..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Instituição
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Ex: Nubank, Bradesco..."
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
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="cash">Carteira Física</option>
                    <option value="investment">Investimento</option>
                    <option value="international">Internacional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Saldo Inicial (R$)
                  </label>
                  <input
                    type="text"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors mt-2"
              >
                Salvar Conta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
