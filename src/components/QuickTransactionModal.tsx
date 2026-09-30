"use client";

import { useState } from "react";
import {
  X,
  ChevronDown,
  ChevronUp,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import { createTransaction, createInstallmentPlan } from "@/app/actions/finance";
import { useToast } from "./ToastProvider";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

interface AccountOption {
  id: string;
  name: string;
  institution: string;
}

interface CardOption {
  id: string;
  name: string;
  brand: string;
}

interface CategoryOption {
  id: string;
  name: string;
  color: string;
  type: string;
}

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountOption[];
  cards: CardOption[];
  categories: CategoryOption[];
  primaryCurrency?: string;
}

export function QuickTransactionModal({
  isOpen,
  onClose,
  accounts,
  cards,
  categories,
  primaryCurrency = "BRL",
}: QuickTransactionModalProps) {
  const { success, error } = useToast();
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [destinationAccountId, setDestinationAccountId] = useState(accounts[1]?.id || "");
  const [creditCardId, setCreditCardId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced options
  const [currency, setCurrency] = useState(primaryCurrency);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [nature, setNature] = useState<"variable" | "fixed" | "installment">("variable");
  const [totalInstallments, setTotalInstallments] = useState(2);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) =>
    type === "transfer" ? true : c.type === type || c.type === "both"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount.replace(",", ".")) <= 0) {
      error("Informe um valor válido.");
      return;
    }
    if (!description.trim()) {
      error("Informe uma descrição breve.");
      return;
    }

    try {
      setSubmitting(true);

      if (nature === "installment" && type === "expense" && totalInstallments > 1) {
        await createInstallmentPlan({
          description: description.trim(),
          totalAmount: amount,
          totalInstallments,
          categoryId: categoryId || undefined,
          creditCardId: creditCardId || undefined,
          accountId: accountId || undefined,
          startDate: date,
          notes: notes || undefined,
        });
        success(`Parcelamento em ${totalInstallments}x cadastrado com sucesso!`);
      } else {
        await createTransaction({
          type,
          amount,
          currency,
          date,
          description: description.trim(),
          categoryId: type === "transfer" ? undefined : categoryId || undefined,
          accountId: accountId || undefined,
          destinationAccountId: type === "transfer" ? destinationAccountId || undefined : undefined,
          creditCardId: creditCardId || undefined,
          paymentMethod,
          transactionNature: nature === "installment" ? "variable" : nature,
          notes: notes || undefined,
          tags: tags || undefined,
        });
        success(`${type === "expense" ? "Despesa" : type === "income" ? "Receita" : "Transferência"} lançada!`);
      }

      // Reset
      setAmount("");
      setDescription("");
      setNotes("");
      setShowAdvanced(false);
      onClose();
    } catch (err: any) {
      error(err.message || "Erro ao salvar transação");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg text-slate-900 dark:text-white">
              Nova Transação
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Transaction Type Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setCreditCardId("");
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                type === "expense"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Despesa
            </button>

            <button
              type="button"
              onClick={() => {
                setType("income");
                setCreditCardId("");
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                type === "income"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Receita
            </button>

            <button
              type="button"
              onClick={() => {
                setType("transfer");
                setCreditCardId("");
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                type === "transfer"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transferir
            </button>
          </div>

          {/* Amount Hero Input */}
          <div className="text-center py-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Valor ({currency})
            </label>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-slate-400 mr-2">
                {SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || "R$"}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
                className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-transparent text-center focus:outline-none max-w-[240px]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "expense" ? "Ex: Almoço, Supermercado..." : "Ex: Salário, Freelance..."}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Categories Pill Selector (for Expense and Income) */}
          {type !== "transfer" && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Categoria
              </label>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      categoryId === cat.id
                        ? "bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-semibold shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Account / Payment Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                {type === "transfer" ? "Conta de Origem" : "Conta Bancária"}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution})
                  </option>
                ))}
              </select>
            </div>

            {type === "transfer" ? (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Conta de Destino
                </label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.institution})
                      </option>
                    ))}
                </select>
              </div>
            ) : type === "expense" && cards.length > 0 ? (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Ou usar Cartão de Crédito
                </label>
                <select
                  value={creditCardId}
                  onChange={(e) => {
                    setCreditCardId(e.target.value);
                    if (e.target.value) setPaymentMethod("credit");
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Não (usar débito/saldo)</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      💳 {card.name} ({card.brand.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Expandable Advanced Options Accordion */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1"
            >
              <span>Mais opções (moeda, parcelamento, notas, tags)</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-3 animate-fade-in">
                {/* Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Moeda
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} ({c.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Meio de Pagamento
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="pix">PIX</option>
                      <option value="credit">Cartão de Crédito</option>
                      <option value="debit">Cartão de Débito</option>
                      <option value="cash">Dinheiro em Espécie</option>
                      <option value="transfer">Transferência Bancária</option>
                      <option value="boleto">Boleto Bancário</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                </div>

                {/* Nature & Installment */}
                {type === "expense" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Tipo de Gasto
                      </label>
                      <select
                        value={nature}
                        onChange={(e) => setNature(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="variable">Variável (Livre)</option>
                        <option value="fixed">Fixo (Essencial)</option>
                        <option value="installment">Parcelado</option>
                      </select>
                    </div>

                    {nature === "installment" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Nº de Parcelas
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={60}
                          value={totalInstallments}
                          onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 2)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Tags & Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="viagem, trabalho, casa..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalhes adicionais..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Salvar Transação
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
