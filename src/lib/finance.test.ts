import { describe, it } from "node:test";
import assert from "node:assert";
import {
  toCents,
  fromCents,
  formatMoney,
  splitInstallments,
  convertCurrency,
} from "./money";
import {
  calculateAccountBalance,
  calculateFinancialSummary,
  calculateBudgetProgress,
  calculateCreditCardUsage,
  AccountItem,
  TransactionItem,
} from "./finance";

describe("Financial Domain Rules - Money and Cents Precision", () => {
  it("converts float values and strings accurately to integer cents without floating point drift", () => {
    assert.strictEqual(toCents(42.5), 4250);
    assert.strictEqual(toCents("42,50"), 4250);
    assert.strictEqual(toCents("1.250,99"), 125099);
    assert.strictEqual(toCents(0.1 + 0.2), 30); // tests the classic 0.30000000000000004 issue
    assert.strictEqual(fromCents(4250), 42.5);
  });

  it("splits installments cleanly without losing cents", () => {
    // R$ 100,00 divided in 3 installments
    const parts = splitInstallments(10000, 3);
    assert.deepStrictEqual(parts, [3334, 3333, 3333]);
    assert.strictEqual(parts.reduce((a, b) => a + b, 0), 10000);

    // R$ 3.600,00 in 12 installments
    const parts12 = splitInstallments(360000, 12);
    assert.strictEqual(parts12.length, 12);
    assert.strictEqual(parts12.every((p) => p === 30000), true);
    assert.strictEqual(parts12.reduce((a, b) => a + b, 0), 360000);
  });

  it("formats money correctly into Brazilian Real", () => {
    const formatted = formatMoney(428000, "BRL", "pt-BR");
    assert.ok(formatted.includes("4.280,00"));
  });

  it("converts between currencies using stored rate without losing original amount", () => {
    // 100 USD (10000 cents) at rate 5.45 -> 54500 cents BRL
    const { convertedCents, rate } = convertCurrency(10000, "USD", "BRL", 5.45);
    assert.strictEqual(convertedCents, 54500);
    assert.strictEqual(rate, 5.45);
  });
});

