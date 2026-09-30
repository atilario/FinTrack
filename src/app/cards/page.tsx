import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { creditCards, accounts, categories, transactions, creditCardStatements } from "@/db/schema";
import { eq, or, isNull, desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { CardsManager } from "@/components/CardsManager";

export default async function CardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [userAccounts, userCards, allCategories, userTransactions, userStatements] =
    await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, user.id)),
      db.select().from(creditCards).where(eq(creditCards.userId, user.id)),
      db
        .select()
        .from(categories)
        .where(or(eq(categories.userId, user.id), isNull(categories.userId), eq(categories.isSystem, true))),
      db.select().from(transactions).where(eq(transactions.userId, user.id)).orderBy(desc(transactions.date)),
      db.select().from(creditCardStatements).where(eq(creditCardStatements.userId, user.id)),
    ]);

  return (
    <AppShell
      user={user}
      accounts={userAccounts}
      cards={userCards}
      categories={allCategories}
    >
      <CardsManager
        user={user}
        cards={userCards}
        accounts={userAccounts}
        transactions={userTransactions}
        statements={userStatements}
      />
    </AppShell>
  );
}
