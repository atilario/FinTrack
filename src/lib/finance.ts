import { splitInstallments, fromCents, toCents } from "./money";

export interface TransactionItem {
  id: string;
  type: "income" | "expense" | "transfer";
  amountCents: number;
  originalAmountCents: number;
  originalCurrency: string;
  exchangeRate?: string | null;
  date: string;
  description: string;
  categoryId?: string | null;
  accountId?: string | null;
  destinationAccountId?: string | null;
  creditCardId?: string | null;
  statementId?: string | null;
  installmentPlanId?: string | null;
  installmentNumber?: number | null;
  paymentMethod: string;
  transactionNature: string;
  isPaid: boolean;
  isCardBillPayment?: boolean | null;
}

export interface AccountItem {
  id: string;
  name: string;
  type: string;
  institution: string;
  currency: string;
  initialBalanceCents: number;
}

export interface InvestmentItem {
  id: string;
  name: string;
  type: string;
  totalInvestedCents: number;
  currentValueCents: number;
}

export interface CreditCardItem {
  id: string;
  name: string;
  limitCents: number;
  closingDay: number;
  dueDay: number;
}

/**
 * Calculates current balance for a single bank/cash account based on:
 * - Initial balance
 * - Incomes deposited directly to this account
 * - Expenses paid from this account (excludes credit card purchases which don't deplete account cash immediately)
 * - Transfers received (+)
 * - Transfers sent (-)
 * - Credit card invoice payments made from this account (-)
 */
export function calculateAccountBalance(
  account: AccountItem,
  transactions: TransactionItem[]
): number {
  let balance = account.initialBalanceCents;

  for (const tx of transactions) {
    if (!tx.isPaid) continue;

    // Direct income deposited into this account
    if (tx.type === "income" && tx.accountId === account.id) {
      balance += tx.amountCents;
    }

    // Direct expense paid from this account (not credit card purchases)
    if (tx.type === "expense" && tx.accountId === account.id) {
      balance -= tx.amountCents;
    }

    // Internal transfers: Sent from this account
    if (tx.type === "transfer" && tx.accountId === account.id) {
      balance -= tx.amountCents;
    }

    // Internal transfers: Received into this account
    if (tx.type === "transfer" && tx.destinationAccountId === account.id) {
      balance += tx.amountCents;
    }
  }

  return balance;
}

/**
 * Calculates total financial summary for a user:
 * - Total available balance (sum of all liquid accounts: checking, savings, cash, digital)
 * - Total income in the given period (transfers excluded!)
 * - Total expenses in the given period (transfers & invoice payments excluded to prevent double counting!)
 * - Total investments value
 * - Net worth (Patrimônio Líquido) = liquid balances + investments - unpaid credit card balances
 */
export function calculateFinancialSummary(params: {
  accounts: AccountItem[];
  transactions: TransactionItem[];
  investments: InvestmentItem[];
  creditCards: CreditCardItem[];
}) {
  const { accounts, transactions, investments } = params;

  // 1. Account balances
  const accountBalances: Record<string, number> = {};
  let totalAvailableBalanceCents = 0;

  for (const acc of accounts) {
    const bal = calculateAccountBalance(acc, transactions);
    accountBalances[acc.id] = bal;
    totalAvailableBalanceCents += bal;
  }

  // 2. Period Incomes and Expenses
  let totalIncomeCents = 0;
  let totalExpenseCents = 0;
  let fixedExpenseCents = 0;
  let variableExpenseCents = 0;

  for (const tx of transactions) {
    // Transfers NEVER count as income or expense
    if (tx.type === "transfer") continue;

    if (tx.type === "income") {
      totalIncomeCents += tx.amountCents;
    } else if (tx.type === "expense") {
      // If this is a credit card bill payment, don't count it as a regular expense
      // because individual purchases were already accounted for in category expenses.
      if (tx.isCardBillPayment) continue;

      totalExpenseCents += tx.amountCents;
      if (tx.transactionNature === "fixed") {
        fixedExpenseCents += tx.amountCents;
      } else {
        variableExpenseCents += tx.amountCents;
      }
    }
  }

  // 3. Investments summary
  let totalInvestedCents = 0;
  let totalInvestmentValueCents = 0;
  for (const inv of investments) {
    totalInvestedCents += inv.totalInvestedCents;
    totalInvestmentValueCents += inv.currentValueCents;
  }
  const investmentProfitCents = totalInvestmentValueCents - totalInvestedCents;
  const investmentYieldPercent =
    totalInvestedCents > 0
      ? ((totalInvestmentValueCents - totalInvestedCents) / totalInvestedCents) * 100
      : 0;

  // 4. Net worth
  const netWorthCents = totalAvailableBalanceCents + totalInvestmentValueCents;

  return {
    totalAvailableBalanceCents,
    totalIncomeCents,
    totalExpenseCents,
    fixedExpenseCents,
    variableExpenseCents,
    totalInvestedCents,
    totalInvestmentValueCents,
    investmentProfitCents,
    investmentYieldPercent,
    netWorthCents,
    accountBalances,
  };
}

