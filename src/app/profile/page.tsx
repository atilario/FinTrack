import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, creditCards, categories, userPreferences } from "@/db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { ProfileManager } from "@/components/ProfileManager";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [userAccounts, userCards, allCategories, prefs] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, user.id)),
    db.select().from(creditCards).where(eq(creditCards.userId, user.id)),
    db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, user.id), isNull(categories.userId), eq(categories.isSystem, true))),
    db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)).get(),
  ]);

  return (
    <AppShell
      user={user}
      accounts={userAccounts}
      cards={userCards}
      categories={allCategories}
    >
      <ProfileManager user={user} preferences={prefs} />
    </AppShell>
  );
}
