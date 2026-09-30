import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, creditCards, categories, transactions, recurringTransactions } from "@/db/schema";
import { eq, or, isNull, desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { CalendarView } from "@/components/CalendarView";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [userAccounts, userCards, allCategories, userTransactions, userRecurring] =
    await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, user.id)),
      db.select().from(creditCards).where(eq(creditCards.userId, user.id)),
      db
        .select()
        .from(categories)
        .where(or(eq(categories.userId, user.id), isNull(categories.userId), eq(categories.isSystem, true))),
      db.select().from(transactions).where(eq(transactions.userId, user.id)).orderBy(desc(transactions.date)),
      db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, user.id)),
    ]);

  return (
    <AppShell
      user={user}
      accounts={userAccounts}
      cards={userCards}
      categories={allCategories}
    >
      <CalendarView
        user={user}
        transactions={userTransactions}
        recurring={userRecurring}
        cards={userCards}
      />
    </AppShell>
  );
}
