import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, creditCards, categories, transactions } from "@/db/schema";
import { eq, or, isNull, desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { AccountsManager } from "@/components/AccountsManager";

export default async function AccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [userAccounts, userCards, allCategories, userTransactions] =
    await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, user.id)),
      db.select().from(creditCards).where(eq(creditCards.userId, user.id)),
      db
        .select()
        .from(categories)
        .where(or(eq(categories.userId, user.id), isNull(categories.userId), eq(categories.isSystem, true))),
      db.select().from(transactions).where(eq(transactions.userId, user.id)).orderBy(desc(transactions.date)),
    ]);

  return (
    <AppShell
      user={user}
      accounts={userAccounts}
      cards={userCards}
      categories={allCategories}
    >
      <AccountsManager
        user={user}
        accounts={userAccounts}
        transactions={userTransactions}
      />
    </AppShell>
  );
}
