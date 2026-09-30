"use server";

import { db } from "@/db";
import {
  accounts,
  categories,
  creditCards,
  creditCardStatements,
  installmentPlans,
  recurringTransactions,
  transactions,
  budgets,
  financialGoals,
  investments,
  notifications,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { toCents, splitInstallments, convertCurrency } from "@/lib/money";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { seedDemoData } from "@/db/seed";

// --- TRANSACTIONS ---

export async function createTransaction(data: {
  type: "income" | "expense" | "transfer";
  amount: number | string;
  currency?: string;
  date: string;
  description: string;
  categoryId?: string;
  accountId?: string;
  destinationAccountId?: string;
  creditCardId?: string;
  paymentMethod?: string;
  transactionNature?: "fixed" | "variable" | "installment" | "recurring";
  notes?: string;
  tags?: string;
  isPaid?: boolean;
}) {
  const user = await requireUser();
  const amountCents = toCents(data.amount);
  const currency = data.currency || user.primaryCurrency || "BRL";
  const now = new Date().toISOString();

  // Currency conversion if not primary
  const { convertedCents, rate } = convertCurrency(
    amountCents,
    currency,
    user.primaryCurrency || "BRL"
  );

  let statementId: string | null = null;
  if (data.creditCardId && data.type === "expense") {
    // Find or create active statement for this card and transaction date
    const txDate = new Date(data.date);
    const month = txDate.getMonth() + 1;
    const year = txDate.getFullYear();

    const existingStmt = await db
      .select()
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.creditCardId, data.creditCardId),
          eq(creditCardStatements.month, month),
          eq(creditCardStatements.year, year)
        )
      )
      .get();

    if (existingStmt) {
      statementId = existingStmt.id;
    } else {
      const card = await db
        .select()
        .from(creditCards)
        .where(eq(creditCards.id, data.creditCardId))
        .get();

      if (card) {
        statementId = crypto.randomUUID();
        await db.insert(creditCardStatements).values({
          id: statementId,
          creditCardId: data.creditCardId,
          userId: user.id,
          month,
          year,
          closingDate: `${year}-${String(month).padStart(2, "0")}-${String(card.closingDay).padStart(2, "0")}`,
          dueDate: `${year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-${String(card.dueDay).padStart(2, "0")}`,
          status: "open",
          paidAmountCents: 0,
          createdAt: now,
        });
      }
    }
  }

  const id = crypto.randomUUID();
  await db.insert(transactions).values({
    id,
    userId: user.id,
    type: data.type,
    amountCents: convertedCents,
    originalAmountCents: amountCents,
    originalCurrency: currency,
    exchangeRate: rate.toString(),
    date: data.date,
    description: data.description,
    categoryId: data.categoryId || null,
    accountId: data.accountId || null,
    destinationAccountId: data.destinationAccountId || null,
    creditCardId: data.creditCardId || null,
    statementId,
    paymentMethod: data.paymentMethod || "pix",
    transactionNature: data.transactionNature || "variable",
    notes: data.notes || null,
    tags: data.tags || null,
    isPaid: data.isPaid ?? (data.creditCardId ? false : true),
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return { success: true, id };
}

export async function updateTransaction(
  id: string,
  data: Partial<{
    type: "income" | "expense" | "transfer";
    amount: number | string;
    currency: string;
    date: string;
    description: string;
    categoryId: string;
    accountId: string;
    destinationAccountId: string;
    creditCardId: string;
    paymentMethod: string;
    transactionNature: "fixed" | "variable" | "installment" | "recurring";
    notes: string;
    tags: string;
    isPaid: boolean;
  }>
) {
  const user = await requireUser();
  const tx = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .get();

  if (!tx) throw new Error("Transaction not found");

  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.amount !== undefined) {
    const amountCents = toCents(data.amount);
    const currency = data.currency || tx.originalCurrency || user.primaryCurrency || "BRL";
    const { convertedCents, rate } = convertCurrency(
      amountCents,
      currency,
      user.primaryCurrency || "BRL"
    );
    updates.amountCents = convertedCents;
    updates.originalAmountCents = amountCents;
    updates.originalCurrency = currency;
    updates.exchangeRate = rate.toString();
  }

  if (data.type !== undefined) updates.type = data.type;
  if (data.date !== undefined) updates.date = data.date;
  if (data.description !== undefined) updates.description = data.description;
  if (data.categoryId !== undefined) updates.categoryId = data.categoryId || null;
  if (data.accountId !== undefined) updates.accountId = data.accountId || null;
  if (data.destinationAccountId !== undefined) updates.destinationAccountId = data.destinationAccountId || null;
  if (data.creditCardId !== undefined) updates.creditCardId = data.creditCardId || null;
  if (data.paymentMethod !== undefined) updates.paymentMethod = data.paymentMethod;
  if (data.transactionNature !== undefined) updates.transactionNature = data.transactionNature;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.tags !== undefined) updates.tags = data.tags;
  if (data.isPaid !== undefined) updates.isPaid = data.isPaid;

  await db
    .update(transactions)
    .set(updates)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return { success: true };
}

