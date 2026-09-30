"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Check, SkipForward, Wallet, CreditCard } from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { createAccount, createCreditCard } from "@/app/actions/finance";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

interface OnboardingFormProps {
  user: {
    id: string;
    name: string;
    primaryCurrency: string;
  };
}

export function OnboardingForm({ user }: OnboardingFormProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState(user.primaryCurrency || "BRL");
  const [firstDayOfMonth, setFirstDayOfMonth] = useState(1);

  // Optional account
  const [addAccount, setAddAccount] = useState(true);
  const [accountName, setAccountName] = useState("Conta Principal");
  const [accountInstitution, setAccountInstitution] = useState("Nubank");
  const [accountBalance, setAccountBalance] = useState("1000");

  // Optional card
  const [addCard, setAddCard] = useState(true);
  const [cardName, setCardName] = useState("Cartão de Crédito");
  const [cardLimit, setCardLimit] = useState("3000");
  const [cardDueDay, setCardDueDay] = useState(10);
  const [cardClosingDay, setCardClosingDay] = useState(3);

  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    try {
      setSaving(true);

      // Create initial account if opted
      if (addAccount && accountName) {
        await createAccount({
          name: accountName,
          type: "checking",
          institution: accountInstitution,
          initialBalance: accountBalance || "0",
          currency,
        });
      }

      // Create initial credit card if opted
      if (addCard && cardName) {
        await createCreditCard({
          name: cardName,
          bank: accountInstitution,
          brand: "mastercard",
          limit: cardLimit || "0",
          dueDay: cardDueDay,
          closingDay: cardClosingDay,
        });
      }

      success("Configuração concluída com sucesso!");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      error("Erro ao salvar configuração.");
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-[#090D16]">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Boas-vindas ao FinTrack, {user.name.split(" ")[0]}!
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Passo {step} de 2: Configure sua experiência financeira inicial.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`} />
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Moeda e Ciclo Financeiro
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Moeda Principal
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Dia de Início do Ciclo Financeiro
                </label>
                <select
                  value={firstDayOfMonth}
                  onChange={(e) => setFirstDayOfMonth(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value={1}>Dia 1 (Padrão do Mês)</option>
                  <option value={5}>Dia 5 (Dia de Salário)</option>
                  <option value={10}>Dia 10</option>
                  <option value={15}>Dia 15</option>
                  <option value={20}>Dia 20</option>
                  <option value={25}>Dia 25</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Define o dia em que seus relatórios e orçamentos renovam.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Pular Onboarding
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  Próximo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Contas e Cartões Iniciais
              </h2>

              {/* Initial Account Option */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addAccount}
                    onChange={(e) => setAddAccount(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    Cadastrar conta bancária principal agora
                  </span>
                </label>

                {addAccount && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Nome</label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Saldo Atual (R$)</label>
                      <input
                        type="text"
                        value={accountBalance}
                        onChange={(e) => setAccountBalance(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Initial Credit Card Option */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addCard}
                    onChange={(e) => setAddCard(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    Cadastrar cartão de crédito principal agora
                  </span>
                </label>

                {addCard && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Nome</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Limite Total (R$)</label>
                      <input
                        type="text"
                        value={cardLimit}
                        onChange={(e) => setCardLimit(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinish}
                  className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  {saving ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Começar a Usar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
