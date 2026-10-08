import React, { useCallback, useEffect, useState } from 'react';
import { X, BookOpen, Users, Layers, MapPin, Truck, Search, Download, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { getSupabase } from '../../lib/supabase';
import { CommonStatus } from '../../types';
import { ImportReferences, downloadImportReferencesXlsx, loadImportReferences } from '../../services/importReferenceService';
import { normalizeText } from '../../services/routeImportService';
import { formatDateTime, formatKm, formatNumber } from '../../utils/formatters';

interface ImportReferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReferenceTab = 'clients' | 'blocks' | 'routes' | 'vehicleTypes';

const TABS: { id: ReferenceTab; label: string; icon: React.ElementType; searchPlaceholder: string }[] = [
  { id: 'clients', label: '1. Clientes', icon: Users, searchPlaceholder: 'Buscar cliente pelo nome...' },
  { id: 'blocks', label: '2. Blocos', icon: Layers, searchPlaceholder: 'Buscar bloco por código ou nome...' },
  { id: 'routes', label: '3. Rotas', icon: MapPin, searchPlaceholder: 'Buscar por código, cliente, bloco ou rota...' },
  { id: 'vehicleTypes', label: '4. Tipos de Carro', icon: Truck, searchPlaceholder: 'Buscar por tipo de carro ou categoria...' },
];

const StatusBadge: React.FC<{ status: CommonStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
      status === 'Ativo' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${status === 'Ativo' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
    {status}
  </span>
);

const EmptyRow: React.FC<{ colSpan: number; searching: boolean }> = ({ colSpan, searching }) => (
  <tr>
    <td colSpan={colSpan} className="py-8 text-center text-slate-400">
      {searching ? 'Nenhum resultado encontrado para a busca.' : 'Nenhum registro cadastrado.'}
    </td>
  </tr>
);

const matches = (query: string, ...fields: string[]) => !query || normalizeText(fields.join(' ')).includes(query);

const TH = 'py-2.5 px-3 bg-slate-50 sticky top-0 z-10 border-b border-slate-200';

export const ImportReferencesModal: React.FC<ImportReferencesModalProps> = ({ isOpen, onClose }) => {
  const { isOnlineConnected } = useTransport();
  const canQuery = isOnlineConnected && Boolean(getSupabase());

  const [activeTab, setActiveTab] = useState<ReferenceTab>('clients');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ImportReferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadImportReferences());
    } catch (err: any) {
      setData(null);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('clients');
    setSearch('');
    setData(null);
    setError(null);
    if (canQuery) load();
  }, [isOpen, canQuery, load]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadImportReferencesXlsx(data);
    } catch (err: any) {
      setError(`Não foi possível gerar o arquivo XLSX: ${err?.message || err}`);
    } finally {
      setDownloading(false);
    }
  };

  const query = normalizeText(search);
  const counts: Record<ReferenceTab, number> = {
    clients: data?.clients.length ?? 0,
    blocks: data?.blocks.length ?? 0,
    routes: data?.routes.length ?? 0,
    vehicleTypes: data?.vehicleTypes.length ?? 0,
  };
  const currentTab = TABS.find((t) => t.id === activeTab)!;

  const renderTable = () => {
    if (!data) return null;

    if (activeTab === 'clients') {
      const rows = data.clients.filter((c) => matches(query, c.name));
      return (
        <table className="w-full text-xs text-left">
          <thead className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className={TH}>Cliente</th>
              <th className={TH}>Documento</th>
              <th className={`${TH} text-center`}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <EmptyRow colSpan={3} searching={Boolean(query)} />
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{c.document || '-'}</td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'blocks') {
      const rows = data.blocks.filter((b) => matches(query, b.code, b.name));
      return (
        <table className="w-full text-xs text-left">
          <thead className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className={`${TH} w-24`}>Código</th>
              <th className={TH}>Bloco</th>
              <th className={`${TH} text-center`}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <EmptyRow colSpan={3} searching={Boolean(query)} />
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{b.code || '-'}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                      {b.name}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'routes') {
      const rows = data.routes.filter((r) => matches(query, r.code, r.clientName, r.blockName, r.name));
      return (
        <table className="w-full text-xs text-left">
          <thead className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className={TH}>Código</th>
              <th className={TH}>Cliente</th>
              <th className={TH}>Bloco</th>
              <th className={TH}>Rota</th>
              <th className={`${TH} text-right`}>KM</th>
              <th className={`${TH} text-center`}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} searching={Boolean(query)} />
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors align-top">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 rounded border border-blue-200 whitespace-nowrap">
                      {r.code || '-'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 min-w-[160px]">
                    {r.clientName || <span className="text-slate-400 font-normal italic">Sem cliente</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    {!r.blockName ? (
                      <span className="text-slate-400 italic">Sem bloco</span>
                    ) : r.blockRegistered ? (
                      <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap">
                        {r.blockName}
                      </span>
                    ) : (
                      <span
                        className="text-amber-800 bg-amber-50 border border-dashed border-amber-300 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap"
                        title="Texto antigo: bloco não vinculado ao Cadastro de Blocos. A importação não localiza esta rota até o bloco ser vinculado."
                      >
                        {r.blockName}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 min-w-[180px]">{r.name}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    {r.distanceKm > 0 ? formatKm(r.distanceKm) : <span className="text-rose-600 font-sans">Sem KM</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      );
    }

    const rows = data.vehicleTypes.filter((t) => matches(query, t.name, t.category));
    return (
      <table className="w-full text-xs text-left">
        <thead className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
          <tr>
            <th className={TH}>Tipo de Carro</th>
            <th className={TH}>Categoria</th>
            <th className={TH}>Capacidade de Carga</th>
            <th className={`${TH} text-right`}>Eixos</th>
            <th className={`${TH} text-center`}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <EmptyRow colSpan={5} searching={Boolean(query)} />
          ) : (
            rows.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-3">
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                    {t.name}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-700">{t.category || '-'}</td>
                <td className="py-2.5 px-3 font-mono text-slate-600">{t.payloadCapacity || '-'}</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-600">{t.axlesCount || '-'}</td>
                <td className="py-2.5 px-3 text-center">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-5xl h-[min(760px,calc(100dvh-2rem))] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Referências para Importação</h2>
              <p className="text-xs text-slate-500">
                Consulte os nomes e códigos cadastrados antes de preparar sua planilha.
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

        {/* Tabs & Search */}
        <div className="shrink-0 border-b border-slate-200">
          <div className="flex space-x-1 sm:space-x-2 px-4 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearch('');
                  }}
                  className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      active ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {formatNumber(counts[tab.id])}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3 bg-white flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={currentTab.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={!data}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-emerald-600 disabled:bg-slate-50"
              />
            </div>
            {activeTab === 'clients' && data && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Info size={12} className="text-slate-400" />
                Clientes não possuem código no cadastro: use o nome exatamente como aparece aqui.
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto overscroll-contain">
          {!canQuery ? (
            <div className="m-6 p-2.5 rounded-md text-xs border flex items-center gap-2 bg-amber-50 border-amber-200 text-amber-800">
              <AlertCircle size={14} className="text-amber-600 shrink-0" />
              <span>Conecte o Supabase para consultar as referências. Os dados são lidos diretamente do banco.</span>
            </div>
          ) : loading || (!data && !error) ? (
            <div className="py-16 flex items-center justify-center gap-2 text-xs text-slate-500">
              <RefreshCw size={14} className="animate-spin" />
              <span>Consultando cadastros no Supabase...</span>
            </div>
          ) : error && !data ? (
            <div className="m-6 p-2.5 rounded-md text-xs border flex items-start gap-2 bg-rose-50 border-rose-200 text-rose-800">
              <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : (
            renderTable()
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">
            {error && data ? (
              <span className="text-rose-700">{error}</span>
            ) : data ? (
              <span>
                Somente consulta · Dados do Supabase carregados em {formatDateTime(data.loadedAt)}
              </span>
            ) : (
              <span>Somente consulta · Nenhum cadastro é criado ou alterado.</span>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={load}
              disabled={!canQuery || loading}
              title="Consultar novamente os cadastros no Supabase"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Atualizar</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!data || loading || downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Baixar Referências</span>
            </button>
            <button
              type="button"
              onClick={onClose}
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
