import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, creditCards, categories, notifications } from "@/db/schema";
import { eq, or, isNull, desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { NotificationsManager } from "@/components/NotificationsManager";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [userAccounts, userCards, allCategories, userNotifications] =
    await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, user.id)),
      db.select().from(creditCards).where(eq(creditCards.userId, user.id)),
      db
        .select()
        .from(categories)
        .where(or(eq(categories.userId, user.id), isNull(categories.userId), eq(categories.isSystem, true))),
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt)),
    ]);

  return (
    <AppShell
      user={user}
      accounts={userAccounts}
      cards={userCards}
      categories={allCategories}
    >
      <NotificationsManager notifications={userNotifications} />
    </AppShell>
  );
}
