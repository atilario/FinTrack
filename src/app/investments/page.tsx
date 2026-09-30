import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { investments, accounts, creditCards, categories } from "@/db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { InvestmentsManager } from "@/components/InvestmentsManager";

export default async function InvestmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [userAccounts, userCards, allCategories, userInvestments] =
    await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, user.id)),
      db.select().from(creditCards).where(eq(creditCards.userId, user.id)),
      db
        .select()
        .from(categories)
        .where(or(eq(categories.userId, user.id), isNull(categories.userId), eq(categories.isSystem, true))),
      db.select().from(investments).where(eq(investments.userId, user.id)),
    ]);

  return (
    <AppShell
      user={user}
      accounts={userAccounts}
      cards={userCards}
      categories={allCategories}
    >
      <InvestmentsManager user={user} investments={userInvestments} accounts={userAccounts} />
    </AppShell>
  );
}
