import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  accounts,
  creditCards,
  categories,
  transactions,
  investments,
  recurringTransactions,
  financialGoals,
  debts,
} from "@/db/schema";
import { eq, or, isNull, desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { DashboardView } from "@/components/DashboardView";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all user financial data in parallel
  const [
    userAccounts,
    userCards,
    allCategories,
    userTransactions,
    userInvestments,
    userRecurring,
    userGoals,
    userDebts,
  ] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, user.id)),
    db.select().from(creditCards).where(eq(creditCards.userId, user.id)),
    db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, user.id), isNull(categories.userId), eq(categories.isSystem, true))),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .orderBy(desc(transactions.date), desc(transactions.createdAt)),
    db.select().from(investments).where(eq(investments.userId, user.id)),
    db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, user.id)),
    db.select().from(financialGoals).where(eq(financialGoals.userId, user.id)),
    db.select().from(debts).where(eq(debts.userId, user.id)),
  ]);

  return (
    <AppShell
      user={user}
      accounts={userAccounts}
      cards={userCards}
      categories={allCategories}
    >
      <DashboardView
        user={user}
        accounts={userAccounts}
        cards={userCards}
        categories={allCategories}
        transactions={userTransactions}
        investments={userInvestments}
        recurring={userRecurring}
        goals={userGoals}
        debts={userDebts}
      />
    </AppShell>
  );
}
