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
  ArrowLeft,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { getSupabase } from '../../lib/supabase';
import {
  FREIGHT_IMPORT_COLUMNS,
  FreightImportFailure,
  FreightImportPlan,
  FreightImportPreviewRow,
  FreightImportRow,
  FreightImportStatus,
  applyFreightImport,
  downloadFreightImportTemplate,
  parseFreightImportFile,
  validateFreightImport,
} from '../../services/freightImportService';
import { formatCurrency, formatKm, formatNumber } from '../../utils/formatters';

interface FreightImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'select' | 'preview' | 'done';
type StatusFilter = 'all' | FreightImportStatus;

interface ImportResult {
  created: number;
  updated: number;
  unchanged: number;
  failures: FreightImportFailure[];
}

const STATUS_STYLE: Record<FreightImportStatus, { label: string; pill: string; dot: string }> = {
  new: { label: 'Nova tarifa', pill: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  update: { label: 'Atualizar valor', pill: 'text-amber-800 bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  unchanged: { label: 'Sem alteração', pill: 'text-slate-600 bg-slate-50 border-slate-200', dot: 'bg-slate-300' },
  error: { label: 'Erro', pill: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
};

const StatusPill: React.FC<{ status: FreightImportStatus }> = ({ status }) => {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${style.pill}`}
    >
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
};

const SummaryCard: React.FC<{ label: string; value: number; tone: string; valueTone: string }> = ({
  label,
  value,
  tone,
  valueTone,
}) => (
  <div className={`rounded-lg border p-3 ${tone}`}>
    <div className="text-[11px]">{label}</div>
    <div className={`text-lg font-bold font-mono ${valueTone}`}>{formatNumber(value)}</div>
  </div>
);

const PreviewRowDetail: React.FC<{ row: FreightImportPreviewRow }> = ({ row }) => {
  if (row.status === 'error') {
    return (
      <ul className="mt-1 space-y-0.5 text-[11px] text-rose-700">
        {row.errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    );
  }
  if (row.status === 'update' && row.currentValue !== undefined && row.value !== null) {
    return (
      <div className="mt-1 text-[11px] text-amber-800 font-mono whitespace-nowrap">
        {formatCurrency(row.currentValue)} → {formatCurrency(row.value)}
        {row.tariffInactive && <span className="ml-1 font-sans text-slate-500">(tarifa inativa; status mantido)</span>}
      </div>
    );
  }
  return null;
};

export const FreightImportModal: React.FC<FreightImportModalProps> = ({ isOpen, onClose }) => {
  const { isOnlineConnected, refreshFreightPricing } = useTransport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<FreightImportRow[]>([]);
  const [plan, setPlan] = useState<FreightImportPlan | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busy, setBusy] = useState<'validating' | 'importing' | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState(false);

  const resetToSelect = () => {
    setStep('select');
    setFile(null);
    setRows([]);
    setPlan(null);
    setResult(null);
    setStatusFilter('all');
    setFatalError(null);
    setStaleNotice(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (isOpen) resetToSelect();
  }, [isOpen]);

  if (!isOpen) return null;

  const canImport = isOnlineConnected && Boolean(getSupabase());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
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

  const handleValidate = async () => {
    if (!file) {
      setFatalError('Selecione um arquivo CSV ou XLSX para importar.');
      return;
    }

    setBusy('validating');
    setFatalError(null);
    setStaleNotice(false);

    try {
      const parsed = await parseFreightImportFile(file);
      if (parsed.length === 0) {
        setFatalError('O arquivo não possui linhas de dados abaixo do cabeçalho.');
        return;
      }
      const validated = await validateFreightImport(parsed);
      setRows(parsed);
      setPlan(validated);
      setStatusFilter(validated.summary.errorCount > 0 ? 'error' : 'all');
      setStep('preview');
    } catch (err: any) {
      setFatalError(err?.message || String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleConfirm = async () => {
    if (!plan || plan.summary.errorCount > 0) return;

    setBusy('importing');
    setFatalError(null);
    setStaleNotice(false);

    try {
      const outcome = await applyFreightImport(rows, plan);
      if (outcome.status === 'stale') {
        setPlan(outcome.plan);
        setStatusFilter(outcome.plan.summary.errorCount > 0 ? 'error' : 'all');
        setStaleNotice(true);
        return;
      }

      setResult(outcome);
      setStep('done');
      await refreshFreightPricing().catch(() => undefined);
    } catch (err: any) {
      setFatalError(err?.message || String(err));
    } finally {
      setBusy(null);
    }
  };

  const summary = plan?.summary;
  const hasErrors = Boolean(summary && summary.errorCount > 0);
  const pendingChanges = summary ? summary.newCount + summary.updateCount : 0;
  const visibleRows = plan ? plan.rows.filter((r) => statusFilter === 'all' || r.status === statusFilter) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Importar Valores da Tabela de Fretes</h2>
              <p className="text-xs text-slate-500">
                Atualização em massa dos valores de frete a partir de planilha CSV ou XLSX
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy === 'importing'}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {step === 'select' && (
            <>
              {/* Instructions */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-3.5 text-xs text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <Info size={14} className="text-emerald-600" />
                  <span>Estrutura obrigatória do arquivo</span>
                </div>
                <div className="font-mono text-[11px] bg-white border border-emerald-200 rounded px-2.5 py-1.5 text-slate-800">
                  {FREIGHT_IMPORT_COLUMNS.join(' | ')}
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700">
                  <li>
                    A tarifa é identificada por <strong>CLIENTE + BLOCO + ROTA + TIPO DE CARRO</strong>. A filial não
                    participa.
                  </li>
                  <li>
                    Cliente, bloco e tipo de carro devem estar cadastrados e ativos (maiúsculas, acentos e espaços extras
                    são ignorados).
                  </li>
                  <li>A rota deve pertencer ao cliente e bloco informados e ter KM válido no Cadastro de Rotas.</li>
                  <li>
                    <strong>VALOR DO FRETE</strong>: maior que zero. Aceita 3500, 3500,50, 3.500,50 ou 3500.50.
                  </li>
                  <li>
                    KM e R$/KM <strong>não</strong> são importados: o KM vem do Cadastro de Rotas e o R$/KM é calculado
                    (Valor do Frete ÷ KM da Rota).
                  </li>
                  <li>
                    Tarifa existente tem o valor atualizado com registro no histórico; tarifa nova é cadastrada como
                    ativa, vigente a partir de hoje.
                  </li>
                  <li>Nada é gravado enquanto houver erro: corrija a planilha e importe novamente.</li>
                </ul>
                <button
                  type="button"
                  onClick={downloadFreightImportTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-300 rounded-md hover:bg-emerald-50 transition-colors"
                >
                  <Download size={13} />
                  <span>Baixar Modelo</span>
                </button>
              </div>

              {!canImport && (
                <div className="p-2.5 rounded-md text-xs border flex items-center gap-2 bg-amber-50 border-amber-200 text-amber-800">
                  <AlertCircle size={14} className="text-amber-600 shrink-0" />
                  <span>Conecte o Supabase para importar valores. Os dados são gravados diretamente no banco.</span>
                </div>
              )}

              {/* File picker */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                <label className="block text-xs font-semibold text-slate-700">Arquivo de valores (.csv ou .xlsx)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  disabled={busy !== null}
                  className="block w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-100"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleValidate}
                    disabled={!file || busy !== null || !canImport}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-md transition-colors shadow-xs"
                  >
                    {busy === 'validating' ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Validando...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Validar Planilha</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {fatalError && (
            <div className="p-2.5 rounded-md text-xs border flex items-start gap-2 bg-rose-50 border-rose-200 text-rose-800">
              <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{fatalError}</span>
            </div>
          )}

          {step === 'preview' && plan && summary && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span>Resumo da importação</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono truncate">{file?.name}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <SummaryCard
                  label="Total de linhas"
                  value={summary.total}
                  tone="border-slate-200 bg-slate-50 text-slate-500"
                  valueTone="text-slate-900"
                />
                <SummaryCard
                  label="Novas tarifas"
                  value={summary.newCount}
                  tone="border-emerald-200 bg-emerald-50 text-emerald-700"
                  valueTone="text-emerald-800"
                />
                <SummaryCard
                  label="Valores que serão atualizados"
                  value={summary.updateCount}
                  tone="border-amber-200 bg-amber-50 text-amber-700"
                  valueTone="text-amber-800"
                />
                <SummaryCard
                  label="Sem alteração"
                  value={summary.unchangedCount}
                  tone="border-slate-200 bg-white text-slate-500"
                  valueTone="text-slate-700"
                />
                <SummaryCard
                  label="Erros"
                  value={summary.errorCount}
                  tone="border-rose-200 bg-rose-50 text-rose-700"
                  valueTone="text-rose-800"
                />
              </div>

              {staleNotice && (
                <div className="p-2.5 rounded-md text-xs border flex items-start gap-2 bg-amber-50 border-amber-200 text-amber-800">
                  <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Os cadastros ou a Tabela de Fretes foram alterados desde a validação. Nada foi gravado: confira a
                    prévia atualizada abaixo antes de confirmar novamente.
                  </span>
                </div>
              )}

              {hasErrors ? (
                <div className="p-2.5 rounded-md text-xs border flex items-start gap-2 bg-rose-50 border-rose-200 text-rose-800">
                  <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    A planilha possui {formatNumber(summary.errorCount)} linha(s) com erro. Nenhum valor será gravado:
                    corrija a planilha e importe novamente.
                  </span>
                </div>
              ) : pendingChanges === 0 ? (
                <div className="p-2.5 rounded-md text-xs border flex items-start gap-2 bg-slate-50 border-slate-200 text-slate-700">
                  <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Todos os valores da planilha já são iguais aos da Tabela de Fretes. Não há nada para gravar.</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-md text-xs border flex items-start gap-2 bg-emerald-50 border-emerald-200 text-emerald-800">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Validação concluída sem erros. Confira a prévia e confirme a importação.</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Exibindo {formatNumber(visibleRows.length)} de {formatNumber(plan.rows.length)} linhas
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-emerald-600"
                >
                  <option value="all">Todas as situações</option>
                  <option value="new">Nova tarifa</option>
                  <option value="update">Atualizar valor</option>
                  <option value="unchanged">Sem alteração</option>
                  <option value="error">Erro</option>
                </select>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-[45vh] overflow-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3 w-14">Linha</th>
                        <th className="py-2 px-3">Cliente</th>
                        <th className="py-2 px-3">Bloco</th>
                        <th className="py-2 px-3">Rota</th>
                        <th className="py-2 px-3">Tipo de Carro</th>
                        <th className="py-2 px-3 text-right">Valor</th>
                        <th className="py-2 px-3">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            Nenhuma linha nesta situação.
                          </td>
                        </tr>
                      ) : (
                        visibleRows.map((row) => (
                          <tr key={row.lineNumber} className="align-top hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.lineNumber}</td>
                            <td className="py-2 px-3 text-slate-800">{row.cliente || '-'}</td>
                            <td className="py-2 px-3 text-slate-700">{row.bloco || '-'}</td>
                            <td className="py-2 px-3 text-slate-800">
                              <div>{row.rota || '-'}</div>
                              {row.routeKm !== undefined && row.value !== null && row.value > 0 && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {formatKm(row.routeKm)} · {formatCurrency(row.value / row.routeKm)}/km
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-700">{row.tipoCarro || '-'}</td>
                            <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                              {row.value !== null ? (
                                <span className="font-semibold text-slate-900">{formatCurrency(row.value)}</span>
                              ) : (
                                <span className="text-rose-700">{row.valorText || '-'}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 min-w-[200px]">
                              <StatusPill status={row.status} />
                              <PreviewRowDetail row={row} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>Importação concluída</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <SummaryCard
                  label="Novas tarifas cadastradas"
                  value={result.created}
                  tone="border-emerald-200 bg-emerald-50 text-emerald-700"
                  valueTone="text-emerald-800"
                />
                <SummaryCard
                  label="Tarifas atualizadas"
                  value={result.updated}
                  tone="border-amber-200 bg-amber-50 text-amber-700"
                  valueTone="text-amber-800"
                />
                <SummaryCard
                  label="Sem alteração"
                  value={result.unchanged}
                  tone="border-slate-200 bg-slate-50 text-slate-500"
                  valueTone="text-slate-700"
                />
              </div>

              {result.failures.length > 0 && (
                <div className="border border-rose-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-rose-50 text-xs font-semibold text-rose-800">
                    Linhas que não puderam ser gravadas no Supabase
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <tbody className="divide-y divide-slate-100">
                        {result.failures.map((f) => (
                          <tr key={f.lineNumber}>
                            <td className="py-2 px-3 w-16 font-mono font-bold text-slate-800">{f.lineNumber}</td>
                            <td className="py-2 px-3 text-rose-700">{f.reason}</td>
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
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            {step === 'preview' && (
              <>
                <button
                  type="button"
                  onClick={resetToSelect}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft size={13} />
                  <span>Escolher outro arquivo</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={hasErrors || pendingChanges === 0 || busy !== null || !canImport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy === 'importing' ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Gravando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Confirmar importação</span>
                    </>
                  )}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={busy === 'importing'}
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
