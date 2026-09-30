"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { createTransaction } from "@/app/actions/finance";
import { toCents } from "@/lib/money";
import { useToast } from "./ToastProvider";

interface ImportManagerProps {
  user: {
    id: string;
    primaryCurrency: string;
  };
  accounts: any[];
  categories: any[];
}

export function ImportManager({ user, accounts, categories }: ImportManagerProps) {
  const { success, error } = useToast();
  const [csvText, setCsvText] = useState("");
  const [targetAccountId, setTargetAccountId] = useState(accounts[0]?.id || "");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colDate, setColDate] = useState(0);
  const [colDesc, setColDesc] = useState(1);
  const [colAmount, setColAmount] = useState(2);
  const [colCat, setColCat] = useState(-1);
  const [step, setStep] = useState<"input" | "mapping" | "preview">("input");
  const [importing, setImporting] = useState(false);

  // Parse CSV helper
  const handleParse = () => {
    if (!csvText.trim()) {
      error("Insira o conteúdo do CSV ou selecione um arquivo.");
      return;
    }

    const lines = csvText.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      error("O CSV deve conter pelo menos cabeçalho e 1 linha de dados.");
      return;
    }

    // Determine separator: comma or semicolon
    const sep = lines[0].includes(";") ? ";" : ",";
    const headerRow = lines[0].split(sep).map((h) => h.replace(/["\r]/g, "").trim());
    setHeaders(headerRow);

    const rows = lines.slice(1).map((line) => {
      return line.split(sep).map((col) => col.replace(/["\r]/g, "").trim());
    });

    setParsedRows(rows);

    // Auto-detect columns
    headerRow.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (lower.includes("data") || lower.includes("date")) setColDate(idx);
      if (lower.includes("desc") || lower.includes("historico") || lower.includes("título")) setColDesc(idx);
      if (lower.includes("valor") || lower.includes("amount") || lower.includes("preco")) setColAmount(idx);
      if (lower.includes("cat") || lower.includes("tipo")) setColCat(idx);
    });

    setStep("mapping");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    try {
      setImporting(true);
      let count = 0;

      for (const row of parsedRows) {
        const rawDate = row[colDate] || new Date().toISOString().split("T")[0];
        const description = row[colDesc] || "Transação Importada";
        const rawAmount = row[colAmount] || "0";

        // Clean amount
        const cleanAmount = rawAmount.replace("R$", "").trim();
        const isNegative = cleanAmount.includes("-") || parseFloat(cleanAmount.replace(",", ".")) < 0;
        const absVal = Math.abs(parseFloat(cleanAmount.replace(",", ".")) || 0);

        // Normalize date to YYYY-MM-DD
        let formattedDate = rawDate;
        if (rawDate.includes("/")) {
          const parts = rawDate.split("/");
          if (parts.length === 3) {
            // DD/MM/YYYY to YYYY-MM-DD
            formattedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }

        await createTransaction({
          type: isNegative ? "expense" : "income",
          amount: absVal.toString(),
          date: formattedDate,
          description,
          accountId: targetAccountId || undefined,
          paymentMethod: "other",
          transactionNature: "variable",
          tags: "importado",
        });
        count++;
      }

      success(`Sucesso! ${count} transações importadas com segurança.`);
      setStep("input");
      setCsvText("");
      setParsedRows([]);
    } catch {
      error("Erro ao importar transações.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Importação de Dados (CSV)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Importe extratos do seu banco em CSV mapeando as colunas antes da confirmação.
        </p>
      </div>

      {step === "input" && (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-6 max-w-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Conta de Destino para Lançamento
            </label>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.institution})
                </option>
              ))}
            </select>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center space-y-3 hover:border-emerald-500 transition-colors">
            <Upload className="w-10 h-10 text-emerald-500 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Selecione o arquivo CSV do seu computador
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Suporta formato padrão separado por vírgula (,) ou ponto-e-vírgula (;)
              </p>
            </div>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="block mx-auto text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950/60 dark:file:text-emerald-400 hover:file:bg-emerald-100"
            />
          </div>

          {/* Text Area Fallback */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Ou Cole o Conteúdo do CSV Diretamente
            </label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Data,Descricao,Valor&#10;2026-09-01,Salário,5000&#10;2026-09-02,Almoço,-45.50"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleParse}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
          >
            Avançar para Mapeamento de Colunas
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === "mapping" && (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-6 max-w-2xl animate-fade-in">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Mapeamento de Colunas
          </h2>
          <p className="text-xs text-slate-400">
            Identificamos {headers.length} colunas no seu arquivo. Verifique o mapeamento antes de prosseguir.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Coluna da Data
              </label>
              <select
                value={colDate}
                onChange={(e) => setColDate(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h} (Col {i + 1})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Coluna da Descrição
              </label>
              <select
                value={colDesc}
                onChange={(e) => setColDesc(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h} (Col {i + 1})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Coluna do Valor
              </label>
              <select
                value={colAmount}
                onChange={(e) => setColAmount(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h} (Col {i + 1})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setStep("input")}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep("preview")}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              Pré-visualizar {parsedRows.length} Lançamentos
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="p-6 rounded-3xl glass-panel space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pré-visualização da Importação ({parsedRows.length} itens)
              </h2>
              <p className="text-xs text-slate-400">
                Confira como os registros serão salvos na sua conta bancária.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep("mapping")}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-2"
              >
                Mudar Colunas
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                {importing ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar e Importar
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {parsedRows.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 text-slate-500">{row[colDate]}</td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{row[colDesc]}</td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{row[colAmount]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedRows.length > 15 && (
            <p className="text-center text-[11px] text-slate-400">
              Mostrando os primeiros 15 de {parsedRows.length} registros.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
