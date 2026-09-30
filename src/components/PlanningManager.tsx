"use client";

import { useState, useMemo } from "react";
import {
  Target,
  PiggyBank,
  Repeat,
  Layers,
  LineChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  X,
  CreditCard,
  Wallet,
  Landmark,
  Trash2,
} from "lucide-react";
import { formatMoney, fromCents, toCents } from "@/lib/money";
import { calculateBudgetProgress, calculateForecast } from "@/lib/finance";
import {
  setBudget,
  createFinancialGoal,
  createRecurringTransaction,
  createInstallmentPlan,
  createDebt,
  payDebtInstallment,
  deleteDebt,
} from "@/app/actions/finance";
import { useToast } from "./ToastProvider";

interface PlanningManagerProps {
  user: {
    id: string;
    primaryCurrency: string;
  };
  accounts: any[];
  cards: any[];
  categories: any[];
  budgets: any[];
  goals: any[];
  recurring: any[];
  installmentPlans: any[];
  transactions: any[];
  debts?: any[];
}

const DEBT_TYPE_LABELS: Record<string, string> = {
  loan: "Empréstimo Pessoal",
  financing_real_estate: "Financiamento Imobiliário",
  financing_vehicle: "Financiamento Veicular",
  payroll_loan: "Consignado",
  credit_renegotiation: "Renegociação",
  other: "Outro Passivo",
};

