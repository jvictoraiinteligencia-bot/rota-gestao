import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { getSupabase } from '../../lib/supabase';
import {
  ROUTE_IMPORT_COLUMNS,
  RouteImportSummary,
  downloadRouteImportTemplate,
  importRoutesToSupabase,
  parseRouteImportFile,
} from '../../services/routeImportService';
import { formatNumber } from '../../utils/formatters';

interface RouteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RouteImportModal: React.FC<RouteImportModalProps> = ({ isOpen, onClose }) => {
  const { isOnlineConnected, refreshRoutes, branches, clients } = useTransport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<RouteImportSummary | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setSummary(null);
      setFatalError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canImport = isOnlineConnected && Boolean(getSupabase());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setSummary(null);
    setFatalError(null);

    if (selected) {
      const extension = selected.name.split('.').pop()?.toLowerCase();
      if (extension !== 'csv' && extension !== 'xlsx') {
        setFile(null);
        setFatalError('Formato de arquivo não suportado. Envie um arquivo .csv ou .xlsx.');
        e.target.value = '';
        return;
      }
    }
    setFile(selected);
  };

  const handleImport = async () => {
    if (!file) {
      setFatalError('Selecione um arquivo CSV ou XLSX para importar.');
      return;
    }

    setImporting(true);
    setSummary(null);
    setFatalError(null);

    try {
      const rows = await parseRouteImportFile(file);
      if (rows.length === 0) {
        setFatalError('O arquivo não possui linhas de dados abaixo do cabeçalho.');
        return;
      }

      const result = await importRoutesToSupabase(rows);
      setSummary(result);

      if (result.imported > 0) {
        await refreshRoutes();
      }
    } catch (err: any) {
      setFatalError(err?.message || String(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Importar Rotas</h2>
              <p className="text-xs text-slate-500">
                Cadastro em lote de rotas a partir de planilha CSV ou XLSX
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Instructions */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3.5 text-xs text-blue-950 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <Info size={14} className="text-blue-600" />
              <span>Estrutura obrigatória do arquivo</span>
            </div>
            <div className="font-mono text-[11px] bg-white border border-blue-200 rounded px-2.5 py-1.5 text-slate-800">
              {ROUTE_IMPORT_COLUMNS.join(' | ')}
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700">
              <li>
                <strong>FILIAL</strong>: nome exatamente como cadastrado em Filiais
                {branches.length === 0 && (
                  <span className="text-amber-700 font-semibold"> (nenhuma filial cadastrada ainda)</span>
                )}
                .
              </li>
              <li>
                <strong>CLIENTE</strong>: cliente ativo, com o nome exatamente como cadastrado em Clientes (não é criado automaticamente)
                {clients.length === 0 && (
                  <span className="text-amber-700 font-semibold"> (nenhum cliente cadastrado ainda)</span>
                )}
                .
              </li>
              <li>
                <strong>BLOCO</strong>: tipo de operação da rota (ex.: SECOS, FRIOS, HORTIFRUTI). Aceita qualquer bloco.
              </li>
              <li>
                <strong>ROTA</strong>: texto único da rota (ex.: origem x destino), gravado sem separação.
              </li>
              <li>
                <strong>KM</strong>: número maior que zero.
              </li>
              <li>Rotas com a mesma FILIAL + CLIENTE + BLOCO + ROTA já cadastradas não são inseridas novamente.</li>
            </ul>
            <button
              type="button"
              onClick={downloadRouteImportTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
            >
              <Download size={13} />
              <span>Baixar modelo</span>
            </button>
          </div>

          {!canImport && (
            <div className="p-2.5 rounded-md text-xs border flex items-center gap-2 bg-amber-50 border-amber-200 text-amber-800">
              <AlertCircle size={14} className="text-amber-600 shrink-0" />
              <span>Conecte o Supabase para importar rotas. Os dados são gravados diretamente no banco.</span>
            </div>
          )}

          {/* File picker */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
            <label className="block text-xs font-semibold text-slate-700">Arquivo de rotas (.csv ou .xlsx)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              disabled={importing}
              className="block w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-100"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={!file || importing || !canImport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-md transition-colors shadow-xs"
              >
                {importing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Importar Rotas</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {fatalError && (
            <div className="p-2.5 rounded-md text-xs border flex items-start gap-2 bg-rose-50 border-rose-200 text-rose-800">
              <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{fatalError}</span>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Resumo da importação</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">Total de linhas</div>
                  <div className="text-lg font-bold font-mono text-slate-900">{formatNumber(summary.total)}</div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-[11px] text-emerald-700">Importadas</div>
                  <div className="text-lg font-bold font-mono text-emerald-800">{formatNumber(summary.imported)}</div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="text-[11px] text-amber-700">Já existentes</div>
                  <div className="text-lg font-bold font-mono text-amber-800">{formatNumber(summary.existing)}</div>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <div className="text-[11px] text-rose-700">Com erro</div>
                  <div className="text-lg font-bold font-mono text-rose-800">{formatNumber(summary.errors.length)}</div>
                </div>
              </div>

              {summary.errors.length > 0 && (
                <div className="border border-rose-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-rose-50 text-xs font-semibold text-rose-800">
                    Linhas com erro (não importadas)
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-2 px-3 w-16">Linha</th>
                          <th className="py-2 px-3">Rota</th>
                          <th className="py-2 px-3">Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {summary.errors.map((e) => (
                          <tr key={`err-${e.lineNumber}`}>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{e.lineNumber}</td>
                            <td className="py-2 px-3 text-slate-700">{e.rota || '-'}</td>
                            <td className="py-2 px-3 text-rose-700">{e.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {summary.duplicates.length > 0 && (
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-amber-50 text-xs font-semibold text-amber-800">
                    Linhas ignoradas por duplicidade (FILIAL + CLIENTE + BLOCO + ROTA)
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <tbody className="divide-y divide-slate-100">
                        {summary.duplicates.map((d) => (
                          <tr key={`dup-${d.lineNumber}`}>
                            <td className="py-2 px-3 w-16 font-mono font-bold text-slate-800">{d.lineNumber}</td>
                            <td className="py-2 px-3 text-slate-700">{d.rota}</td>
                            <td className="py-2 px-3 text-amber-700">{d.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
