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
  currency?: string;
  bank?: string;
  brand?: string;
}

export interface DebtItem {
  id: string;
  creditor: string;
  description?: string | null;
  totalAmountCents: number;
  remainingAmountCents: number;
  interestRate?: string | null;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmountCents: number;
  nextDueDate?: string | null;
  status: string;
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
  creditCards?: CreditCardItem[];
  debts?: DebtItem[];
}) {
  const { accounts, transactions, investments, creditCards = [], debts = [] } = params;

  // 1. Account balances (Liquid money in bank accounts)
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

  // 4. Credit Card Invoices & Available Credit
  let totalOpenInvoicesCents = 0;
  let totalCreditLimitCents = 0;
  let totalAvailableCreditCents = 0;

  for (const card of creditCards) {
    const usage = calculateCreditCardUsage(card, transactions);
    totalOpenInvoicesCents += usage.usedLimitCents;
    totalCreditLimitCents += card.limitCents;
    totalAvailableCreditCents += usage.availableLimitCents;
  }

  // 5. Active Debts
  let totalDebtsCents = 0;
  for (const debt of debts) {
    if (debt.status === "active" || debt.status === "overdue") {
      totalDebtsCents += debt.remainingAmountCents;
    }
  }

  // 6. Realistic Net Worth (Patrimônio Líquido = Ativos - Passivos/Obrigações)
  const totalAssetsCents = totalAvailableBalanceCents + totalInvestmentValueCents;
  const totalLiabilitiesCents = totalOpenInvoicesCents + totalDebtsCents;
  const netWorthCents = totalAssetsCents - totalLiabilitiesCents;

  return {
    totalAvailableBalanceCents, // Dinheiro Real em Conta
    totalCreditLimitCents,      // Limite Total dos Cartões
    totalAvailableCreditCents,  // Crédito Disponível (NÃO é dinheiro!)
    totalOpenInvoicesCents,     // Faturas em Aberto a Pagar
    totalDebtsCents,            // Dívidas e Empréstimos Ativos
    totalAssetsCents,           // Ativos (Contas + Investimentos)
    totalLiabilitiesCents,      // Obrigações (Faturas + Dívidas)
    netWorthCents,              // Patrimônio Líquido Real
    totalIncomeCents,
    totalExpenseCents,
    fixedExpenseCents,
    variableExpenseCents,
    totalInvestedCents,
    totalInvestmentValueCents,
    investmentProfitCents,
    investmentYieldPercent,
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

/**
 * Computes which statement cycle a credit card purchase belongs to:
 * - If day of purchase <= closingDay => current month statement
 * - If day of purchase > closingDay => next month statement!
 */
export function determineCardStatementPeriod(
  purchaseDateStr: string,
  closingDay: number,
  dueDay: number
) {
  const parts = purchaseDateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1 to 12
  const day = parseInt(parts[2], 10);

  let statementMonth = month;
  let statementYear = year;

  // After closing day, purchase rolls into the next statement!
  if (day > closingDay) {
    statementMonth += 1;
    if (statementMonth > 12) {
      statementMonth = 1;
      statementYear += 1;
    }
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return {
    statementMonth,
    statementYear,
    monthLabel: `${monthNames[statementMonth - 1]} de ${statementYear}`,
    closingDateStr: `${statementYear}-${String(statementMonth).padStart(2, "0")}-${String(closingDay).padStart(2, "0")}`,
    dueDateStr: `${statementYear}-${String(statementMonth).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`,
  };
}

/**
 * Projects upcoming statements for a credit card for the next N months.
 * Aggregates regular purchases and installment slices.
 */
export function calculateCardStatementsProjection(
  card: CreditCardItem,
  transactions: TransactionItem[],
  monthsCount = 6
) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1 to 12
  const currentYear = now.getFullYear();

  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  const projections = [];

  for (let i = 0; i < monthsCount; i++) {
    let targetMonth = currentMonth + i;
    let targetYear = currentYear;
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }

    let purchasesTotalCents = 0;
    const purchases: TransactionItem[] = [];

    for (const tx of transactions) {
      if (tx.creditCardId === card.id && tx.type === "expense" && !tx.isCardBillPayment) {
        const period = determineCardStatementPeriod(tx.date, card.closingDay, card.dueDay);
        if (period.statementMonth === targetMonth && period.statementYear === targetYear) {
          purchasesTotalCents += tx.amountCents;
          purchases.push(tx);
        }
      }
    }

    projections.push({
      month: targetMonth,
      year: targetYear,
      monthLabel: `${monthNames[targetMonth - 1]}/${targetYear.toString().slice(-2)}`,
      fullLabel: `${monthNames[targetMonth - 1]} ${targetYear}`,
      isCurrentStatement: i === 0,
      totalAmountCents: purchasesTotalCents,
      purchasesCount: purchases.length,
      purchases,
      closingDate: `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(card.closingDay).padStart(2, "0")}`,
      dueDate: `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(card.dueDay).padStart(2, "0")}`,
    });
  }

  return projections;
}
