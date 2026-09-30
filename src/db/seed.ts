import { db } from "./index";
import {
  users,
  userPreferences,
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
} from "./schema";
import { hashPassword } from "../lib/auth";
import { eq } from "drizzle-orm";
import { toCents, splitInstallments } from "../lib/money";

export const DEFAULT_CATEGORIES = [
  // Expenses
  { name: "Alimentação", icon: "Utensils", color: "#F59E0B", type: "expense" },
  { name: "Supermercado", icon: "ShoppingCart", color: "#10B981", type: "expense" },
  { name: "Moradia", icon: "Home", color: "#6366F1", type: "expense" },
  { name: "Transporte", icon: "Car", color: "#3B82F6", type: "expense" },
  { name: "Lazer & Viagem", icon: "Plane", color: "#EC4899", type: "expense" },
  { name: "Saúde & Cuidados", icon: "HeartPulse", color: "#EF4444", type: "expense" },
  { name: "Educação", icon: "GraduationCap", color: "#8B5CF6", type: "expense" },
  { name: "Assinaturas & Serviços", icon: "Tv", color: "#14B8A6", type: "expense" },
  { name: "Compras Pessoais", icon: "ShoppingBag", color: "#F97316", type: "expense" },
  { name: "Outras Despesas", icon: "MoreHorizontal", color: "#6B7280", type: "expense" },

  // Incomes
  { name: "Salário Principal", icon: "Briefcase", color: "#10B981", type: "income" },
  { name: "Freelance / Projetos", icon: "Laptop", color: "#06B6D4", type: "income" },
  { name: "Rendimentos & Dividendos", icon: "TrendingUp", color: "#8B5CF6", type: "income" },
  { name: "Vendas & Reembolsos", icon: "Receipt", color: "#F59E0B", type: "income" },
  { name: "Outras Receitas", icon: "PlusCircle", color: "#3B82F6", type: "income" },
];

export async function ensureDefaultCategories(userId?: string) {
  const existing = await db.select().from(categories).limit(1);
  if (existing.length === 0) {
    const now = new Date().toISOString();
    for (const cat of DEFAULT_CATEGORIES) {
      await db.insert(categories).values({
        id: crypto.randomUUID(),
        userId: userId || null,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        isSystem: true,
        createdAt: now,
      });
    }
  }
}

