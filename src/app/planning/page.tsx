import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  accounts,
  creditCards,
  categories,
  budgets,
  financialGoals,
  recurringTransactions,
  installmentPlans,
  transactions,
} from "@/db/schema";
import { eq, or, isNull, desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { PlanningManager } from "@/components/PlanningManager";

export default async function PlanningPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [
    userAccounts,
    userCards,
    allCategories,
    userBudgets,
    userGoals,
    userRecurring,
    userInstallmentPlans,
    userTransactions,
  ] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, user.id)),
    db.select().from(creditCards).where(eq(creditCards.userId, user.id)),
    db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, user.id), isNull(categories.userId), eq(categories.isSystem, true))),
    db.select().from(budgets).where(eq(budgets.userId, user.id)),
    db.select().from(financialGoals).where(eq(financialGoals.userId, user.id)),
    db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, user.id)),
    db.select().from(installmentPlans).where(eq(installmentPlans.userId, user.id)),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .orderBy(desc(transactions.date)),
  ]);

  return (
    <AppShell
      user={user}
      accounts={userAccounts}
      cards={userCards}
      categories={allCategories}
    >
      <PlanningManager
        user={user}
        accounts={userAccounts}
        cards={userCards}
        categories={allCategories}
        budgets={userBudgets}
        goals={userGoals}
        recurring={userRecurring}
        installmentPlans={userInstallmentPlans}
        transactions={userTransactions}
      />
    </AppShell>
  );
}
