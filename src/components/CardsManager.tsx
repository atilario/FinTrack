"use client";

import { useState, useMemo } from "react";
import { CreditCard, Plus, CheckCircle, AlertCircle, X, Check, Edit2, Trash2, ShieldCheck, Eye, Calendar, TrendingUp, Clock, ArrowUpRight, Receipt } from "lucide-react";
import { formatMoney, fromCents, toCents } from "@/lib/money";
import { calculateCreditCardUsage, calculateCardStatementsProjection } from "@/lib/finance";
import { createCreditCard, updateCreditCard, deleteCreditCard, payCreditCardBill } from "@/app/actions/finance";
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

const POPULAR_BANKS = [
  "Nubank",
  "Itaú",
  "Bradesco",
  "Santander",
  "Banco do Brasil",
  "Caixa Econômica",
  "Inter",
  "C6 Bank",
  "BTG Pactual",
  "XP Investimentos",
  "Mercado Pago",
  "PicPay",
  "Safra",
  "Outro",
];

const CARD_BRANDS = [
  { value: "mastercard", label: "Mastercard" },
  { value: "visa", label: "Visa" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "American Express" },
  { value: "hipercard", label: "Hipercard" },
  { value: "other", label: "Outra" },
];

const CARD_THEMES = [
  { id: "#8B5CF6", label: "Roxo (Nubank)", gradient: "from-purple-950 via-indigo-950 to-slate-900 border-purple-800/40", preview: "bg-purple-600" },
  { id: "#F97316", label: "Laranja (Itaú/Inter)", gradient: "from-orange-950 via-amber-950 to-slate-900 border-orange-800/40", preview: "bg-orange-500" },
  { id: "#EF4444", label: "Vermelho (Santander/Bradesco)", gradient: "from-red-950 via-rose-950 to-slate-900 border-red-800/40", preview: "bg-red-600" },
  { id: "#2563EB", label: "Azul (Banco do Brasil/Caixa)", gradient: "from-blue-950 via-sky-950 to-slate-900 border-blue-800/40", preview: "bg-blue-600" },
  { id: "#0F172A", label: "Black Infinite", gradient: "from-slate-950 via-zinc-900 to-black border-slate-700/50", preview: "bg-zinc-800" },
  { id: "#10B981", label: "Verde Esmeralda", gradient: "from-emerald-950 via-teal-950 to-slate-900 border-emerald-800/40", preview: "bg-emerald-600" },
  { id: "#6366F1", label: "Índigo Navy", gradient: "from-slate-900 via-indigo-950 to-slate-900 border-indigo-900/40", preview: "bg-indigo-600" },
  { id: "#D97706", label: "Dourado Gold", gradient: "from-amber-950 via-yellow-950 to-slate-900 border-amber-800/40", preview: "bg-amber-500" },
];

