"use client";

import { useState } from "react";
import { registerUser } from "@/app/actions/auth";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Lock, AtSign } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

export default function RegisterPage() {
  const { error } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState("");

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow lowercase letters, numbers, dot, underscore, hyphen
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    setUsername(val);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const res = await registerUser(formData);
    if (res?.error) {
      error(res.error);
      setSubmitting(false);
    } else if (res?.redirect) {
      window.location.href = res.redirect;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-[#090D16]">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 mb-2">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Criar Conta
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Privacidade total: não armazenamos e-mails pessoais de usuários.
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Seu Nome Completo ou Apelido
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ex: Átila Silva"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Escolha seu Usuário FinTrack
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                <input
                  type="text"
                  name="username"
                  value={username}
                  onChange={handleUsernameChange}
                  required
                  minLength={3}
                  placeholder="seu.nome"
                  className="w-full px-4 py-3 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
                />
                <span className="px-3.5 py-3 bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 select-none border-l border-slate-200 dark:border-slate-800">
                  @fintrack.app
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                Seu acesso será padronizado como{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {username ? `${username}@fintrack.app` : "nome@fintrack.app"}
                </strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Senha de Acesso (mínimo 6 caracteres)
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Moeda Principal
              </label>
              <select
                name="currency"
                defaultValue="BRL"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Criar Conta e Continuar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              Fazer login
            </Link>
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Privacidade em 1º lugar: sem rastreamento nem coleta de dados pessoais</span>
        </div>
      </div>
    </div>
  );
}
