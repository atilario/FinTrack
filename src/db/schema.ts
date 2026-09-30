import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// 1. Users
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID string
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  primaryCurrency: text("primary_currency").notNull().default("BRL"),
  country: text("country").default("BR"),
  hasCompletedOnboarding: integer("has_completed_onboarding", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 2. User Preferences
export const userPreferences = sqliteTable("user_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("system"), // 'system' | 'light' | 'dark'
  language: text("language").notNull().default("pt-BR"),
  firstDayOfMonth: integer("first_day_of_month").notNull().default(1),
  firstDayOfWeek: integer("first_day_of_week").notNull().default(0), // 0: Sunday, 1: Monday
  dateFormat: text("date_format").notNull().default("DD/MM/YYYY"),
  notifyBillsDue: integer("notify_bills_due", { mode: "boolean" }).notNull().default(true),
  notifyBudgets: integer("notify_budgets", { mode: "boolean" }).notNull().default(true),
  notifyGoals: integer("notify_goals", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull(),
});

// 3. Accounts & Wallets
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'checking' | 'savings' | 'cash' | 'digital' | 'international' | 'investment'
  institution: text("institution").notNull().default("Outro"),
  currency: text("currency").notNull().default("BRL"),
  initialBalanceCents: integer("initial_balance_cents").notNull().default(0),
  color: text("color").notNull().default("#10B981"),
  icon: text("icon").default("wallet"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("accounts_user_idx").on(table.userId),
]);

// 4. Categories & Subcategories
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // null if system category
  name: text("name").notNull(),
  icon: text("icon").notNull().default("tag"),
  color: text("color").notNull().default("#3B82F6"),
  type: text("type").notNull().default("expense"), // 'income' | 'expense' | 'both'
  parentId: text("parent_id"), // for subcategories
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("categories_user_idx").on(table.userId),
  index("categories_type_idx").on(table.type),
]);

// 5. Credit Cards
export const creditCards = sqliteTable("credit_cards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bank: text("bank").notNull().default("Outro"),
  brand: text("brand").notNull().default("visa"), // 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other'
  type: text("type").notNull().default("credit"), // 'credit' | 'debit' | 'multiple'
  category: text("category").notNull().default("international"), // 'national' | 'international'
  modality: text("modality").notNull().default("physical"), // 'physical' | 'virtual'
  holderName: text("holder_name"),
  expirationDate: text("expiration_date"), // MM/YY
  lastFourDigits: text("last_four_digits"),
  limitCents: integer("limit_cents").notNull().default(0),
  closingDay: integer("closing_day").notNull().default(1),
  dueDay: integer("due_day").notNull().default(10),
  color: text("color").notNull().default("#6366F1"),
  currency: text("currency").notNull().default("BRL"),
  status: text("status").notNull().default("active"), // 'active' | 'blocked' | 'cancelled'
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("credit_cards_user_idx").on(table.userId),
]);

// 6. Credit Card Statements (Faturas)
export const creditCardStatements = sqliteTable("credit_card_statements", {
  id: text("id").primaryKey(),
  creditCardId: text("credit_card_id").notNull().references(() => creditCards.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: integer("month").notNull(), // 1 to 12
  year: integer("year").notNull(),
  closingDate: text("closing_date").notNull(), // ISO YYYY-MM-DD
  dueDate: text("due_date").notNull(), // ISO YYYY-MM-DD
  status: text("status").notNull().default("open"), // 'open' | 'closed' | 'paid' | 'overdue'
  paidAt: text("paid_at"),
  paidAmountCents: integer("paid_amount_cents").default(0),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("statements_card_month_idx").on(table.creditCardId, table.year, table.month),
  index("statements_user_idx").on(table.userId),
]);

// 7. Installment Plans (Parcelamentos)
export const installmentPlans = sqliteTable("installment_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  totalAmountCents: integer("total_amount_cents").notNull(),
  totalInstallments: integer("total_installments").notNull(),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  creditCardId: text("credit_card_id").references(() => creditCards.id, { onDelete: "set null" }),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("installment_plans_user_idx").on(table.userId),
]);

// 8. Recurring Transactions (Fixas / Recorrentes)
export const recurringTransactions = sqliteTable("recurring_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  type: text("type").notNull(), // 'income' | 'expense'
  frequency: text("frequency").notNull().default("monthly"), // 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual'
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date"), // YYYY-MM-DD
  nextDueDate: text("next_due_date").notNull(),
  billingDay: integer("billing_day").notNull().default(1),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  creditCardId: text("credit_card_id").references(() => creditCards.id, { onDelete: "set null" }),
  currency: text("currency").notNull().default("BRL"),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("recurring_user_idx").on(table.userId),
  index("recurring_next_due_idx").on(table.nextDueDate),
]);