// --- INSTALLMENT PLANS ---

export async function createInstallmentPlan(data: {
  description: string;
  totalAmount: number | string;
  totalInstallments: number;
  categoryId?: string;
  creditCardId?: string;
  accountId?: string;
  startDate: string;
  notes?: string;
}) {
  const user = await requireUser();
  const totalAmountCents = toCents(data.totalAmount);
  const totalInstallments = Math.max(1, Math.min(60, data.totalInstallments));
  const planId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(installmentPlans).values({
    id: planId,
    userId: user.id,
    description: data.description,
    totalAmountCents,
    totalInstallments,
    categoryId: data.categoryId || null,
    creditCardId: data.creditCardId || null,
    accountId: data.accountId || null,
    startDate: data.startDate,
    notes: data.notes || null,
    createdAt: now,
  });

  // Generate split installments across months
  const parts = splitInstallments(totalAmountCents, totalInstallments);
  const start = new Date(data.startDate);

  for (let i = 0; i < totalInstallments; i++) {
    const installmentDate = new Date(start);
    installmentDate.setMonth(start.getMonth() + i);
    const dateStr = installmentDate.toISOString().split("T")[0];

    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      type: "expense",
      amountCents: parts[i],
      originalAmountCents: parts[i],
      originalCurrency: user.primaryCurrency || "BRL",
      date: dateStr,
      description: `${data.description} (${i + 1}/${totalInstallments})`,
      categoryId: data.categoryId || null,
      accountId: data.accountId || null,
      creditCardId: data.creditCardId || null,
      installmentPlanId: planId,
      installmentNumber: i + 1,
      paymentMethod: data.creditCardId ? "credit" : "other",
      transactionNature: "installment",
      isPaid: i === 0 && !data.creditCardId, // card purchases are marked paid when bill is cleared
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/planning");
  return { success: true, planId };
}

// --- ACCOUNTS ---

export async function createAccount(data: {
  name: string;
  type: string;
  institution: string;
  currency?: string;
  initialBalance: number | string;
  color?: string;
  icon?: string;
}) {
  const user = await requireUser();
  const initialBalanceCents = toCents(data.initialBalance);
  const now = new Date().toISOString();

  const id = crypto.randomUUID();
  await db.insert(accounts).values({
    id,
    userId: user.id,
    name: data.name,
    type: data.type,
    institution: data.institution || "Outro",
    currency: data.currency || user.primaryCurrency || "BRL",
    initialBalanceCents,
    color: data.color || "#10B981",
    icon: data.icon || "wallet",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  return { success: true, id };
}

export async function deleteAccount(id: string) {
  const user = await requireUser();
  await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
  revalidatePath("/");
  revalidatePath("/accounts");
  return { success: true };
}

// --- CREDIT CARDS ---

export async function createCreditCard(data: {
  name: string;
  bank: string;
  brand: string;
  lastFourDigits?: string;
  limit: number | string;
  closingDay: number;
  dueDay: number;
  color?: string;
}) {
  const user = await requireUser();
  const limitCents = toCents(data.limit);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.insert(creditCards).values({
    id,
    userId: user.id,
    name: data.name,
    bank: data.bank,
    brand: data.brand,
    lastFourDigits: data.lastFourDigits || "",
    limitCents,
    closingDay: data.closingDay,
    dueDay: data.dueDay,
    color: data.color || "#6366F1",
    currency: user.primaryCurrency || "BRL",
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/");
  revalidatePath("/cards");
  return { success: true, id };
}

// Pay Credit Card Bill (Clears invoice without double-counting expenses)
export async function payCreditCardBill(data: {
  creditCardId: string;
  accountId: string;
  amount: number | string;
  date: string;
}) {
  const user = await requireUser();
  const amountCents = toCents(data.amount);
  const now = new Date().toISOString();

  const card = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, data.creditCardId), eq(creditCards.userId, user.id)))
    .get();

  if (!card) throw new Error("Card not found");

  // Create payment transaction
  await db.insert(transactions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    type: "expense",
    amountCents,
    originalAmountCents: amountCents,
    originalCurrency: user.primaryCurrency || "BRL",
    date: data.date,
    description: `Pagamento Fatura ${card.name}`,
    accountId: data.accountId,
    creditCardId: data.creditCardId,
    paymentMethod: "pix",
    transactionNature: "fixed",
    isPaid: true,
    isCardBillPayment: true, // Marked to avoid double counting!
    createdAt: now,
    updatedAt: now,
  });

  // Mark pending card purchases up to this date as paid
  await db
    .update(transactions)
    .set({ isPaid: true, updatedAt: now })
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.creditCardId, data.creditCardId),
        eq(transactions.isPaid, false)
      )
    );

  revalidatePath("/");
  revalidatePath("/cards");
  revalidatePath("/transactions");
  return { success: true };
}

