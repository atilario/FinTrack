"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Copy,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Calendar,
  Download,
  CreditCard,
  Wallet,
  Tag,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatMoney, fromCents } from "@/lib/money";
import { deleteTransaction, createTransaction } from "@/app/actions/finance";
import { useToast } from "./ToastProvider";
import { QuickTransactionModal } from "./QuickTransactionModal";

interface TransactionsManagerProps {
  user: {
    id: string;
    primaryCurrency: string;
  };
  initialTransactions: any[];
  accounts: any[];
  cards: any[];
  categories: any[];
}

export function TransactionsManager({
  user,
  initialTransactions,
  accounts,
  cards,
  categories,
}: TransactionsManagerProps) {
  const { success, error } = useToast();
  const [transactionsList, setTransactionsList] = useState(initialTransactions);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter logic
  const filteredTransactions = useMemo(() => {
    return transactionsList.filter((tx) => {
      // Type
      if (selectedType !== "all" && tx.type !== selectedType) return false;
      // Category
      if (selectedCategory !== "all" && tx.categoryId !== selectedCategory) return false;
      // Account
      if (selectedAccount !== "all" && tx.accountId !== selectedAccount && tx.destinationAccountId !== selectedAccount) return false;
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const descMatch = tx.description?.toLowerCase().includes(query);
        const notesMatch = tx.notes?.toLowerCase().includes(query);
        const tagsMatch = tx.tags?.toLowerCase().includes(query);
        if (!descMatch && !notesMatch && !tagsMatch) return false;
      }
      return true;
    });
  }, [transactionsList, selectedType, selectedCategory, selectedAccount, search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    try {
      await deleteTransaction(id);
      setTransactionsList((prev) => prev.filter((t) => t.id !== id));
      success("Transação excluída com sucesso.");
    } catch (err: any) {
      error("Erro ao excluir transação.");
    }
  };

  const handleDuplicate = async (tx: any) => {
    try {
      const res = await createTransaction({
        type: tx.type,
        amount: fromCents(tx.originalAmountCents || tx.amountCents),
        currency: tx.originalCurrency || user.primaryCurrency,
        date: new Date().toISOString().split("T")[0],
        description: `${tx.description} (Cópia)`,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        destinationAccountId: tx.destinationAccountId,
        creditCardId: tx.creditCardId,
        paymentMethod: tx.paymentMethod,
        transactionNature: tx.transactionNature,
        notes: tx.notes,
        tags: tx.tags,
      });

      if (res?.success) {
        success("Transação duplicada para a data de hoje!");
        // Reload transactions
        window.location.reload();
      }
    } catch (err: any) {
      error("Erro ao duplicar transação.");
    }
  };

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    const headers = ["Data", "Tipo", "Descricao", "Valor_Centavos", "Moeda", "Categoria", "Forma_Pagamento", "Status"];
    const rows = filteredTransactions.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId)?.name || "Sem categoria";
      return [
        t.date,
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amountCents,
        t.originalCurrency || user.primaryCurrency,
        `"${cat}"`,
        t.paymentMethod,
        t.isPaid ? "Pago" : "Pendente",
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fintrack-transacoes-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Arquivo CSV baixado com sucesso!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transações
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Histórico completo e filtros detalhados de todas as movimentações.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-3xl space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição, notas, tags..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
            {["all", "expense", "income", "transfer"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  selectedType === t
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t === "all" ? "Todas" : t === "expense" ? "Despesas" : t === "income" ? "Receitas" : "Transf."}
              </button>
            ))}
          </div>
        </div>

        {/* Category & Account dropdown filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Todas as Contas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-400 ml-auto font-medium">
            {filteredTransactions.length} encontrada{filteredTransactions.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2.5">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            const acc = accounts.find((a) => a.id === tx.accountId);
            const card = cards.find((c) => c.id === tx.creditCardId);

            return (
              <div
                key={tx.id}
                className="p-4 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
              >
                {/* Left info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      tx.type === "income"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : tx.type === "transfer"
                        ? "bg-sky-500/10 text-sky-500"
                        : "bg-rose-500/10 text-rose-500"
                    }`}
                  >
                    {tx.type === "income" ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : tx.type === "transfer" ? (
                      <ArrowRightLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {tx.description}
                      </span>
                      {tx.installmentNumber && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          {tx.installmentNumber}ª parcela
                        </span>
                      )}
                      {tx.transactionNature === "fixed" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Fixo
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {cat?.name || "Sem categoria"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {card ? <CreditCard className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
                        {card ? card.name : acc?.name || "Conta"}
                      </span>
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {tx.paymentMethod}
                      </span>
                    </div>

                    {tx.notes && (
                      <p className="text-[11px] text-slate-400 mt-1 italic">
                        "{tx.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right amount and actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 self-end sm:self-auto w-full sm:w-auto border-t sm:border-0 border-slate-100 dark:border-slate-800/80 pt-2 sm:pt-0">
                  <div className="text-right">
                    <span
                      className={`text-base font-extrabold ${
                        tx.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : tx.type === "transfer"
                          ? "text-sky-600 dark:text-sky-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : ""}
                      {formatMoney(tx.amountCents, user.primaryCurrency)}
                    </span>
                    {tx.originalCurrency && tx.originalCurrency !== user.primaryCurrency && (
                      <span className="block text-[10px] text-slate-400">
                        Orig: {formatMoney(tx.originalAmountCents, tx.originalCurrency)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDuplicate(tx)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Duplicar para hoje"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Nenhuma transação encontrada
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tente ajustar seus termos de pesquisa ou filtros acima para visualizar seus lançamentos.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors inline-flex items-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              Lançar transação
            </button>
          </div>
        )}
      </div>

      <QuickTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        accounts={accounts}
        cards={cards}
        categories={categories}
        primaryCurrency={user.primaryCurrency}
      />
    </div>
  );
}