// 9. Transactions
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'income' | 'expense' | 'transfer'
  amountCents: integer("amount_cents").notNull(), // in primary currency or converted
  originalAmountCents: integer("original_amount_cents").notNull(),
  originalCurrency: text("original_currency").notNull().default("BRL"),
  exchangeRate: text("exchange_rate").default("1.0"),
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description").notNull(),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  destinationAccountId: text("destination_account_id").references(() => accounts.id, { onDelete: "set null" }), // for transfers
  creditCardId: text("credit_card_id").references(() => creditCards.id, { onDelete: "set null" }),
  statementId: text("statement_id").references(() => creditCardStatements.id, { onDelete: "set null" }),
  installmentPlanId: text("installment_plan_id").references(() => installmentPlans.id, { onDelete: "set null" }),
  installmentNumber: integer("installment_number"), // e.g. 1 (for 1/12)
  paymentMethod: text("payment_method").notNull().default("pix"), // 'cash' | 'debit' | 'credit' | 'pix' | 'transfer' | 'boleto' | 'other'
  transactionNature: text("transaction_nature").notNull().default("variable"), // 'fixed' | 'variable' | 'installment' | 'recurring'
  notes: text("notes"),
  tags: text("tags"), // comma-separated or json string
  isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(true),
  isCardBillPayment: integer("is_card_bill_payment", { mode: "boolean" }).notNull().default(false), // to prevent duplicate expense calculation
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("transactions_user_idx").on(table.userId),
  index("transactions_date_idx").on(table.date),
  index("transactions_category_idx").on(table.categoryId),
  index("transactions_account_idx").on(table.accountId),
  index("transactions_card_idx").on(table.creditCardId),
  index("transactions_user_date_idx").on(table.userId, table.date),
]);

// 10. Budgets (Orçamentos)
export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  month: integer("month").notNull(), // 1 to 12
  year: integer("year").notNull(),
  amountCents: integer("amount_cents").notNull(),
  alertThreshold: integer("alert_threshold").notNull().default(80), // percentage
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("budgets_user_period_idx").on(table.userId, table.year, table.month),
]);

// 11. Financial Goals (Metas)
export const financialGoals = sqliteTable("financial_goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmountCents: integer("target_amount_cents").notNull(),
  currentAmountCents: integer("current_amount_cents").notNull().default(0),
  targetDate: text("target_date"), // YYYY-MM-DD
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  icon: text("icon").notNull().default("target"),
  color: text("color").notNull().default("#10B981"),
  notes: text("notes"),
  status: text("status").notNull().default("in_progress"), // 'in_progress' | 'completed' | 'cancelled'
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("goals_user_idx").on(table.userId),
]);

// 12. Investments
export const investments = sqliteTable("investments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "Tesouro Selic 2029", "PETR4", "Bitcoin"
  type: text("type").notNull().default("fixed_income"), // 'fixed_income' | 'stocks' | 'reits' | 'etfs' | 'funds' | 'crypto' | 'other'
  institution: text("institution").notNull().default("Corretora"),
  quantity: text("quantity").notNull().default("1"), // string to hold fractional crypto/stocks
  averagePriceCents: integer("average_price_cents").notNull().default(0),
  totalInvestedCents: integer("total_invested_cents").notNull().default(0),
  currentValueCents: integer("current_value_cents").notNull().default(0),
  currency: text("currency").notNull().default("BRL"),
  purchaseDate: text("purchase_date"), // YYYY-MM-DD
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("investments_user_idx").on(table.userId),
]);

// 13. Notifications
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("system"), // 'bill_due' | 'statement_closing' | 'budget_alert' | 'goal_reached' | 'system'
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  link: text("link"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("notifications_user_idx").on(table.userId, table.isRead),
]);

// 14. Debts & Loans (Dívidas, Financiamentos e Empréstimos)
export const debts = sqliteTable("debts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creditor: text("creditor").notNull(),
  description: text("description"),
  type: text("type").notNull().default("loan"), // 'loan' | 'financing' | 'personal' | 'overdraft' | 'other'
  totalAmountCents: integer("total_amount_cents").notNull(),
  remainingAmountCents: integer("remaining_amount_cents").notNull(),
  interestRate: text("interest_rate"),
  totalInstallments: integer("total_installments").notNull().default(1),
  paidInstallments: integer("paid_installments").notNull().default(0),
  installmentAmountCents: integer("installment_amount_cents").notNull().default(0),
  nextDueDate: text("next_due_date"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  status: text("status").notNull().default("active"), // 'active' | 'paid' | 'overdue' | 'renegotiated'
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("debts_user_idx").on(table.userId),
  index("debts_status_idx").on(table.status),
]);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  categories: many(categories),
  creditCards: many(creditCards),
  transactions: many(transactions),
  budgets: many(budgets),
  goals: many(financialGoals),
  investments: many(investments),
  preferences: one(userPreferences),
  notifications: many(notifications),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const creditCardsRelations = relations(creditCards, ({ one, many }) => ({
  user: one(users, { fields: [creditCards.userId], references: [users.id] }),
  statements: many(creditCardStatements),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  destinationAccount: one(accounts, { fields: [transactions.destinationAccountId], references: [accounts.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  creditCard: one(creditCards, { fields: [transactions.creditCardId], references: [creditCards.id] }),
  statement: one(creditCardStatements, { fields: [transactions.statementId], references: [creditCardStatements.id] }),
  installmentPlan: one(installmentPlans, { fields: [transactions.installmentPlanId], references: [installmentPlans.id] }),
}));
