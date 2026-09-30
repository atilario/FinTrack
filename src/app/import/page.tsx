import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, creditCards, categories } from "@/db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { ImportManager } from "@/components/ImportManager";

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [userAccounts, userCards, allCategories] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, user.id)),
    db.select().from(creditCards).where(eq(creditCards.userId, user.id)),
    db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, user.id), isNull(categories.userId), eq(categories.isSystem, true))),
  ]);

  return (
    <AppShell
      user={user}
      accounts={userAccounts}
      cards={userCards}
      categories={allCategories}
    >
      <ImportManager
        user={user}
        accounts={userAccounts}
        categories={allCategories}
      />
    </AppShell>
  );
}
