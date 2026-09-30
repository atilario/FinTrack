"use client";

import { useState } from "react";
import {
  Terminal,
  X,
  AlertTriangle,
  CreditCard,
  PlusCircle,
  RotateCcw,
  Sparkles,
  ChevronUp,
} from "lucide-react";
import {
  simulateOverBudgetScenario,
  simulateHighCreditCardUsage,
  simulateBatchRandomTransactions,
  wipeUserData,
  populateUserWithDemoData,
} from "@/app/actions/finance";
import { useToast } from "./ToastProvider";

interface DevToolbarProps {
  user: {
    email: string;
    name: string;
  };
}

export function DevToolbar({ user }: DevToolbarProps) {
  const { success, error } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if current user is dev or demo
  const isDevUser = user.email.includes("dev@") || user.email.includes("demo@");

  if (!isDevUser) return null;

  const runAction = async (actionFn: () => Promise<any>, successMsg: string) => {
    try {
      setLoading(true);
      await actionFn();
      success(successMsg);
      window.location.reload();
    } catch {
      error("Erro ao executar ação dev.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Dev Badge */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-xl backdrop-blur-md text-xs font-mono font-bold tracking-wider transition-all hover:scale-105 active:scale-95"
          title="Abrir Painel de Testes do Desenvolvedor"
        >
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>DEV MODE</span>
          <ChevronUp className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Dev Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-500/30 text-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm font-mono text-emerald-400">
                  Painel de Testes do Desenvolvedor
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-400">
                Perfil Ativo: <strong className="text-white">{user.email}</strong> ({user.name})
              </p>
              <p className="text-[11px] text-slate-500">
                Use os atalhos abaixo para simular cenários financeiros e validar os cálculos e componentes visuais.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() =>
                  runAction(
                    simulateOverBudgetScenario,
                    "Cenário de Orçamento Estourado injetado com sucesso!"
                  )
                }
                disabled={loading}
                className="w-full p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center gap-2.5 transition-colors text-left"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="block font-bold">Simular Orçamento Estourado (&gt; 100%)</span>
                  <span className="text-[10px] text-amber-400/80">
                    Cria gasto de R$ 950 em Alimentação com teto de R$ 800 + Alerta
                  </span>
                </div>
              </button>

              <button
                onClick={() =>
                  runAction(
                    simulateHighCreditCardUsage,
                    "Cenário de Limite de Cartão 92% injetado com sucesso!"
                  )
                }
                disabled={loading}
                className="w-full p-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold text-xs flex items-center gap-2.5 transition-colors text-left"
              >
                <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="block font-bold">Simular Cartão Próximo do Limite (92%)</span>
                  <span className="text-[10px] text-indigo-400/80">
                    Consome 92% do limite do cartão de crédito + Notificação
                  </span>
                </div>
              </button>

              <button
                onClick={() =>
                  runAction(
                    () => simulateBatchRandomTransactions(10),
                    "10 Transações aleatórias criadas com sucesso!"
                  )
                }
                disabled={loading}
                className="w-full p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center gap-2.5 transition-colors text-left"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="block font-bold">Gerar Lote de 10 Transações</span>
                  <span className="text-[10px] text-emerald-400/80">
                    Adiciona despesas e receitas diversificadas no mês
                  </span>
                </div>
              </button>

              <button
                onClick={() =>
                  runAction(
                    async () => {
                      await wipeUserData();
                      await populateUserWithDemoData();
                    },
                    "Banco de dados resetado para o estado inicial padrão!"
                  )
                }
                disabled={loading}
                className="w-full p-3 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2.5 transition-colors text-left"
              >
                <RotateCcw className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="block font-bold">Resetar para Estado Limpo Padrão</span>
                  <span className="text-[10px] text-slate-400">
                    Restaura as contas, categorias e transações originais
                  </span>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Login rápido:</span>
              <span>dev@fintrack.app / dev123</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
