"use client";

import { useState } from "react";
import { Navigation } from "./Navigation";
import { QuickTransactionModal } from "./QuickTransactionModal";
import { DevToolbar } from "./DevToolbar";

interface AppShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    primaryCurrency: string;
  };
  accounts: any[];
  cards: any[];
  categories: any[];
  children: React.ReactNode;
}

export function AppShell({
  user,
  accounts,
  cards,
  categories,
  children,
}: AppShellProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100">
      <Navigation
        user={user}
        onOpenQuickAdd={() => setQuickAddOpen(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-12 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {children}
      </main>

      <QuickTransactionModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        accounts={accounts}
        cards={cards}
        categories={categories}
        primaryCurrency={user.primaryCurrency}
      />

      <DevToolbar user={user} />
    </div>
  );
}