describe("Financial Domain Rules - Account Balances and Cash Flow", () => {
  const accountA: AccountItem = {
    id: "acc-1",
    name: "Conta Corrente",
    type: "checking",
    institution: "Nubank",
    currency: "BRL",
    initialBalanceCents: 100000, // R$ 1.000,00
  };

  const accountB: AccountItem = {
    id: "acc-2",
    name: "Poupança",
    type: "savings",
    institution: "Itaú",
    currency: "BRL",
    initialBalanceCents: 50000, // R$ 500,00
  };

  it("increases account balance with income and decreases with expense", () => {
    const txs: TransactionItem[] = [
      {
        id: "tx-1",
        type: "income",
        amountCents: 50000, // + R$ 500,00
        originalAmountCents: 50000,
        originalCurrency: "BRL",
        date: "2026-09-01",
        description: "Salário",
        accountId: "acc-1",
        paymentMethod: "pix",
        transactionNature: "fixed",
        isPaid: true,
      },
      {
        id: "tx-2",
        type: "expense",
        amountCents: 20000, // - R$ 200,00
        originalAmountCents: 20000,
        originalCurrency: "BRL",
        date: "2026-09-02",
        description: "Supermercado",
        accountId: "acc-1",
        paymentMethod: "debit",
        transactionNature: "variable",
        isPaid: true,
      },
    ];

    const balance = calculateAccountBalance(accountA, txs);
    // 1000 + 500 - 200 = 1300 (130000 cents)
    assert.strictEqual(balance, 130000);
  });

  it("handles internal transfer: transfers money between accounts without altering net worth or income/expense", () => {
    const transferTx: TransactionItem = {
      id: "tx-transfer",
      type: "transfer",
      amountCents: 30000, // R$ 300,00 transferred from acc-1 to acc-2
      originalAmountCents: 30000,
      originalCurrency: "BRL",
      date: "2026-09-05",
      description: "Transferência para Poupança",
      accountId: "acc-1",
      destinationAccountId: "acc-2",
      paymentMethod: "transfer",
      transactionNature: "variable",
      isPaid: true,
    };

    const balA = calculateAccountBalance(accountA, [transferTx]);
    const balB = calculateAccountBalance(accountB, [transferTx]);

    assert.strictEqual(balA, 70000); // 1000 - 300 = 700
    assert.strictEqual(balB, 80000); // 500 + 300 = 800

    const summary = calculateFinancialSummary({
      accounts: [accountA, accountB],
      transactions: [transferTx],
      investments: [],
      creditCards: [],
    });

    // Net worth must remain R$ 1.500,00 (150000 cents)
    assert.strictEqual(summary.netWorthCents, 150000);
    // Transfer must NOT be counted as income or expense
    assert.strictEqual(summary.totalIncomeCents, 0);
    assert.strictEqual(summary.totalExpenseCents, 0);
  });

  it("does not duplicate expenses when credit card bill is paid", () => {
    const cardPurchase: TransactionItem = {
      id: "tx-purchase",
      type: "expense",
      amountCents: 15000, // R$ 150,00
      originalAmountCents: 15000,
      originalCurrency: "BRL",
      date: "2026-09-08",
      description: "Restaurante",
      creditCardId: "card-1",
      paymentMethod: "credit",
      transactionNature: "variable",
      isPaid: false,
    };

    const billPayment: TransactionItem = {
      id: "tx-bill-pay",
      type: "expense",
      amountCents: 15000,
      originalAmountCents: 15000,
      originalCurrency: "BRL",
      date: "2026-09-20",
      description: "Pagamento Fatura Nubank",
      accountId: "acc-1",
      creditCardId: "card-1",
      paymentMethod: "pix",
      transactionNature: "fixed",
      isPaid: true,
      isCardBillPayment: true, // flagged as bill payment!
    };

    const summary = calculateFinancialSummary({
      accounts: [accountA],
      transactions: [cardPurchase, billPayment],
      investments: [],
      creditCards: [],
    });

    // Total expense is only R$ 150,00 (15000 cents), NOT 30000 cents!
    assert.strictEqual(summary.totalExpenseCents, 15000);
  });
});

describe("Financial Domain Rules - Budgets and Credit Cards", () => {
  it("calculates budget progress and warning states correctly", () => {
    // Budget: R$ 800,00 (80000 cents)
    // Spent: R$ 600,00 (60000 cents) -> 75% -> normal
    const normal = calculateBudgetProgress(80000, 60000);
    assert.strictEqual(normal.percentage, 75);
    assert.strictEqual(normal.status, "normal");

    // Spent: R$ 700,00 (70000 cents) -> 87.5% -> warning (> 80%)
    const warning = calculateBudgetProgress(80000, 70000);
    assert.strictEqual(warning.status, "warning");

    // Spent: R$ 850,00 (85000 cents) -> 106% -> danger (> 100%)
    const danger = calculateBudgetProgress(80000, 85000);
    assert.strictEqual(danger.status, "danger");
    assert.strictEqual(danger.remainingCents, -5000);
  });

  it("calculates credit card limit usage correctly", () => {
    const card = {
      id: "card-1",
      name: "Nubank Ultravioleta",
      limitCents: 500000, // R$ 5.000,00
      closingDay: 1,
      dueDay: 10,
    };

    const txs: TransactionItem[] = [
      {
        id: "tx-c1",
        type: "expense",
        amountCents: 214000, // R$ 2.140,00
        originalAmountCents: 214000,
        originalCurrency: "BRL",
        date: "2026-09-10",
        description: "Comprinhas",
        creditCardId: "card-1",
        paymentMethod: "credit",
        transactionNature: "variable",
        isPaid: false,
      },
    ];

    const usage = calculateCreditCardUsage(card, txs);
    assert.strictEqual(usage.usedLimitCents, 214000);
    assert.strictEqual(usage.availableLimitCents, 286000); // 5000 - 2140 = 2860
    assert.strictEqual(usage.usagePercentage, 43);
  });
});
