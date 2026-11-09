import React, { useMemo, useState } from 'react';
import {
  Landmark,
  Search,
  Eye,
  Edit2,
  AlertCircle,
  Database,
  FileText,
  Truck,
  Wallet,
  CalendarClock,
  RefreshCw,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { useFinancing } from '../../context/FinancingContext';
import { VehicleFinancing } from '../../types';
import { MetricCard } from '../common/MetricCard';
import { FinancingModal } from '../modals/FinancingModal';
import { FinancingDetailModal, FINANCING_STATUS_STYLES } from '../modals/FinancingDetailModal';
import { isLinkActiveOn } from '../../utils/financing';
import { formatCurrency, formatDate, getTodayISO } from '../../utils/formatters';

export const FinancingView: React.FC = () => {
  const { vehicles, isOnlineConnected } = useTransport();
  const { financings, financingVehicles, installments, financingError, isLoadingFinancing, reloadFinancing } =
    useFinancing();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Ativo');
  const [modalOpen, setModalOpen] = useState(false);
  const [financingToEdit, setFinancingToEdit] = useState<VehicleFinancing | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const today = getTodayISO();
  const plateById = useMemo(() => new Map(vehicles.map((v) => [v.id, v.plate])), [vehicles]);

  const activePlatesByFinancing = useMemo(() => {
    const map = new Map<string, string[]>();
    financingVehicles.forEach((link) => {
      if (!isLinkActiveOn(link, today)) return;
      const list = map.get(link.financingId) || [];
      list.push(plateById.get(link.vehicleId) || '?');
      map.set(link.financingId, list);
    });
    map.forEach((list) => list.sort());
    return map;
  }, [financingVehicles, plateById, today]);

  const installmentsCountByFinancing = useMemo(() => {
    const map = new Map<string, number>();
    installments.forEach((p) => map.set(p.financingId, (map.get(p.financingId) || 0) + 1));
    return map;
  }, [installments]);

  const kpis = useMemo(() => {
    const active = financings.filter((f) => f.status === 'Ativo');
    const linkedPlates = new Set(
      financingVehicles
        .filter((l) => isLinkActiveOn(l, today) && active.some((f) => f.id === l.financingId))
        .map((l) => l.vehicleId)
    );
    return {
      activeCount: active.length,
      monthlyTotal: active.reduce((acc, f) => acc + f.installmentValue, 0),
      linkedPlates: linkedPlates.size,
      pendingGeneration: active.filter((f) => !installmentsCountByFinancing.has(f.id)).length,
      withoutPlates: active.filter((f) => !activePlatesByFinancing.has(f.id)).length,
    };
  }, [financings, financingVehicles, installmentsCountByFinancing, activePlatesByFinancing, today]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return financings.filter((f) => {
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (!q) return true;
      const plates = activePlatesByFinancing.get(f.id) || [];
      return (
        f.creditor.toUpperCase().includes(q) ||
        f.contractNumber.toUpperCase().includes(q) ||
        f.description.toUpperCase().includes(q) ||
        plates.some((p) => p.toUpperCase().includes(q))
      );
    });
  }, [financings, search, statusFilter, activePlatesByFinancing]);

  const openNew = () => {
    setFinancingToEdit(null);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const target = financings.find((f) => f.id === id) || null;
    if (!target) return;
    setFinancingToEdit(target);
    setModalOpen(true);
  };

  if (!isOnlineConnected) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500 text-xs space-y-2">
        <Database size={22} className="mx-auto text-amber-500" />
        <p className="font-semibold text-slate-700">Supabase offline</p>
        <p>O módulo de Financiamentos utiliza exclusivamente os dados do Supabase. Conecte o banco para continuar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Landmark size={18} className="text-indigo-600" />
            Financiamento de Veículos
          </h3>
          <p className="text-xs text-slate-500">
            Contratos, placas vinculadas e parcelas. A parcela mensal será rateada pelos KM rodados de cada placa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => reloadFinancing()}
            disabled={isLoadingFinancing}
            title="Recarregar financiamentos"
            className="p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoadingFinancing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openNew}
            disabled={Boolean(financingError)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-md transition-colors shadow-xs"
          >
            <span>+ Novo Financiamento</span>
          </button>
        </div>
      </div>

      {financingError && (
        <div className="p-3 rounded-md text-xs border flex items-start gap-2 bg-amber-50 border-amber-200 text-amber-800">
          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <span>Não foi possível carregar os financiamentos: {financingError}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Contratos Ativos"
          value={`${kpis.activeCount}`}
          subLabel={`de ${financings.length} cadastrados`}
          variant="primary"
          icon={FileText}
        />
        <MetricCard
          label="Parcelas / Mês"
          value={formatCurrency(kpis.monthlyTotal)}
          subLabel="soma dos contratos ativos"
          icon={Wallet}
        />
        <MetricCard
          label="Placas Vinculadas"
          value={`${kpis.linkedPlates}`}
          subLabel={kpis.withoutPlates > 0 ? `${kpis.withoutPlates} contrato(s) sem placa` : 'vínculos vigentes'}
          variant={kpis.withoutPlates > 0 ? 'warning' : 'default'}
          icon={Truck}
        />
        <MetricCard
          label="Parcelas a Gerar"
          value={`${kpis.pendingGeneration}`}
          subLabel="contratos ativos sem parcelas"
          variant={kpis.pendingGeneration > 0 ? 'warning' : 'default'}
          icon={CalendarClock}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por credor, contrato, descrição ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-indigo-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-indigo-600"
        >
          <option value="all">Todos os Status</option>
          <option value="Ativo">Ativo</option>
          <option value="Quitado">Quitado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Credor / Contrato</th>
                <th className="py-3 px-3">Placas Vigentes</th>
                <th className="py-3 px-3 text-right">Parcela</th>
                <th className="py-3 px-3">1º Vencimento</th>
                <th className="py-3 px-3 text-center">Parcelas Geradas</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {isLoadingFinancing
                      ? 'Carregando financiamentos...'
                      : financings.length === 0
                        ? 'Nenhum financiamento cadastrado. Clique em "+ Novo Financiamento" para cadastrar o primeiro.'
                        : 'Nenhum financiamento encontrado com estes critérios.'}
                  </td>
                </tr>
              ) : (
                filtered.map((f) => {
                  const plates = activePlatesByFinancing.get(f.id) || [];
                  const generated = installmentsCountByFinancing.get(f.id) || 0;
                  const statusStyle = FINANCING_STATUS_STYLES[f.status];
                  return (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{f.creditor}</div>
                        <div className="text-[11px] text-slate-500">
                          <span className="font-mono">{f.contractNumber || 'sem número'}</span>
                          {f.description ? ` · ${f.description}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {plates.length === 0 ? (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            Sem placa vigente
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {plates.map((plate, idx) => (
                              <span
                                key={`${plate}-${idx}`}
                                className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded"
                              >
                                {plate}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">{formatCurrency(f.installmentValue)}</div>
                        <div className="text-[11px] text-slate-500">{f.installmentsCount}x</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">{formatDate(f.firstInstallmentDate)}</td>
                      <td className="py-3 px-3 text-center">
                        {generated > 0 ? (
                          <span className="font-mono text-slate-700">
                            {generated}/{f.installmentsCount}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Não geradas</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${statusStyle.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {f.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setDetailId(f.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          >
                            <Eye size={12} />
                            Detalhes
                          </button>
                          <button
                            onClick={() => openEdit(f.id)}
                            title="Editar financiamento"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FinancingDetailModal
        financingId={modalOpen ? null : detailId}
        onClose={() => setDetailId(null)}
        onEdit={openEdit}
      />
      <FinancingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} financingToEdit={financingToEdit} />
    </div>
  );
};