/**
 * Calculates credit card usage:
 * - limitCents
 * - usedLimitCents (sum of purchases that haven't been paid by bill payment)
 * - availableLimitCents
 */
export function calculateCreditCardUsage(
  card: CreditCardItem,
  transactions: TransactionItem[]
) {
  let usedLimitCents = 0;

  for (const tx of transactions) {
    if (tx.creditCardId === card.id && tx.type === "expense" && !tx.isCardBillPayment) {
      // If purchase is unpaid or statement not paid yet
      if (!tx.isPaid) {
        usedLimitCents += tx.amountCents;
      }
    }
  }

  const availableLimitCents = Math.max(0, card.limitCents - usedLimitCents);

  return {
    cardId: card.id,
    limitCents: card.limitCents,
    usedLimitCents,
    availableLimitCents,
    usagePercentage: card.limitCents > 0 ? Math.min(100, Math.round((usedLimitCents / card.limitCents) * 100)) : 0,
  };
}

/**
 * Budget progress calculation
 */
export function calculateBudgetProgress(budgetAmountCents: number, spentCents: number) {
  const percentage = budgetAmountCents > 0 ? (spentCents / budgetAmountCents) * 100 : 0;
  const remainingCents = budgetAmountCents - spentCents;

  let status: "normal" | "warning" | "danger" = "normal";
  if (percentage >= 100) {
    status = "danger";
  } else if (percentage >= 80) {
    status = "warning";
  }

  return {
    budgetAmountCents,
    spentCents,
    remainingCents,
    percentage: Math.round(percentage),
    status,
  };
}

/**
 * Financial forecast for upcoming months
 */
export function calculateForecast(params: {
  currentBalanceCents: number;
  monthlyRecurringIncomeCents: number;
  monthlyRecurringExpenseCents: number;
  averageVariableExpenseCents: number;
  pendingInstallmentsByMonth: { monthLabel: string; amountCents: number }[];
  monthsAhead?: number;
}) {
  const {
    currentBalanceCents,
    monthlyRecurringIncomeCents,
    monthlyRecurringExpenseCents,
    averageVariableExpenseCents,
    pendingInstallmentsByMonth,
    monthsAhead = 6,
  } = params;

  let projectedBalance = currentBalanceCents;
  const projections = [];

  for (let i = 0; i < monthsAhead; i++) {
    const installmentAmount = pendingInstallmentsByMonth[i]?.amountCents || 0;
    const projectedIncome = monthlyRecurringIncomeCents;
    const projectedExpense =
      monthlyRecurringExpenseCents + averageVariableExpenseCents + installmentAmount;
    const netCashflow = projectedIncome - projectedExpense;
    projectedBalance += netCashflow;

    projections.push({
      monthIndex: i + 1,
      label: pendingInstallmentsByMonth[i]?.monthLabel || `Mês +${i + 1}`,
      projectedIncomeCents: projectedIncome,
      projectedExpenseCents: projectedExpense,
      installmentCents: installmentAmount,
      netCashflowCents: netCashflow,
      projectedBalanceCents: projectedBalance,
    });
  }

  return projections;
}
