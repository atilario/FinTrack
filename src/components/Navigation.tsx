"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  PieChart,
  User,
  Plus,
  Wallet,
  CreditCard,
  TrendingUp,
  Calendar,
  Upload,
  Sun,
  Moon,
  LogOut,
  Bell,
  Sparkles,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { logoutUser } from "@/app/actions/auth";

interface NavigationProps {
  user: {
    id: string;
    name: string;
    email: string;
    primaryCurrency: string;
  };
  onOpenQuickAdd: () => void;
  unreadNotificationsCount?: number;
}

export function Navigation({
  user,
  onOpenQuickAdd,
  unreadNotificationsCount = 0,
}: NavigationProps) {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const navLinks = [
    { href: "/", label: "Início", icon: LayoutDashboard },
    { href: "/transactions", label: "Transações", icon: Receipt },
    { href: "/planning", label: "Planejamento", icon: PiggyBank },
    { href: "/reports", label: "Relatórios", icon: PieChart },
    { href: "/accounts", label: "Contas", icon: Wallet, desktopOnly: true },
    { href: "/cards", label: "Cartões", icon: CreditCard, desktopOnly: true },
    { href: "/investments", label: "Investimentos", icon: TrendingUp, desktopOnly: true },
    { href: "/calendar", label: "Calendário", icon: Calendar, desktopOnly: true },
    { href: "/import", label: "Importar CSV", icon: Upload, desktopOnly: true },
    { href: "/profile", label: "Perfil", icon: User },
  ];

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 justify-between z-30">
        <div className="flex flex-col gap-6">
          {/* Brand */}
          <div className="flex items-center justify-between px-2 pt-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  FinTrack
                </span>
                <span className="block text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Controle Pessoal
                </span>
              </div>
            </Link>

            {/* Notification Bell */}
            <div className="relative">
              <Link
                href="/notifications"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Notificações"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                )}
              </Link>
            </div>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={onOpenQuickAdd}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Nova Transação
          </button>

          {/* Nav List */}
          <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info & theme toggle */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                {user.name}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                {user.email}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Alternar Tema"
              >
                {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={() => logoutUser()}
                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MOBILE TOP BAR --- */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-30">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            FinTrack
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            href="/notifications"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 relative"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </Link>
        </div>
      </header>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-nav z-40 px-2 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-xs transition-colors ${
            pathname === "/"
              ? "text-emerald-600 dark:text-emerald-400 font-semibold"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Início</span>
        </Link>

        <Link
          href="/transactions"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-xs transition-colors ${
            pathname === "/transactions"
              ? "text-emerald-600 dark:text-emerald-400 font-semibold"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span>Transações</span>
        </Link>

        {/* Central Floating Quick Action Button */}
        <div className="-mt-6 flex flex-col items-center">
          <button
            onClick={onOpenQuickAdd}
            className="w-13 h-13 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 active:scale-95 transition-transform"
            aria-label="Nova Transação"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        <Link
          href="/planning"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-xs transition-colors ${
            pathname === "/planning"
              ? "text-emerald-600 dark:text-emerald-400 font-semibold"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <PiggyBank className="w-5 h-5" />
          <span>Planejamento</span>
        </Link>

        <Link
          href="/reports"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-xs transition-colors ${
            pathname === "/reports"
              ? "text-emerald-600 dark:text-emerald-400 font-semibold"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span>Relatórios</span>
        </Link>
      </nav>
    </>
  );
}