// --- RECURRING TRANSACTIONS ---

export async function createRecurringTransaction(data: {
  description: string;
  amount: number | string;
  type: "income" | "expense";
  frequency: "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual";
  startDate: string;
  billingDay: number;
  categoryId?: string;
  accountId?: string;
  creditCardId?: string;
  notes?: string;
}) {
  const user = await requireUser();
  const amountCents = toCents(data.amount);
  const now = new Date().toISOString();

  await db.insert(recurringTransactions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    description: data.description,
    amountCents,
    type: data.type,
    frequency: data.frequency,
    startDate: data.startDate,
    nextDueDate: data.startDate,
    billingDay: data.billingDay,
    categoryId: data.categoryId || null,
    accountId: data.accountId || null,
    creditCardId: data.creditCardId || null,
    currency: user.primaryCurrency || "BRL",
    notes: data.notes || null,
    isActive: true,
    createdAt: now,
  });

  revalidatePath("/planning");
  return { success: true };
}

// --- BUDGETS ---

export async function setBudget(data: {
  categoryId: string;
  amount: number | string;
  month: number;
  year: number;
  alertThreshold?: number;
}) {
  const user = await requireUser();
  const amountCents = toCents(data.amount);
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, user.id),
        eq(budgets.categoryId, data.categoryId),
        eq(budgets.month, data.month),
        eq(budgets.year, data.year)
      )
    )
    .get();

  if (existing) {
    await db
      .update(budgets)
      .set({
        amountCents,
        alertThreshold: data.alertThreshold ?? existing.alertThreshold,
        updatedAt: now,
      })
      .where(eq(budgets.id, existing.id));
  } else {
    await db.insert(budgets).values({
      id: crypto.randomUUID(),
      userId: user.id,
      categoryId: data.categoryId,
      month: data.month,
      year: data.year,
      amountCents,
      alertThreshold: data.alertThreshold ?? 80,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath("/planning");
  revalidatePath("/");
  return { success: true };
}

// --- FINANCIAL GOALS ---

export async function createFinancialGoal(data: {
  name: string;
  targetAmount: number | string;
  currentAmount?: number | string;
  targetDate?: string;
  categoryId?: string;
  accountId?: string;
  color?: string;
  icon?: string;
  notes?: string;
}) {
  const user = await requireUser();
  const targetAmountCents = toCents(data.targetAmount);
  const currentAmountCents = toCents(data.currentAmount || 0);
  const now = new Date().toISOString();

  await db.insert(financialGoals).values({
    id: crypto.randomUUID(),
    userId: user.id,
    name: data.name,
    targetAmountCents,
    currentAmountCents,
    targetDate: data.targetDate || null,
    categoryId: data.categoryId || null,
    accountId: data.accountId || null,
    icon: data.icon || "target",
    color: data.color || "#10B981",
    notes: data.notes || null,
    status: currentAmountCents >= targetAmountCents ? "completed" : "in_progress",
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/planning");
  return { success: true };
}

// --- INVESTMENTS ---

export async function createInvestment(data: {
  name: string;
  type: string;
  institution: string;
  quantity: string;
  averagePrice: number | string;
  totalInvested: number | string;
  currentValue: number | string;
  purchaseDate?: string;
  notes?: string;
}) {
  const user = await requireUser();
  const now = new Date().toISOString();

  await db.insert(investments).values({
    id: crypto.randomUUID(),
    userId: user.id,
    name: data.name,
    type: data.type,
    institution: data.institution || "Outro",
    quantity: data.quantity || "1",
    averagePriceCents: toCents(data.averagePrice),
    totalInvestedCents: toCents(data.totalInvested),
    currentValueCents: toCents(data.currentValue),
    currency: user.primaryCurrency || "BRL",
    purchaseDate: data.purchaseDate || null,
    notes: data.notes || null,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/");
  revalidatePath("/investments");
  return { success: true };
}

// --- SEED DEMO & RESET FOR CURRENT USER ---

export async function populateUserWithDemoData() {
  const user = await requireUser();
  await seedDemoData(user.id);
  revalidatePath("/");
  return { success: true };
}

export async function wipeUserData() {
  const user = await requireUser();
  await db.delete(transactions).where(eq(transactions.userId, user.id));
  await db.delete(installmentPlans).where(eq(installmentPlans.userId, user.id));
  await db.delete(recurringTransactions).where(eq(recurringTransactions.userId, user.id));
  await db.delete(creditCardStatements).where(eq(creditCardStatements.userId, user.id));
  await db.delete(creditCards).where(eq(creditCards.userId, user.id));
  await db.delete(budgets).where(eq(budgets.userId, user.id));
  await db.delete(financialGoals).where(eq(financialGoals.userId, user.id));
  await db.delete(investments).where(eq(investments.userId, user.id));
  await db.delete(accounts).where(eq(accounts.userId, user.id));
  await db.delete(notifications).where(eq(notifications.userId, user.id));

  revalidatePath("/");
  return { success: true };
}
