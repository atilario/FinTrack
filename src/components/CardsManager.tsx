"use client";

import { useState } from "react";
import { CreditCard, Plus, CheckCircle, AlertCircle, X, Check } from "lucide-react";
import { formatMoney, fromCents } from "@/lib/money";
import { calculateCreditCardUsage } from "@/lib/finance";
import { createCreditCard, payCreditCardBill } from "@/app/actions/finance";
import { useToast } from "./ToastProvider";

interface CardsManagerProps {
  user: {
    id: string;
    primaryCurrency: string;
  };
  cards: any[];
  accounts: any[];
  transactions: any[];
  statements: any[];
}

export function CardsManager({
  user,
  cards,
  accounts,
  transactions,
  statements,
}: CardsManagerProps) {
  const { success, error } = useToast();
  const [openCardModal, setOpenCardModal] = useState(false);
  const [openPayModal, setOpenPayModal] = useState(false);
  const [selectedCardForPay, setSelectedCardForPay] = useState<any>(null);

  // New card form
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [brand, setBrand] = useState("mastercard");
  const [lastFour, setLastFour] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState(25);
  const [dueDay, setDueDay] = useState(5);

  // Pay invoice form
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id || "");
  const [payAmount, setPayAmount] = useState("");

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !limit) return;
    try {
      await createCreditCard({
        name: name.trim(),
        bank: bank.trim() || "Outro",
        brand,
        lastFourDigits: lastFour.trim(),
        limit,
        closingDay,
        dueDay,
      });
      success("Cartão de crédito cadastrado!");
      setOpenCardModal(false);
      setName("");
      setLimit("");
      window.location.reload();
    } catch {
      error("Erro ao cadastrar cartão.");
    }
  };

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardForPay || !payAmount || !payAccountId) return;
    try {
      await payCreditCardBill({
        creditCardId: selectedCardForPay.id,
        accountId: payAccountId,
        amount: payAmount,
        date: new Date().toISOString().split("T")[0],
      });
      success("Fatura paga com sucesso! Saldo e compras atualizados.");
      setOpenPayModal(false);
      window.location.reload();
    } catch {
      error("Erro ao registrar pagamento de fatura.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Cartões & Faturas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhe limites utilizados, fechamentos, parcelas nas faturas e liquide faturas sem duplicar despesas.
          </p>
        </div>

        <button
          onClick={() => setOpenCardModal(true)}
          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Cartão
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => {
          const usage = calculateCreditCardUsage(card, transactions);

          return (
            <div key={card.id} className="space-y-4">
              {/* Virtual Card Canvas */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-56 border border-indigo-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg tracking-wide">{card.name}</span>
                    <span className="text-xs text-indigo-300">({card.bank})</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-white/10">
                    {card.brand}
                  </span>
                </div>

                <div className="tracking-widest font-mono text-base opacity-80">
                  •••• •••• •••• {card.lastFourDigits || "0000"}
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Vencimento / Fechamento
                    </span>
                    <span className="text-xs font-semibold">
                      Vence dia {card.dueDay} • Fecha dia {card.closingDay}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Limite Total
                    </span>
                    <span className="text-sm font-bold">
                      {formatMoney(card.limitCents, card.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Limit Details & Pay Invoice Action */}
              <div className="p-5 rounded-2xl glass-panel space-y-4 shadow-sm">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">
                      Fatura Atual:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {formatMoney(usage.usedLimitCents, card.currency)}
                      </strong>
                    </span>
                    <span className="text-slate-500">
                      Disponível:{" "}
                      <strong className="text-emerald-500">
                        {formatMoney(usage.availableLimitCents, card.currency)}
                      </strong>
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usage.usagePercentage > 85 ? "bg-rose-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${usage.usagePercentage}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {usage.usagePercentage}% do limite utilizado
                  </span>

                  <button
                    onClick={() => {
                      setSelectedCardForPay(card);
                      setPayAmount(fromCents(usage.usedLimitCents).toString());
                      setOpenPayModal(true);
                    }}
                    className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Pagar Fatura
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL PAGAR FATURA */}
      {openPayModal && selectedCardForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Pagar Fatura — {selectedCardForPay.name}
              </h3>
              <button onClick={() => setOpenPayModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Conta de Débito (Origem do Dinheiro)
                </label>
                <select
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.institution})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Valor a Pagar (R$)
                </label>
                <input
                  type="text"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500">
                ℹ️ Esta baixa debita o saldo da sua conta sem duplicar o cálculo de gastos já contabilizados no mês.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
              >
                Confirmar Pagamento da Fatura
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO CARTÃO */}
      {openCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cadastrar Cartão de Crédito
              </h3>
              <button onClick={() => setOpenCardModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nome do Cartão
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Nubank Ultravioleta"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Bandeira
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="elo">Elo</option>
                    <option value="amex">Amex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Últimos 4 Dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={lastFour}
                    onChange={(e) => setLastFour(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Limite Total (R$)
                </label>
                <input
                  type="text"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Dia de Fechamento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={closingDay}
                    onChange={(e) => setClosingDay(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setDueDay(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors mt-2"
              >
                Cadastrar Cartão
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