export function PlanningManager({
  user,
  accounts,
  cards,
  categories,
  budgets,
  goals,
  recurring,
  installmentPlans,
  transactions,
  debts = [],
}: PlanningManagerProps) {
  const { success, error } = useToast();
  const [tab, setTab] = useState<"budgets" | "goals" | "recurring" | "installments" | "forecast" | "debts">("budgets");

  // Current period for budgets
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Modal states
  const [openBudgetModal, setOpenBudgetModal] = useState(false);
  const [openGoalModal, setOpenGoalModal] = useState(false);
  const [openRecurringModal, setOpenRecurringModal] = useState(false);
  const [openInstallmentModal, setOpenInstallmentModal] = useState(false);
  const [openDebtModal, setOpenDebtModal] = useState(false);
  const [openPayDebtModal, setOpenPayDebtModal] = useState(false);
  const [selectedDebtForPay, setSelectedDebtForPay] = useState<any>(null);

  // Form states
  const [budgetCatId, setBudgetCatId] = useState(categories[0]?.id || "");
  const [budgetAmount, setBudgetAmount] = useState("");

  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("0");
  const [goalDate, setGoalDate] = useState("");

  const [recDesc, setRecDesc] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recType, setRecType] = useState<"expense" | "income">("expense");
  const [recFreq, setRecFreq] = useState<any>("monthly");
  const [recBillingDay, setRecBillingDay] = useState(5);

  const [instDesc, setInstDesc] = useState("");
  const [instTotal, setInstTotal] = useState("");
  const [instCount, setInstCount] = useState(10);
  const [instCardId, setInstCardId] = useState(cards[0]?.id || "");
  const [instStartDate, setInstStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [instPaidCount, setInstPaidCount] = useState(0);

  // Debt form states
  const [debtCreditor, setDebtCreditor] = useState("");
  const [debtDesc, setDebtDesc] = useState("");
  const [debtType, setDebtType] = useState<any>("loan");
  const [debtTotalAmount, setDebtTotalAmount] = useState("");
  const [debtRemainingAmount, setDebtRemainingAmount] = useState("");
  const [debtInterestRate, setDebtInterestRate] = useState("");
  const [debtTotalInst, setDebtTotalInst] = useState(12);
  const [debtPaidInst, setDebtPaidInst] = useState(0);
  const [debtInstallmentAmount, setDebtInstallmentAmount] = useState("");
  const [debtDueDate, setDebtDueDate] = useState("");
  const [debtNotes, setDebtNotes] = useState("");

  // Pay debt form states
  const [payDebtAccountId, setPayDebtAccountId] = useState(accounts[0]?.id || "");
  const [payDebtAmount, setPayDebtAmount] = useState("");

  // Budget calculations
  const budgetList = useMemo(() => {
    const monthStr = String(currentMonth).padStart(2, "0");
    const prefix = `${currentYear}-${monthStr}`;

    // Spending per category this month
    const spendingMap: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === "expense" && tx.date.startsWith(prefix) && !tx.isCardBillPayment) {
        if (tx.categoryId) {
          spendingMap[tx.categoryId] = (spendingMap[tx.categoryId] || 0) + tx.amountCents;
        }
      }
    }

    return budgets
      .filter((b) => b.month === currentMonth && b.year === currentYear)
      .map((b) => {
        const cat = categories.find((c) => c.id === b.categoryId);
        const spent = spendingMap[b.categoryId] || 0;
        const progress = calculateBudgetProgress(b.amountCents, spent);
        return {
          ...b,
          categoryName: cat?.name || "Categoria",
          categoryColor: cat?.color || "#10B981",
          ...progress,
        };
      });
  }, [budgets, transactions, categories, currentMonth, currentYear]);

  // Real Forecast calculation
  const forecastMetrics = useMemo(() => {
    // 1. Real Liquid Balance across accounts
    const currentBalanceCents = accounts.reduce((acc, a) => acc + (a.balanceCents || 0), 0);

    // 2. Real Recurring Income & Fixed Expense
    let monthlyIncome = 0;
    let monthlyFixedExpense = 0;

    for (const r of recurring) {
      if (!r.isActive) continue;
      if (r.type === "income") monthlyIncome += r.amountCents;
      if (r.type === "expense") monthlyFixedExpense += r.amountCents;
    }

    // If no recurring income, estimate from average monthly income in transactions
    if (monthlyIncome === 0) {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sixtyStr = sixtyDaysAgo.toISOString().split("T")[0];
      let recentIncome = 0;
      for (const t of transactions) {
        if (t.type === "income" && t.date >= sixtyStr) {
          recentIncome += t.amountCents;
        }
      }
      monthlyIncome = Math.round(recentIncome / 2);
    }

    // 3. Real Average Variable Expense (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyStr = thirtyDaysAgo.toISOString().split("T")[0];

    let recentVariable = 0;
    for (const t of transactions) {
      if (
        t.type === "expense" &&
        !t.isCardBillPayment &&
        t.transactionNature !== "fixed" &&
        t.date >= thirtyStr
      ) {
        recentVariable += t.amountCents;
      }
    }

    // 4. Real Installments & Active Debts projected by upcoming month
    const pendingInstallments: { monthLabel: string; amountCents: number }[] = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (let i = 1; i <= 6; i++) {
      let targetMonth = currentMonth + i;
      let targetYear = currentYear;
      while (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }

      const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
      const label = `${monthNames[targetMonth - 1]}/${targetYear.toString().slice(-2)}`;

      let monthInstallmentTotal = 0;

      for (const t of transactions) {
        if (
          t.type === "expense" &&
          !t.isPaid &&
          !t.isCardBillPayment &&
          t.date.startsWith(monthPrefix)
        ) {
          monthInstallmentTotal += t.amountCents;
        }
      }

      for (const d of debts) {
        if (d.status === "active" && d.remainingAmountCents > 0) {
          const remainingInst = (d.totalInstallments || 1) - (d.paidInstallments || 0);
          if (remainingInst >= i) {
            monthInstallmentTotal += d.installmentAmountCents || 0;
          }
        }
      }

      pendingInstallments.push({
        monthLabel: label,
        amountCents: monthInstallmentTotal,
      });
    }

    const projections = calculateForecast({
      currentBalanceCents,
      monthlyRecurringIncomeCents: monthlyIncome,
      monthlyRecurringExpenseCents: monthlyFixedExpense,
      averageVariableExpenseCents: recentVariable,
      pendingInstallmentsByMonth: pendingInstallments,
      monthsAhead: 6,
    });

    return {
      currentBalanceCents,
      monthlyIncome,
      monthlyFixedExpense,
      recentVariable,
      projections,
    };
  }, [accounts, recurring, transactions, debts, currentMonth, currentYear]);

  const forecastProjections = forecastMetrics.projections;

  // Debts calculations
  const activeDebts = useMemo(() => debts.filter((d) => d.status === "active" && d.remainingAmountCents > 0), [debts]);
  const totalDebtsRemainingCents = useMemo(() => activeDebts.reduce((sum, d) => sum + (d.remainingAmountCents || 0), 0), [activeDebts]);
  const totalDebtsAmortizedCents = useMemo(() => debts.reduce((sum, d) => sum + Math.max(0, (d.totalAmountCents || 0) - (d.remainingAmountCents || 0)), 0), [debts]);

  // Handlers
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetAmount) return;
    try {
      await setBudget({
        categoryId: budgetCatId,
        amount: budgetAmount,
        month: currentMonth,
        year: currentYear,
      });
      success("Orçamento salvo com sucesso!");
      setOpenBudgetModal(false);
      setBudgetAmount("");
      window.location.reload();
    } catch {
      error("Erro ao salvar orçamento.");
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalTarget) return;
    try {
      await createFinancialGoal({
        name: goalName,
        targetAmount: goalTarget,
        currentAmount: goalCurrent || "0",
        targetDate: goalDate || undefined,
      });
      success("Meta financeira criada com sucesso!");
      setOpenGoalModal(false);
      setGoalName("");
      setGoalTarget("");
      window.location.reload();
    } catch {
      error("Erro ao criar meta.");
    }
  };

  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recDesc || !recAmount) return;
    try {
      await createRecurringTransaction({
        description: recDesc,
        amount: recAmount,
        type: recType,
        frequency: recFreq,
        startDate: new Date().toISOString().split("T")[0],
        billingDay: recBillingDay,
      });
      success("Lançamento recorrente criado com sucesso!");
      setOpenRecurringModal(false);
      setRecDesc("");
      setRecAmount("");
      window.location.reload();
    } catch {
      error("Erro ao criar despesa/receita recorrente.");
    }
  };

  const handleSaveInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instDesc || !instTotal) return;
    try {
      await createInstallmentPlan({
        description: instDesc,
        totalAmount: instTotal,
        totalInstallments: instCount,
        paidInstallmentsCount: instPaidCount,
        creditCardId: instCardId || undefined,
        startDate: instStartDate || new Date().toISOString().split("T")[0],
      });
      success(`Parcelamento em ${instCount}x registrado!`);
      setOpenInstallmentModal(false);
      setInstDesc("");
      setInstTotal("");
      setInstStartDate(new Date().toISOString().split("T")[0]);
      setInstPaidCount(0);
      window.location.reload();
    } catch (err: any) {
      error(err?.message || "Erro ao criar parcelamento.");
    }
  };

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtCreditor || !debtTotalAmount) {
      error("Preencha o credor e o valor total.");
      return;
    }
    try {
      await createDebt({
        creditor: debtCreditor.trim(),
        description: debtDesc.trim() || undefined,
        type: debtType,
        totalAmount: debtTotalAmount,
        remainingAmount: debtRemainingAmount || debtTotalAmount,
        interestRate: debtInterestRate.trim() || undefined,
        totalInstallments: debtTotalInst || 1,
        paidInstallments: debtPaidInst || 0,
        installmentAmount: debtInstallmentAmount || undefined,
        nextDueDate: debtDueDate || undefined,
        notes: debtNotes.trim() || undefined,
      });
      success("Dívida/Financiamento cadastrado com sucesso!");
      setOpenDebtModal(false);
      setDebtCreditor("");
      setDebtDesc("");
      setDebtTotalAmount("");
      setDebtRemainingAmount("");
      setDebtInterestRate("");
      setDebtTotalInst(12);
      setDebtPaidInst(0);
      setDebtInstallmentAmount("");
      setDebtDueDate("");
      setDebtNotes("");
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      error(err?.message || "Erro ao cadastrar dívida.");
    }
  };

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPay || !payDebtAmount) return;
    try {
      await payDebtInstallment({
        debtId: selectedDebtForPay.id,
        amount: payDebtAmount,
        accountId: payDebtAccountId || undefined,
        date: new Date().toISOString().split("T")[0],
      });
      success("Parcela da dívida paga e amortizada com sucesso!");
      setOpenPayDebtModal(false);
      setSelectedDebtForPay(null);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      error(err?.message || "Erro ao registrar pagamento de parcela.");
    }
  };

  const handleDeleteDebt = async (debt: any) => {
    if (!confirm(`Deseja realmente excluir a dívida "${debt.creditor}"?`)) return;
    try {
      await deleteDebt(debt.id);
      success("Dívida excluída com sucesso.");
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      error(err?.message || "Erro ao excluir dívida.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Planejamento Financeiro
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Defina orçamentos, acompanhe metas, controle fixos, parcelas e veja sua previsão futura.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setTab("budgets")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === "budgets"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Orçamentos
          </button>
          <button
            onClick={() => setTab("goals")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === "goals"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Metas
          </button>
          <button
            onClick={() => setTab("recurring")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === "recurring"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Fixos & Recorrentes
          </button>
          <button
            onClick={() => setTab("installments")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === "installments"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Parcelamentos
          </button>
          <button
            onClick={() => setTab("debts")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              tab === "debts"
                ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-rose-500" />
            Dívidas & Empréstimos
          </button>
          <button
            onClick={() => setTab("forecast")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === "forecast"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Previsão
          </button>
        </div>
      </div>

      {/* --- TAB 1: ORÇAMENTOS (BUDGETS) --- */}
      {tab === "budgets" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-emerald-500" />
              Limites de Gastos por Categoria (Mês Vigente)
            </h2>
            <button
              onClick={() => setOpenBudgetModal(true)}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Definir Orçamento
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetList.length > 0 ? (
              budgetList.map((b) => (
                <div key={b.id} className="p-5 rounded-2xl glass-panel space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: b.categoryColor }}
                      />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {b.categoryName}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        b.status === "danger"
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                          : b.status === "warning"
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                      }`}
                    >
                      {b.percentage}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        b.status === "danger"
                          ? "bg-rose-500"
                          : b.status === "warning"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span>Gasto: {formatMoney(b.spentCents, user.primaryCurrency)}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Limite: {formatMoney(b.amountCents, user.primaryCurrency)}
                    </span>
                  </div>

                  <div className="text-[11px] font-medium text-right">
                    {b.remainingCents >= 0 ? (
                      <span className="text-emerald-500">
                        Resta {formatMoney(b.remainingCents, user.primaryCurrency)}
                      </span>
                    ) : (
                      <span className="text-rose-500 flex items-center justify-end gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Ultrapassou em {formatMoney(Math.abs(b.remainingCents), user.primaryCurrency)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full glass-panel p-8 rounded-3xl text-center space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhum orçamento configurado para este mês
                </p>
                <p className="text-xs text-slate-500">
                  Defina tetos de gastos para Alimentação, Lazer ou Transporte para manter suas finanças sob controle.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: METAS FINANCEIRAS (GOALS) --- */}
      {tab === "goals" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              Metas de Economia & Sonhos
            </h2>
            <button
              onClick={() => setOpenGoalModal(true)}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Meta
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const pct = goal.targetAmountCents > 0
                ? Math.min(100, Math.round((goal.currentAmountCents / goal.targetAmountCents) * 100))
                : 0;

              return (
                <div key={goal.id} className="p-5 rounded-2xl glass-panel space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {goal.name}
                        </h3>
                        {goal.targetDate && (
                          <span className="text-[11px] text-slate-400">
                            Prazo: {goal.targetDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {pct}%
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">
                      Atual:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {formatMoney(goal.currentAmountCents, user.primaryCurrency)}
                      </strong>
                    </span>
                    <span className="text-slate-500">
                      Alvo:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {formatMoney(goal.targetAmountCents, user.primaryCurrency)}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 3: FIXOS & RECORRENTES --- */}
      {tab === "recurring" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-emerald-500" />
              Despesas e Receitas Recorrentes
            </h2>
            <button
              onClick={() => setOpenRecurringModal(true)}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Recorrência
            </button>
          </div>

          <div className="space-y-2.5">
            {recurring.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl glass-panel flex items-center justify-between shadow-sm text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      item.type === "income"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-rose-500/10 text-rose-500"
                    }`}
                  >
                    {item.billingDay}º
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white block">
                      {item.description}
                    </span>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {item.frequency} • Vence dia {item.billingDay}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-sm font-extrabold ${
                    item.type === "income"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {item.type === "income" ? "+" : "−"}
                  {formatMoney(item.amountCents, item.currency || user.primaryCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 4: PARCELAMENTOS --- */}
      {tab === "installments" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Compras Parceladas
            </h2>
            <button
              onClick={() => setOpenInstallmentModal(true)}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Parcelamento
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {installmentPlans.map((plan) => (
              <div key={plan.id} className="p-5 rounded-2xl glass-panel space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {plan.description}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    {plan.totalInstallments} parcelas
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Valor Total:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatMoney(plan.totalAmountCents, user.primaryCurrency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span>Início: {plan.startDate}</span>
                  <span className="text-indigo-500 font-semibold">
                    ~ {formatMoney(Math.round(plan.totalAmountCents / plan.totalInstallments), user.primaryCurrency)}/mês
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 5: PREVISÃO FINANCEIRA (FORECAST) --- */}
      {tab === "forecast" && (
        <div className="space-y-4 animate-fade-in">
          {/* Transparent Metric Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl glass-panel space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Saldo Atual Líquido
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {formatMoney(forecastMetrics.currentBalanceCents, user.primaryCurrency)}
              </span>
              <span className="text-[10px] text-slate-400 block">Soma de suas contas</span>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Receitas Previstas/mês
              </span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                +{formatMoney(forecastMetrics.monthlyIncome, user.primaryCurrency)}
              </span>
              <span className="text-[10px] text-slate-400 block">Recorrentes e média</span>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Gastos Fixos/mês
              </span>
              <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                −{formatMoney(forecastMetrics.monthlyFixedExpense, user.primaryCurrency)}
              </span>
              <span className="text-[10px] text-slate-400 block">Despesas recorrentes</span>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Média Variável
              </span>
              <span className="text-base font-bold text-slate-700 dark:text-slate-300">
                −{formatMoney(forecastMetrics.recentVariable, user.primaryCurrency)}
              </span>
              <span className="text-[10px] text-slate-400 block">Últimos 30 dias</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-800 dark:text-indigo-300">
            <strong>Estimativa Realista:</strong> Projeção calculada a partir dos seus saldos bancários reais, recorrências cadastradas e parcelamentos com vencimento futuro.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecastProjections.map((p) => (
              <div key={p.monthIndex} className="p-5 rounded-2xl glass-panel space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {p.label}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      p.netCashflowCents >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {p.netCashflowCents >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(p.netCashflowCents), user.primaryCurrency)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Receitas estimadas:</span>
                    <span className="text-emerald-500">
                      +{formatMoney(p.projectedIncomeCents, user.primaryCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Despesas previstas:</span>
                    <span className="text-rose-500">
                      −{formatMoney(p.projectedExpenseCents, user.primaryCurrency)}
                    </span>
                  </div>
                  {p.installmentCents > 0 && (
                    <div className="flex justify-between text-[11px] text-indigo-600 dark:text-indigo-400">
                      <span>Parcelas & Dívidas no mês:</span>
                      <span>−{formatMoney(p.installmentCents, user.primaryCurrency)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-400">
                    Saldo estimado no fim:
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {formatMoney(p.projectedBalanceCents, user.primaryCurrency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MODAL DEFINIR ORÇAMENTO --- */}
      {openBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Definir Limite de Orçamento
              </h3>
              <button onClick={() => setOpenBudgetModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={budgetCatId}
                  onChange={(e) => setBudgetCatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Limite Mensal (R$)
                </label>
                <input
                  type="text"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="Ex: 800"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
              >
                Salvar Orçamento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL NOVA META --- */}
      {openGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Nova Meta Financeira
              </h3>
              <button onClick={() => setOpenGoalModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nome da Meta
                </label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="Ex: Viagem Europa, Carro Novo..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Valor Alvo (R$)
                </label>
                <input
                  type="text"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  placeholder="Ex: 10000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Valor Já Guardado (R$)
                </label>
                <input
                  type="text"
                  value={goalCurrent}
                  onChange={(e) => setGoalCurrent(e.target.value)}
                  placeholder="Ex: 2500"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Data Limite (Opcional)
                </label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors mt-2"
              >
                Criar Meta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL NOVA RECORRÊNCIA --- */}
      {openRecurringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Adicionar Lançamento Fixo / Recorrente
              </h3>
              <button onClick={() => setOpenRecurringModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecurring} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={recDesc}
                  onChange={(e) => setRecDesc(e.target.value)}
                  placeholder="Ex: Aluguel, Netflix, Salário..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={recType}
                    onChange={(e) => setRecType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    placeholder="Ex: 1200"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Frequência
                  </label>
                  <select
                    value={recFreq}
                    onChange={(e) => setRecFreq(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Dia de Cobrança
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={recBillingDay}
                    onChange={(e) => setRecBillingDay(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors mt-2"
              >
                Salvar Recorrência
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL NOVO PARCELAMENTO --- */}
      {openInstallmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cadastrar Compra Parcelada
              </h3>
              <button onClick={() => setOpenInstallmentModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInstallment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Descrição da Compra
                </label>
                <input
                  type="text"
                  value={instDesc}
                  onChange={(e) => setInstDesc(e.target.value)}
                  placeholder="Ex: Notebook, Passagem Aérea..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Valor Total (R$)
                  </label>
                  <input
                    type="text"
                    value={instTotal}
                    onChange={(e) => setInstTotal(e.target.value)}
                    placeholder="Ex: 3600"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Nº de Parcelas
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={instCount}
                    onChange={(e) => setInstCount(parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Data da 1ª Parcela / Compra
                  </label>
                  <input
                    type="date"
                    value={instStartDate}
                    onChange={(e) => setInstStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Parcelas Já Pagas (passadas)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={instCount - 1}
                    value={instPaidCount}
                    onChange={(e) => setInstPaidCount(Math.min(instCount - 1, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {cards.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Cartão de Crédito
                  </label>
                  <select
                    value={instCardId}
                    onChange={(e) => setInstCardId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (•••• {c.lastFourDigits || "0000"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors mt-2"
              >
                Gerar Parcelamento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL NOVA DÍVIDA / FINANCIAMENTO --- */}
      {openDebtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Cadastrar Dívida / Financiamento
                </h3>
              </div>
              <button onClick={() => setOpenDebtModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDebt} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Credor / Instituição Financeira *
                </label>
                <input
                  type="text"
                  value={debtCreditor}
                  onChange={(e) => setDebtCreditor(e.target.value)}
                  placeholder="Ex: Caixa Econômica, Santander, Fininvest..."
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Tipo de Passivo
                  </label>
                  <select
                    value={debtType}
                    onChange={(e) => setDebtType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="loan">Empréstimo Pessoal</option>
                    <option value="financing_real_estate">Financiamento Imobiliário</option>
                    <option value="financing_vehicle">Financiamento Veicular</option>
                    <option value="payroll_loan">Consignado</option>
                    <option value="credit_renegotiation">Renegociação de Cartão</option>
                    <option value="other">Outro Passivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Taxa de Juros (opcional)
                  </label>
                  <input
                    type="text"
                    value={debtInterestRate}
                    onChange={(e) => setDebtInterestRate(e.target.value)}
                    placeholder="Ex: 1.89% a.m."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Descrição ou Nº do Contrato
                </label>
                <input
                  type="text"
                  value={debtDesc}
                  onChange={(e) => setDebtDesc(e.target.value)}
                  placeholder="Ex: Contrato 84920/2024"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Valor Original (R$) *
                  </label>
                  <input
                    type="text"
                    value={debtTotalAmount}
                    onChange={(e) => setDebtTotalAmount(e.target.value)}
                    placeholder="Ex: 50000"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Saldo Devedor Atual (R$)
                  </label>
                  <input
                    type="text"
                    value={debtRemainingAmount}
                    onChange={(e) => setDebtRemainingAmount(e.target.value)}
                    placeholder="Se vazio, igual ao total"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Total de Parcelas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={420}
                    value={debtTotalInst}
                    onChange={(e) => setDebtTotalInst(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Parcelas Já Pagas
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={debtTotalInst}
                    value={debtPaidInst}
                    onChange={(e) => setDebtPaidInst(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Valor da Parcela (R$)
                  </label>
                  <input
                    type="text"
                    value={debtInstallmentAmount}
                    onChange={(e) => setDebtInstallmentAmount(e.target.value)}
                    placeholder="Ex: 850"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Próximo Vencimento
                  </label>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenDebtModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-md shadow-rose-600/20"
                >
                  Salvar Dívida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL PAGAR PARCELA DE DÍVIDA --- */}
      {openPayDebtModal && selectedDebtForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Pagar Parcela — {selectedDebtForPay.creditor}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Parcela {(selectedDebtForPay.paidInstallments || 0) + 1} de {selectedDebtForPay.totalInstallments}
                </span>
              </div>
              <button onClick={() => setOpenPayDebtModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Conta de Origem do Dinheiro
                </label>
                <select
                  value={payDebtAccountId}
                  onChange={(e) => setPayDebtAccountId(e.target.value)}
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
                  Valor da Parcela (R$)
                </label>
                <input
                  type="text"
                  value={payDebtAmount}
                  onChange={(e) => setPayDebtAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 space-y-1">
                <div>✓ Registra a despesa na conta bancária selecionada.</div>
                <div>✓ Amortiza automaticamente o saldo devedor do contrato.</div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
              >
                Confirmar Amortização
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