function getCardGradient(color?: string) {
  const found = CARD_THEMES.find((t) => t.id === color);
  return found ? found.gradient : "from-slate-900 via-indigo-950 to-slate-900 border-indigo-900/40";
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
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openPayModal, setOpenPayModal] = useState(false);
  const [selectedCardForPay, setSelectedCardForPay] = useState<any>(null);
  const [selectedCardForDetails, setSelectedCardForDetails] = useState<any>(null);
  const [detailsTab, setDetailsTab] = useState<"current" | "projection">("current");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [selectedBank, setSelectedBank] = useState("Nubank");
  const [customBank, setCustomBank] = useState("");
  const [brand, setBrand] = useState("mastercard");
  const [lastFour, setLastFour] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState(25);
  const [dueDay, setDueDay] = useState(5);
  const [color, setColor] = useState("#8B5CF6");
  const [submitting, setSubmitting] = useState(false);

  // Pay invoice form
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id || "");
  const [payAmount, setPayAmount] = useState("");

  const cardProjections = useMemo(() => {
    if (!selectedCardForDetails) return [];
    return calculateCardStatementsProjection(selectedCardForDetails, transactions, 6);
  }, [selectedCardForDetails, transactions]);

  const currentCycle = cardProjections.find((p) => p.isCurrentStatement) || cardProjections[0];

  const resetForm = () => {
    setName("");
    setSelectedBank("Nubank");
    setCustomBank("");
    setBrand("mastercard");
    setLastFour("");
    setLimit("");
    setClosingDay(25);
    setDueDay(5);
    setColor("#8B5CF6");
    setEditingCardId(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setOpenCardModal(true);
  };

  const handleOpenEditModal = (card: any) => {
    setEditingCardId(card.id);
    setName(card.name);
    if (POPULAR_BANKS.includes(card.bank)) {
      setSelectedBank(card.bank);
      setCustomBank("");
    } else {
      setSelectedBank("Outro");
      setCustomBank(card.bank || "");
    }
    setBrand(card.brand || "mastercard");
    setLastFour(card.lastFourDigits || "");
    setLimit(fromCents(card.limitCents).toString());
    setClosingDay(card.closingDay || 25);
    setDueDay(card.dueDay || 5);
    setColor(card.color || "#8B5CF6");
    setOpenEditModal(true);
  };

  const finalBankName = selectedBank === "Outro" ? (customBank.trim() || "Outro") : selectedBank;

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !limit) {
      error("Preencha o nome e o limite do cartão.");
      return;
    }
    try {
      setSubmitting(true);
      await createCreditCard({
        name: name.trim(),
        bank: finalBankName,
        brand,
        lastFourDigits: lastFour.trim(),
        limit,
        closingDay,
        dueDay,
        color,
      });
      success("Cartão de crédito cadastrado com sucesso!");
      setOpenCardModal(false);
      resetForm();
      window.location.reload();
    } catch {
      error("Erro ao cadastrar cartão.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCardId || !name.trim() || !limit) {
      error("Preencha o nome e o limite do cartão.");
      return;
    }
    try {
      setSubmitting(true);
      await updateCreditCard(editingCardId, {
        name: name.trim(),
        bank: finalBankName,
        brand,
        lastFourDigits: lastFour.trim(),
        limit,
        closingDay,
        dueDay,
        color,
      });
      success("Cartão atualizado com sucesso!");
      setOpenEditModal(false);
      resetForm();
      window.location.reload();
    } catch {
      error("Erro ao atualizar cartão.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (card: any) => {
    if (!confirm(`Tem certeza que deseja excluir o cartão "${card.name}"?`)) {
      return;
    }
    try {
      await deleteCreditCard(card.id);
      success("Cartão excluído com sucesso.");
      window.location.reload();
    } catch {
      error("Erro ao excluir cartão.");
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

  // Reusable Card Form Component (for both create & edit)
  const renderCardFormFields = () => (
    <>
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Nome do Cartão
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Cartão Principal, Ultravioleta, Black"
          required
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Banco / Instituição Emissora
          </label>
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {POPULAR_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Bandeira do Cartão
          </label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {CARD_BRANDS.map((br) => (
              <option key={br.value} value={br.value}>
                {br.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedBank === "Outro" && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nome do Banco / Emissor
          </label>
          <input
            type="text"
            value={customBank}
            onChange={(e) => setCustomBank(e.target.value)}
            placeholder="Digite o nome do seu banco"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Últimos 4 Dígitos
          </label>
          <input
            type="text"
            maxLength={4}
            value={lastFour}
            onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
            placeholder="Ex: 4829"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono tracking-wider focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Limite Total (R$)
          </label>
          <input
            type="text"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="Ex: 5000"
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Dia de Fechamento
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={closingDay}
            onChange={(e) => setClosingDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">Melhor dia p/ compra</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Dia de Vencimento
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={dueDay}
            onChange={(e) => setDueDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">Data do pagamento</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Cor do Cartão
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {CARD_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setColor(theme.id)}
              className={`w-7 h-7 rounded-full ${theme.preview} transition-all flex items-center justify-center ${
                color === theme.id ? "ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900 scale-110" : "opacity-80 hover:opacity-100"
              }`}
              title={theme.label}
            >
              {color === theme.id && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );

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
          onClick={handleOpenCreateModal}
          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Cartão
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="p-8 rounded-3xl glass-panel text-center space-y-3">
          <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Nenhum cartão de crédito cadastrado
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cadastre seu primeiro cartão para acompanhar faturas, compras parceladas e limite disponível.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            Cadastrar Cartão Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => {
            const usage = calculateCreditCardUsage(card, transactions);
            const gradientClass = getCardGradient(card.color);

            return (
              <div key={card.id} className="space-y-4">
                {/* Virtual Card Canvas */}
                <div
                  className={`p-6 rounded-3xl bg-gradient-to-br ${gradientClass} text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-56 border transition-transform hover:scale-[1.01]`}
                >
                  {/* Top Bar: Card Name, Bank, Brand and Edit/Delete Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg tracking-wide truncate max-w-[180px]">
                          {card.name}
                        </span>
                        <span className="text-xs text-slate-300 font-medium opacity-90">
                          ({card.bank || "Banco"})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-white/10 backdrop-blur-md">
                        {card.brand || "Mastercard"}
                      </span>

                      <button
                        onClick={() => handleOpenEditModal(card)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Editar Cartão"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteCard(card)}
                        className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition-colors"
                        title="Excluir Cartão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="tracking-widest font-mono text-base opacity-90 py-2 flex items-center gap-2">
                    <span>•••• •••• ••••</span>
                    <span className="font-bold text-lg text-white">
                      {card.lastFourDigits || "0000"}
                    </span>
                  </div>

                  {/* Bottom Bar: Due / Closing and Limit */}
                  <div className="flex items-end justify-between pt-2">
                    <div>
                      <span className="text-[10px] text-slate-300 uppercase tracking-wider block">
                        VENCIMENTO / FECHAMENTO
                      </span>
                      <span className="text-xs font-semibold">
                        Vence dia {card.dueDay || 10} • Fecha dia {card.closingDay || 3}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-300 uppercase tracking-wider block">
                        LIMITE TOTAL
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
                        style={{ width: `${Math.min(100, usage.usagePercentage)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {usage.usagePercentage}% do limite utilizado
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setSelectedCardForDetails(card);
                          setDetailsTab("current");
                        }}
                        className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        Ver Fatura
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(card)}
                        className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>

                      <button
                        onClick={() => {
                          setSelectedCardForPay(card);
                          setPayAmount(fromCents(usage.usedLimitCents).toString());
                          setOpenPayModal(true);
                        }}
                        className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Pagar Fatura
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL EDITAR CARTÃO */}
      {openEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Editar Cartão de Crédito
                </h3>
              </div>
              <button onClick={() => setOpenEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCard} className="space-y-3.5">
              {renderCardFormFields()}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenEditModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {submitting ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO CARTÃO */}
      {openCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Cadastrar Novo Cartão
                </h3>
              </div>
              <button onClick={() => setOpenCardModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-3.5">
              {renderCardFormFields()}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenCardModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {submitting ? "Cadastrando..." : "Cadastrar Cartão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* MODAL DETALHES DA FATURA E PROJEÇÃO FUTURA */}
      {selectedCardForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedCardForDetails.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                    {selectedCardForDetails.bank || "Banco"}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    •••• {selectedCardForDetails.lastFourDigits || "0000"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Melhor dia de compra (fechamento): <strong>dia {selectedCardForDetails.closingDay || 25}</strong> • Vencimento: <strong>dia {selectedCardForDetails.dueDay || 5}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedCardForDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switch inside modal */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setDetailsTab("current")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  detailsTab === "current"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Fatura Vigente
              </button>
              <button
                onClick={() => setDetailsTab("projection")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  detailsTab === "projection"
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Projeção Futura (6 Meses)
              </button>
            </div>

            {/* TAB 1: FATURA VIGENTE */}
            {detailsTab === "current" && (
              <div className="space-y-4">
                {currentCycle ? (
                  <>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Ciclo Vigente ({currentCycle.fullLabel})
                        </span>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                          {formatMoney(currentCycle.totalAmountCents, selectedCardForDetails.currency)}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Fechamento: {currentCycle.closingDate} • Vencimento: {currentCycle.dueDate}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedCardForPay(selectedCardForDetails);
                          setPayAmount(fromCents(currentCycle.totalAmountCents).toString());
                          setOpenPayModal(true);
                        }}
                        disabled={currentCycle.totalAmountCents <= 0}
                        className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Pagar Esta Fatura
                      </button>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Lançamentos alocados neste ciclo ({currentCycle.purchases.length})
                      </h4>

                      {currentCycle.purchases.length === 0 ? (
                        <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                          Nenhuma compra ou parcela lançada para esta fatura até o momento.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {currentCycle.purchases.map((item: any) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                            >
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>{item.description}</span>
                                  {item.installmentNumber && item.totalInstallments && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold">
                                      Parcela {item.installmentNumber}/{item.totalInstallments}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  {item.date}
                                </span>
                              </div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {formatMoney(item.amountCents, selectedCardForDetails.currency)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Nenhum ciclo identificado para este cartão.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PROJEÇÃO FUTURA */}
            {detailsTab === "projection" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Projeção de Faturas Futuras:</strong> Veja como suas compras já realizadas e parcelas programadas impactam os seus próximos 6 meses.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cardProjections.map((proj) => (
                    <div
                      key={`${proj.year}-${proj.month}`}
                      className={`p-4 rounded-2xl border transition-all ${
                        proj.isCurrentStatement
                          ? "bg-slate-50 dark:bg-slate-800/80 border-emerald-500/50 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {proj.fullLabel}
                        </span>
                        {proj.isCurrentStatement && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                            Atual
                          </span>
                        )}
                      </div>

                      <div className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        {formatMoney(proj.totalAmountCents, selectedCardForDetails.currency)}
                      </div>

                      <div className="text-[10px] text-slate-400 space-y-0.5 mb-2">
                        <div>Vence em: {proj.dueDate}</div>
                        <div>Fechamento: {proj.closingDate}</div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{proj.purchases.length} lançamento(s)</span>
                        {proj.purchases.some((i: any) => i.installmentNumber) && (
                          <span className="text-indigo-500 font-medium">Contém parcelas</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
