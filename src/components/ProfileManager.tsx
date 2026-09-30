"use client";

import { useState } from "react";
import {
  User,
  Settings,
  Sparkles,
  Trash2,
  LogOut,
  Moon,
  Sun,
  ShieldAlert,
  Globe,
  CheckCircle,
} from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { useTheme } from "./ThemeProvider";
import { logoutUser } from "@/app/actions/auth";
import { populateUserWithDemoData, wipeUserData } from "@/app/actions/finance";
import { useToast } from "./ToastProvider";

interface ProfileManagerProps {
  user: {
    id: string;
    name: string;
    email: string;
    primaryCurrency: string;
    createdAt: string;
  };
  preferences?: any;
}

export function ProfileManager({ user, preferences }: ProfileManagerProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { success, error } = useToast();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [loadingWipe, setLoadingWipe] = useState(false);

  const handleSeedDemo = async () => {
    try {
      setLoadingDemo(true);
      await populateUserWithDemoData();
      success("Dados fictícios completos gerados com sucesso!");
      window.location.href = "/";
    } catch {
      error("Erro ao carregar dados demonstrativos.");
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleWipeData = async () => {
    if (!confirm("Atenção: Esta ação apagará todas as suas transações, contas e metas. Deseja continuar?")) {
      return;
    }
    try {
      setLoadingWipe(true);
      await wipeUserData();
      success("Todos os dados financeiros foram limpos com sucesso.");
      window.location.href = "/";
    } catch {
      error("Erro ao limpar dados.");
    } finally {
      setLoadingWipe(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Perfil & Configurações
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Personalize sua moeda, aparência do aplicativo e gerencie seus dados.
        </p>
      </div>

      {/* User Information */}
      <div className="p-6 rounded-3xl glass-panel space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-500" />
          Informações da Conta
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Nome Completo</span>
            <span className="font-semibold text-slate-900 dark:text-white text-sm">
              {user.name}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Identificador FinTrack</span>
            <span className="font-semibold text-slate-900 dark:text-white text-sm">
              {user.email}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Moeda Padrão</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {user.primaryCurrency}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Membro Desde</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "Recentemente"}
            </span>
          </div>
        </div>
      </div>

      {/* Preferences & Appearance */}
      <div className="p-6 rounded-3xl glass-panel space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-500" />
          Aparência & Preferências
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Tema do Aplicativo
            </label>
            <div className="grid grid-cols-3 gap-2 max-w-sm">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  theme === "light"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                Claro
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  theme === "dark"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                Escuro
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  theme === "system"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-500" />
                Sistema
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Data Management (Section 32) */}
      <div className="p-6 rounded-3xl glass-panel space-y-4 shadow-sm border border-emerald-500/20">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          Dados Demonstrativos (Testes & Avaliação)
        </h2>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Você pode popular sua conta instantaneamente com um conjunto completo de contas bancárias, cartões de crédito, parcelamentos, despesas fixas, orçamentos e investimentos para ver todo o potencial do FinTrack em ação.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleSeedDemo}
            disabled={loadingDemo}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            {loadingDemo ? "Carregando..." : "Popular com Dados Demonstrativos"}
          </button>

          <button
            onClick={handleWipeData}
            disabled={loadingWipe}
            className="py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {loadingWipe ? "Limpando..." : "Limpar Todos os Lançamentos"}
          </button>
        </div>
      </div>

      {/* Danger Zone & Logout */}
      <div className="p-6 rounded-3xl glass-panel space-y-4 shadow-sm border border-rose-500/20">
        <h2 className="text-sm font-bold text-rose-500 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          Sessão e Segurança
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Encerrar Sessão
            </span>
            <span className="text-[11px] text-slate-400">
              Desconectar esta conta com segurança deste dispositivo.
            </span>
          </div>

          <button
            onClick={() => logoutUser()}
            className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