export async function seedDemoData(targetUserId: string) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 to 12
  const nowIso = now.toISOString();
  const todayStr = now.toISOString().split("T")[0];

  // 1. Ensure categories
  await ensureDefaultCategories(targetUserId);
  const userCats = await db.select().from(categories);
  const getCat = (name: string) => userCats.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))?.id;

  // 2. Create Accounts
  const checkingAccId = crypto.randomUUID();
  const savingsAccId = crypto.randomUUID();
  const investmentAccId = crypto.randomUUID();

  await db.insert(accounts).values([
    {
      id: checkingAccId,
      userId: targetUserId,
      name: "Nubank Conta Principal",
      type: "checking",
      institution: "Nubank",
      currency: "BRL",
      initialBalanceCents: toCents(3500), // R$ 3.500,00
      color: "#8B5CF6",
      icon: "Landmark",
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: savingsAccId,
      userId: targetUserId,
      name: "Reserva de Emergência",
      type: "savings",
      institution: "Itaú",
      currency: "BRL",
      initialBalanceCents: toCents(12000), // R$ 12.000,00
      color: "#F59E0B",
      icon: "ShieldCheck",
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: investmentAccId,
      userId: targetUserId,
      name: "XP Investimentos",
      type: "investment",
      institution: "XP",
      currency: "BRL",
      initialBalanceCents: toCents(25000), // R$ 25.000,00
      color: "#10B981",
      icon: "TrendingUp",
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);

  // 3. Create Credit Cards
  const cardId = crypto.randomUUID();
  await db.insert(creditCards).values({
    id: cardId,
    userId: targetUserId,
    name: "Nubank Ultravioleta",
    bank: "Nubank",
    brand: "mastercard",
    lastFourDigits: "4829",
    limitCents: toCents(10000), // R$ 10.000,00
    closingDay: 25,
    dueDay: 5,
    color: "#6366F1",
    currency: "BRL",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // Statement for current month
  const statementId = crypto.randomUUID();
  await db.insert(creditCardStatements).values({
    id: statementId,
    creditCardId: cardId,
    userId: targetUserId,
    month: currentMonth,
    year: currentYear,
    closingDate: `${currentYear}-${String(currentMonth).padStart(2, "0")}-25`,
    dueDate: `${currentYear}-${String(currentMonth === 12 ? 1 : currentMonth + 1).padStart(2, "0")}-05`,
    status: "open",
    paidAmountCents: 0,
    createdAt: nowIso,
  });

  // 4. Create Installment Plan (Notebook Dell - 10x de R$ 350)
  const installmentPlanId = crypto.randomUUID();
  const totalNotebookCents = toCents(3500); // R$ 3.500,00
  const totalInstallments = 10;
  const parts = splitInstallments(totalNotebookCents, totalInstallments);

  await db.insert(installmentPlans).values({
    id: installmentPlanId,
    userId: targetUserId,
    description: "Notebook Dell Inspiron",
    totalAmountCents: totalNotebookCents,
    totalInstallments: totalInstallments,
    categoryId: getCat("Compras"),
    creditCardId: cardId,
    startDate: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
    notes: "Parcelamento sem juros",
    createdAt: nowIso,
  });

  // Create current installment transaction
  await db.insert(transactions).values({
    id: crypto.randomUUID(),
    userId: targetUserId,
    type: "expense",
    amountCents: parts[0],
    originalAmountCents: parts[0],
    originalCurrency: "BRL",
    date: todayStr,
    description: "Notebook Dell Inspiron (1/10)",
    categoryId: getCat("Compras"),
    creditCardId: cardId,
    statementId: statementId,
    installmentPlanId: installmentPlanId,
    installmentNumber: 1,
    paymentMethod: "credit",
    transactionNature: "installment",
    isPaid: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 5. Recurring Transactions
  await db.insert(recurringTransactions).values([
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      description: "Salário Empresa Tech",
      amountCents: toCents(8500),
      type: "income",
      frequency: "monthly",
      startDate: `${currentYear}-01-05`,
      nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, "0")}-05`,
      billingDay: 5,
      categoryId: getCat("Salário"),
      accountId: checkingAccId,
      currency: "BRL",
      isActive: true,
      createdAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      description: "Aluguel & Condomínio",
      amountCents: toCents(2100),
      type: "expense",
      frequency: "monthly",
      startDate: `${currentYear}-01-10`,
      nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, "0")}-10`,
      billingDay: 10,
      categoryId: getCat("Moradia"),
      accountId: checkingAccId,
      currency: "BRL",
      isActive: true,
      createdAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      description: "Netflix & Spotify",
      amountCents: toCents(85.8),
      type: "expense",
      frequency: "monthly",
      startDate: `${currentYear}-01-15`,
      nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, "0")}-15`,
      billingDay: 15,
      categoryId: getCat("Assinaturas"),
      creditCardId: cardId,
      currency: "BRL",
      isActive: true,
      createdAt: nowIso,
    },
  ]);

  // 6. Realistic Transactions for Current Month
  await db.insert(transactions).values([
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      type: "income",
      amountCents: toCents(8500),
      originalAmountCents: toCents(8500),
      originalCurrency: "BRL",
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-05`,
      description: "Salário Mensal - Tech Corp",
      categoryId: getCat("Salário"),
      accountId: checkingAccId,
      paymentMethod: "pix",
      transactionNature: "fixed",
      isPaid: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      type: "income",
      amountCents: toCents(1200),
      originalAmountCents: toCents(1200),
      originalCurrency: "BRL",
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-12`,
      description: "Freelance Consultoria UX",
      categoryId: getCat("Freelance"),
      accountId: checkingAccId,
      paymentMethod: "pix",
      transactionNature: "variable",
      isPaid: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      type: "expense",
      amountCents: toCents(2100),
      originalAmountCents: toCents(2100),
      originalCurrency: "BRL",
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-10`,
      description: "Aluguel Apartamento",
      categoryId: getCat("Moradia"),
      accountId: checkingAccId,
      paymentMethod: "pix",
      transactionNature: "fixed",
      isPaid: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      type: "expense",
      amountCents: toCents(650.4),
      originalAmountCents: toCents(650.4),
      originalCurrency: "BRL",
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-08`,
      description: "Supermercado Mensal - Pão de Açúcar",
      categoryId: getCat("Supermercado"),
      accountId: checkingAccId,
      paymentMethod: "debit",
      transactionNature: "variable",
      isPaid: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      type: "expense",
      amountCents: toCents(180),
      originalAmountCents: toCents(180),
      originalCurrency: "BRL",
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-14`,
      description: "Jantar Restaurante Italiano",
      categoryId: getCat("Alimentação"),
      creditCardId: cardId,
      statementId: statementId,
      paymentMethod: "credit",
      transactionNature: "variable",
      isPaid: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      type: "expense",
      amountCents: toCents(220),
      originalAmountCents: toCents(220),
      originalCurrency: "BRL",
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-18`,
      description: "Combustível Posto Ipiranga",
      categoryId: getCat("Transporte"),
      accountId: checkingAccId,
      paymentMethod: "debit",
      transactionNature: "variable",
      isPaid: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      type: "transfer",
      amountCents: toCents(1500),
      originalAmountCents: toCents(1500),
      originalCurrency: "BRL",
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-06`,
      description: "Aporte Reserva de Emergência",
      accountId: checkingAccId,
      destinationAccountId: savingsAccId,
      paymentMethod: "transfer",
      transactionNature: "variable",
      isPaid: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);

  // 7. Budgets for Current Month
  await db.insert(budgets).values([
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      categoryId: getCat("Alimentação") || "",
      month: currentMonth,
      year: currentYear,
      amountCents: toCents(900), // R$ 900,00
      alertThreshold: 80,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      categoryId: getCat("Transporte") || "",
      month: currentMonth,
      year: currentYear,
      amountCents: toCents(450), // R$ 450,00
      alertThreshold: 80,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      categoryId: getCat("Lazer") || "",
      month: currentMonth,
      year: currentYear,
      amountCents: toCents(500), // R$ 500,00
      alertThreshold: 80,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);

  // 8. Financial Goals
  await db.insert(financialGoals).values([
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      name: "Viagem Europa 2027",
      targetAmountCents: toCents(25000), // R$ 25.000
      currentAmountCents: toCents(11250), // 45%
      targetDate: `${currentYear + 1}-07-15`,
      categoryId: getCat("Lazer"),
      accountId: savingsAccId,
      icon: "Plane",
      color: "#3B82F6",
      status: "in_progress",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      name: "Novo Mac Mini M4",
      targetAmountCents: toCents(8000),
      currentAmountCents: toCents(6400), // 80%
      targetDate: `${currentYear}-12-20`,
      icon: "Laptop",
      color: "#10B981",
      status: "in_progress",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);

  // 9. Investments
  await db.insert(investments).values([
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      name: "Tesouro Selic 2029",
      type: "fixed_income",
      institution: "XP Investimentos",
      quantity: "1",
      averagePriceCents: toCents(14000),
      totalInvestedCents: toCents(14000),
      currentValueCents: toCents(14950), // + 950 lucro
      currency: "BRL",
      purchaseDate: `${currentYear}-01-15`,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      name: "ITSA4 - Itaúsa",
      type: "stocks",
      institution: "XP Investimentos",
      quantity: "500",
      averagePriceCents: toCents(9.8),
      totalInvestedCents: toCents(4900),
      currentValueCents: toCents(5400),
      currency: "BRL",
      purchaseDate: `${currentYear}-02-10`,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      name: "HGLG11 - FII Logístico",
      type: "reits",
      institution: "XP Investimentos",
      quantity: "35",
      averagePriceCents: toCents(158.5),
      totalInvestedCents: toCents(5547.5),
      currentValueCents: toCents(5850),
      currency: "BRL",
      purchaseDate: `${currentYear}-03-01`,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      name: "Bitcoin (BTC)",
      type: "crypto",
      institution: "Binance",
      quantity: "0.015",
      averagePriceCents: toCents(310000),
      totalInvestedCents: toCents(4650),
      currentValueCents: toCents(5620),
      currency: "BRL",
      purchaseDate: `${currentYear}-04-05`,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);

  // 10. Sample Notifications
  await db.insert(notifications).values([
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      title: "Fatura Nubank Fechando",
      message: "Sua fatura de R$ 530,00 fecha em 4 dias.",
      type: "statement_closing",
      isRead: false,
      link: "/cards",
      createdAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      userId: targetUserId,
      title: "Orçamento de Alimentação",
      message: "Você já utilizou 75% do orçamento previsto para este mês.",
      type: "budget_alert",
      isRead: false,
      link: "/budgets",
      createdAt: nowIso,
    },
  ]);
}

// Standalone seed runner for `npm run db:seed`
async function main() {
  console.log("Seeding FinTrack database...");

  // Create demo user
  const email = "demo@fintrack.app";
  const existing = await db.select().from(users).where(eq(users.email, email)).get();

  let demoUserId = existing?.id;
  const now = new Date().toISOString();

  if (!existing) {
    demoUserId = crypto.randomUUID();
    const passwordHash = await hashPassword("demo123");

    await db.insert(users).values({
      id: demoUserId,
      name: "Alexandre Silva",
      email,
      passwordHash,
      primaryCurrency: "BRL",
      country: "BR",
      hasCompletedOnboarding: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId: demoUserId,
      theme: "system",
      language: "pt-BR",
      firstDayOfMonth: 1,
      firstDayOfWeek: 0,
      dateFormat: "DD/MM/YYYY",
      notifyBillsDue: true,
      notifyBudgets: true,
      notifyGoals: true,
      updatedAt: now,
    });

    console.log(`Created demo user: ${email} (password: demo123)`);
  }

  if (demoUserId) {
    await seedDemoData(demoUserId);
    console.log("Seeded complete realistic financial data for demo user!");
  }

  // Create Dev Profile for Feature Testing
  const devEmail = "dev@fintrack.app";
  const existingDev = await db.select().from(users).where(eq(users.email, devEmail)).get();

  let devUserId = existingDev?.id;
  if (!existingDev) {
    devUserId = crypto.randomUUID();
    const devPasswordHash = await hashPassword("dev123");

    await db.insert(users).values({
      id: devUserId,
      name: "Desenvolvedor FinTrack",
      email: devEmail,
      passwordHash: devPasswordHash,
      primaryCurrency: "BRL",
      country: "BR",
      hasCompletedOnboarding: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId: devUserId,
      theme: "dark",
      language: "pt-BR",
      firstDayOfMonth: 1,
      firstDayOfWeek: 0,
      dateFormat: "DD/MM/YYYY",
      notifyBillsDue: true,
      notifyBudgets: true,
      notifyGoals: true,
      updatedAt: now,
    });

    console.log(`Created dev user: ${devEmail} (password: dev123)`);
  }

  if (devUserId) {
    await seedDemoData(devUserId);
    console.log("Seeded testing environment for developer profile!");
  }

  console.log("Database seed completed successfully! 🚀");
  process.exit(0);
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((err) => {
    console.error("Error during seed:", err);
    process.exit(1);
  });
}
