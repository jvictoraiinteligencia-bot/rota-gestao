import React, { useEffect, useMemo, useState } from 'react';
import {
  Truck,
  Calendar,
  ChevronDown,
  X,
  ArrowDownWideNarrow,
  AlertTriangle,
  DollarSign,
  Receipt,
  TrendingUp,
  Percent,
  Database,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { MetricCard } from '../common/MetricCard';
import { Expense, PeriodFilter, Trip } from '../../types';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatKm,
  formatDate,
  formatMonthLabel,
  getFirstDayOfMonthISO,
  getRecentMonthKeys,
  getTodayISO,
} from '../../utils/formatters';
import {
  COST_BUCKET_LABELS,
  FleetSortKey,
  PlateFinancials,
  computePlateFinancials,
  getPeriodRange,
  isDateInRange,
  normalizeText,
  safeRatio,
  sortPlateFinancials,
} from '../../utils/fleetFinancials';

interface FleetFilters {
  period: PeriodFilter;
  startDate: string;
  endDate: string;
  branch: string;
  vehicleId: string;
  vehicleType: string;
  clientId: string;
  driverId: string;
}

const DEFAULT_FILTERS: FleetFilters = {
  period: 'all',
  startDate: '',
  endDate: '',
  branch: 'all',
  vehicleId: 'all',
  vehicleType: 'all',
  clientId: 'all',
  driverId: 'all',
};

const SORT_OPTIONS: Array<{ id: FleetSortKey; label: string }> = [
  { id: 'faturamento', label: 'Maior faturamento' },
  { id: 'resultado', label: 'Maior resultado' },
  { id: 'margem', label: 'Maior margem' },
  { id: 'custo', label: 'Maior custo' },
  { id: 'km', label: 'Maior KM' },
];

const DASH = '—';

const formatCurrencyOrDash = (value: number | null) => (value === null ? DASH : formatCurrency(value));
const formatPerKmOrDash = (value: number | null) => (value === null ? DASH : `${formatCurrency(value)}/km`);
const formatPercentOrDash = (value: number | null) => (value === null ? DASH : formatPercent(value));

const toneText = (value: number | null) => {
  if (value === null || value === 0) return 'text-slate-700';
  return value > 0 ? 'text-emerald-700' : 'text-rose-600';
};

const toneBadge = (value: number | null) => {
  if (value === null || value === 0) return 'bg-slate-100 text-slate-700';
  return value > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
};

const toneBorder = (value: number) => {
  if (value === 0) return 'border-l-slate-300';
  return value > 0 ? 'border-l-emerald-600' : 'border-l-rose-500';
};

const selectClassName =
  'w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:outline-blue-600';

export const VehicleAnalysisView: React.FC = () => {
  const {
    vehicles,
    trips,
    expenses,
    branches,
    vehicleTypes,
    clients,
    drivers,
    isOnlineConnected,
    selectedVehicleIdForAnalysis,
    setSelectedVehicleIdForAnalysis,
  } = useTransport();

  const [filters, setFilters] = useState<FleetFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<FleetSortKey>('faturamento');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [lastMonthKey, currentMonthKey] = getRecentMonthKeys(2);
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

  // Other screens open this view for a specific plate via navigateToVehicleAnalysis.
  useEffect(() => {
    if (!selectedVehicleIdForAnalysis) return;
    const targetId = selectedVehicleIdForAnalysis;
    setExpandedIds((prev) => new Set(prev).add(targetId));
    setSelectedVehicleIdForAnalysis('');
    requestAnimationFrame(() => {
      document.getElementById(`plate-card-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [selectedVehicleIdForAnalysis, setSelectedVehicleIdForAnalysis]);

  const isFiltered =
    filters.period !== 'all' ||
    filters.branch !== 'all' ||
    filters.vehicleId !== 'all' ||
    filters.vehicleType !== 'all' ||
    filters.clientId !== 'all' ||
    filters.driverId !== 'all';

  const updateFilter = <K extends keyof FleetFilters>(key: K, value: FleetFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handlePeriodChange = (period: PeriodFilter) => {
    setFilters((prev) => ({
      ...prev,
      period,
      startDate: period === 'custom' ? prev.startDate || getFirstDayOfMonthISO() : prev.startDate,
      endDate: period === 'custom' ? prev.endDate || getTodayISO() : prev.endDate,
    }));
  };

  const toggleExpanded = (vehicleId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleId)) next.delete(vehicleId);
      else next.add(vehicleId);
      return next;
    });
  };

  const fleet = useMemo(() => {
    const range = getPeriodRange(filters.period, filters.startDate, filters.endDate);
    const selectedClient = clients.find((c) => c.id === filters.clientId);
    const selectedClientName = selectedClient ? normalizeText(selectedClient.name) : '';

    // Viagens antigas não têm cliente_id e guardam o cliente apenas como texto.
    const matchesClient = (t: Trip) => {
      if (filters.clientId === 'all') return true;
      if (t.clientId) return t.clientId === filters.clientId;
      return Boolean(selectedClientName) && normalizeText(t.client) === selectedClientName;
    };

    const tripMatches = (t: Trip) =>
      isDateInRange(t.date, range) &&
      (filters.branch === 'all' || t.branch === filters.branch) &&
      (filters.driverId === 'all' || t.driverId === filters.driverId) &&
      matchesClient(t);

    // Despesas não têm cliente; sem motorista vinculado continuam como custo da placa.
    const expenseMatches = (e: Expense) =>
      isDateInRange(e.date, range) &&
      (filters.branch === 'all' || e.branch === filters.branch) &&
      (filters.driverId === 'all' || !e.driverId || e.driverId === filters.driverId);

    const vehicleIds = new Set(vehicles.map((v) => v.id));
    const tripsByVehicle = new Map<string, Trip[]>();
    const expensesByVehicle = new Map<string, Expense[]>();
    const unlinkedTrips: Trip[] = [];
    const unlinkedExpenses: Expense[] = [];

    trips.forEach((t) => {
      if (!tripMatches(t)) return;
      if (!t.vehicleId || !vehicleIds.has(t.vehicleId)) {
        unlinkedTrips.push(t);
        return;
      }
      const list = tripsByVehicle.get(t.vehicleId) || [];
      list.push(t);
      tripsByVehicle.set(t.vehicleId, list);
    });

    expenses.forEach((e) => {
      if (!expenseMatches(e)) return;
      if (!e.vehicleId || !vehicleIds.has(e.vehicleId)) {
        unlinkedExpenses.push(e);
        return;
      }
      const list = expensesByVehicle.get(e.vehicleId) || [];
      list.push(e);
      expensesByVehicle.set(e.vehicleId, list);
    });

    const listedVehicles = vehicles.filter((v) => {
      if (filters.vehicleId !== 'all' && v.id !== filters.vehicleId) return false;
      if (filters.vehicleType !== 'all' && v.vehicleType !== filters.vehicleType) return false;

      const vTrips = tripsByVehicle.get(v.id) || [];
      const vExpenses = expensesByVehicle.get(v.id) || [];

      if (filters.branch !== 'all' && v.branch !== filters.branch && vTrips.length === 0 && vExpenses.length === 0)
        return false;
      if (filters.clientId !== 'all' && vTrips.length === 0) return false;
      if (
        filters.driverId !== 'all' &&
        vTrips.length === 0 &&
        !vExpenses.some((e) => e.driverId === filters.driverId)
      )
        return false;
      return true;
    });

    const plates = sortPlateFinancials(
      listedVehicles.map((v) =>
        computePlateFinancials(v, tripsByVehicle.get(v.id) || [], expensesByVehicle.get(v.id) || [])
      ),
      sortBy
    );

    const totals = plates.reduce(
      (acc, p) => ({
        faturamento: acc.faturamento + p.faturamento,
        custoTotal: acc.custoTotal + p.custoTotal,
        viagens: acc.viagens + p.viagens,
        km: acc.km + p.km,
      }),
      { faturamento: 0, custoTotal: 0, viagens: 0, km: 0 }
    );
    const resultadoTotal = Math.round((totals.faturamento - totals.custoTotal) * 100) / 100;
    const margemRatio = safeRatio(resultadoTotal, totals.faturamento);

    const showUnlinked = filters.vehicleId === 'all' && filters.vehicleType === 'all';

    return {
      plates,
      totals: {
        ...totals,
        resultado: resultadoTotal,
        margem: margemRatio === null ? null : margemRatio * 100,
        custoPorKm: safeRatio(totals.custoTotal, totals.km),
      },
      unlinked: showUnlinked
        ? {
            trips: unlinkedTrips.length,
            tripsValue: unlinkedTrips.reduce((acc, t) => acc + (t.freightValue || 0), 0),
            expenses: unlinkedExpenses.length,
            expensesValue: unlinkedExpenses.reduce((acc, e) => acc + (e.amount || 0), 0),
          }
        : null,
    };
  }, [vehicles, trips, expenses, clients, filters, sortBy]);

  if (!isOnlineConnected) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500 text-xs space-y-2">
        <Database size={22} className="mx-auto text-amber-500" />
        <p className="font-semibold text-slate-700">Supabase offline</p>
        <p>O Dashboard Financeiro da Frota utiliza exclusivamente os dados do Supabase. Conecte o banco para visualizar os indicadores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar size={13} />
              Período:
            </span>
            {[
              { id: 'all', label: 'Histórico Completo' },
              { id: 'thisMonth', label: `Mês Atual (${formatMonthLabel(currentMonthKey, 'short')})` },
              { id: 'last30days', label: 'Últimos 30 Dias' },
              { id: 'lastMonth', label: `Mês Anterior (${formatMonthLabel(lastMonthKey, 'short')})` },
              { id: 'thisQuarter', label: `${currentQuarter}º Trimestre` },
              { id: 'thisYear', label: 'Ano Atual' },
              { id: 'custom', label: 'Personalizado' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handlePeriodChange(item.id as PeriodFilter)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  filters.period === item.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isFiltered && (
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md transition-colors"
              >
                <X size={13} />
                Limpar Filtros
              </button>
            )}
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <ArrowDownWideNarrow size={14} className="text-slate-500" />
              <span className="font-semibold">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as FleetSortKey)}
                className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-800 focus:outline-blue-600"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filters.period === 'custom' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600">De:</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-600"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600">Até:</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-600"
              />
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filial</label>
            <select value={filters.branch} onChange={(e) => updateFilter('branch', e.target.value)} className={selectClassName}>
              <option value="all">Todas as Filiais</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Placa</label>
            <select
              value={filters.vehicleId}
              onChange={(e) => updateFilter('vehicleId', e.target.value)}
              className={`${selectClassName} font-mono`}
            >
              <option value="all">Todas as Placas</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate}
                  {v.vehicleType ? ` (${v.vehicleType})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de Veículo</label>
            <select
              value={filters.vehicleType}
              onChange={(e) => updateFilter('vehicleType', e.target.value)}
              className={selectClassName}
            >
              <option value="all">Todos os Tipos</option>
              {vehicleTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cliente</label>
            <select value={filters.clientId} onChange={(e) => updateFilter('clientId', e.target.value)} className={selectClassName}>
              <option value="all">Todos os Clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Motorista</label>
            <select value={filters.driverId} onChange={(e) => updateFilter('driverId', e.target.value)} className={selectClassName}>
              <option value="all">Todos os Motoristas</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(filters.clientId !== 'all' || filters.driverId !== 'all') && (
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded px-2.5 py-1.5">
            {filters.clientId !== 'all' &&
              'Filtro de cliente: o faturamento considera apenas as viagens do cliente; as despesas da placa no período entram integralmente, pois despesas não têm cliente vinculado. '}
            {filters.driverId !== 'all' &&
              'Filtro de motorista: considera viagens e despesas do motorista; despesas da placa sem motorista vinculado continuam no custo.'}
          </p>
        )}
      </div>

      {/* Fleet totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Faturamento da Frota"
          value={formatCurrency(fleet.totals.faturamento)}
          subValue={`${formatNumber(fleet.totals.viagens)} viagens`}
          subLabel={`· ${formatKm(fleet.totals.km)}`}
          icon={DollarSign}
          variant="primary"
        />
        <MetricCard
          label="Custo Total"
          value={formatCurrency(fleet.totals.custoTotal)}
          subValue={formatPerKmOrDash(fleet.totals.custoPorKm)}
          subLabel="custo por KM"
          icon={Receipt}
          variant="danger"
        />
        <MetricCard
          label="Resultado Operacional"
          value={formatCurrency(fleet.totals.resultado)}
          subValue={`${fleet.plates.length} placas listadas`}
          icon={TrendingUp}
          trend={fleet.totals.resultado > 0 ? 'positive' : fleet.totals.resultado < 0 ? 'negative' : 'neutral'}
          variant={fleet.totals.resultado > 0 ? 'success' : fleet.totals.resultado < 0 ? 'danger' : 'default'}
        />
        <MetricCard
          label="Margem Operacional"
          value={formatPercentOrDash(fleet.totals.margem)}
          subLabel="resultado ÷ faturamento"
          icon={Percent}
          variant={fleet.totals.margem === null || fleet.totals.margem === 0 ? 'default' : fleet.totals.margem > 0 ? 'success' : 'danger'}
        />
      </div>

      {fleet.unlinked && (fleet.unlinked.trips > 0 || fleet.unlinked.expenses > 0) && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-xs">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
          <span>
            Lançamentos sem placa vinculada no período (não entram em nenhuma placa):{' '}
            <strong>{fleet.unlinked.trips}</strong> viagens ({formatCurrency(fleet.unlinked.tripsValue)}) e{' '}
            <strong>{fleet.unlinked.expenses}</strong> despesas ({formatCurrency(fleet.unlinked.expensesValue)}).
          </span>
        </div>
      )}

      {/* Plate list */}
      {vehicles.length === 0 ? (
        <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500 text-xs">
          Nenhum veículo cadastrado no sistema.
        </div>
      ) : fleet.plates.length === 0 ? (
        <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500 text-xs">
          Nenhuma placa encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-3">
          {fleet.plates.map((plate) => (
            <PlateCard
              key={plate.vehicle.id}
              data={plate}
              expanded={expandedIds.has(plate.vehicle.id)}
              onToggle={() => toggleExpanded(plate.vehicle.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface PlateCardProps {
  data: PlateFinancials;
  expanded: boolean;
  onToggle: () => void;
}

const PlateCard: React.FC<PlateCardProps> = ({ data, expanded, onToggle }) => {
  const { vehicle } = data;

  const secondaryMetrics: Array<{ label: string; value: string }> = [
    { label: 'Viagens', value: formatNumber(data.viagens) },
    { label: 'KM Rodados', value: formatKm(data.km) },
    { label: COST_BUCKET_LABELS.combustivel, value: formatCurrency(data.costs.combustivel) },
    { label: COST_BUCKET_LABELS.manutencaoPecas, value: formatCurrency(data.costs.manutencaoPecas) },
    { label: COST_BUCKET_LABELS.pedagios, value: formatCurrency(data.costs.pedagios) },
    { label: COST_BUCKET_LABELS.outros, value: formatCurrency(data.costs.outros) },
    { label: 'Custo / KM', value: formatPerKmOrDash(data.custoPorKm) },
    { label: 'Faturamento / KM', value: formatPerKmOrDash(data.faturamentoPorKm) },
    { label: 'Fat. Médio / Viagem', value: formatCurrencyOrDash(data.faturamentoMedioViagem) },
  ];

  return (
    <div
      id={`plate-card-${vehicle.id}`}
      className={`bg-white rounded-lg border border-slate-200 border-l-4 shadow-xs overflow-hidden scroll-mt-24 ${toneBorder(
        data.resultado
      )}`}
    >
      {/* Main row */}
      <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Identity */}
        <div className="flex items-center gap-3 lg:w-52 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Truck size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-mono font-extrabold text-base text-slate-900 tracking-wide">{vehicle.plate}</div>
            <div className="text-[11px] text-slate-600 font-semibold truncate">
              {vehicle.vehicleType || 'Tipo não informado'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {[vehicle.brandModel, vehicle.branch].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* Main financial indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Faturamento</div>
            <div className="font-mono font-bold text-sm text-blue-700 tabular-nums">{formatCurrency(data.faturamento)}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Custo Total</div>
            <div className="font-mono font-bold text-sm text-rose-600 tabular-nums">{formatCurrency(data.custoTotal)}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Resultado</div>
            <div className={`font-mono font-bold text-sm tabular-nums ${toneText(data.resultado)}`}>
              {formatCurrency(data.resultado)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Margem</div>
            <span
              className={`inline-block mt-0.5 font-mono font-bold text-xs px-2 py-0.5 rounded tabular-nums ${toneBadge(
                data.margem
              )}`}
            >
              {formatPercentOrDash(data.margem)}
            </span>
          </div>
        </div>

        {/* Comparison bars */}
        <ComparisonBars faturamento={data.faturamento} custo={data.custoTotal} resultado={data.resultado} />

        <button
          onClick={onToggle}
          className="self-end lg:self-center inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
          aria-expanded={expanded}
        >
          <span>Despesas</span>
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Secondary indicators */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
        {secondaryMetrics.map((m) => (
          <div key={m.label} className="min-w-0">
            <div className="text-[10px] text-slate-500 truncate">{m.label}</div>
            <div className="font-mono text-xs font-semibold text-slate-800 tabular-nums truncate">{m.value}</div>
          </div>
        ))}
      </div>

      {expanded && <ExpenseBreakdown data={data} />}
    </div>
  );
};

const ComparisonBars: React.FC<{ faturamento: number; custo: number; resultado: number }> = ({
  faturamento,
  custo,
  resultado,
}) => {
  const scale = Math.max(faturamento, custo, Math.abs(resultado));
  const width = (value: number) => (scale > 0 ? `${(Math.abs(value) / scale) * 100}%` : '0%');

  const bars = [
    { label: 'Faturamento', value: faturamento, color: 'bg-blue-600' },
    { label: 'Custos', value: custo, color: 'bg-rose-500' },
    {
      label: 'Resultado',
      value: resultado,
      color: resultado > 0 ? 'bg-emerald-500' : resultado < 0 ? 'bg-rose-700' : 'bg-slate-300',
    },
  ];

  return (
    <div className="w-full lg:w-64 shrink-0 space-y-1" title="Faturamento × Custos × Resultado">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-2">
          <span className="w-16 text-[10px] text-slate-500 shrink-0">{bar.label}</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${bar.color}`} style={{ width: width(bar.value) }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const ExpenseBreakdown: React.FC<{ data: PlateFinancials }> = ({ data }) => {
  if (data.expenseGroups.length === 0) {
    return (
      <div className="px-4 py-4 border-t border-slate-200 text-center text-xs text-slate-400">
        Nenhuma despesa vinculada a esta placa no período/filtros selecionados.
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200">
      <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Despesas da placa {data.vehicle.plate} por tipo de custo
        </h4>
        <span className="text-xs font-mono font-semibold text-rose-600">{formatCurrency(data.custoTotal)}</span>
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-xs text-left">
          <thead className="bg-white text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
            <tr>
              <th className="py-2 px-4">Data</th>
              <th className="py-2 px-3">Descrição</th>
              <th className="py-2 px-3">Fornecedor</th>
              <th className="py-2 px-3">Motorista</th>
              <th className="py-2 px-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.expenseGroups.map((group) => {
              const share = safeRatio(group.total, data.custoTotal);
              return (
                <React.Fragment key={group.category}>
                  <tr className="bg-slate-100/70 border-y border-slate-200">
                    <td colSpan={4} className="py-2 px-4 font-semibold text-slate-900">
                      {group.category}
                      <span className="ml-2 text-[10px] font-medium text-slate-500">
                        {COST_BUCKET_LABELS[group.bucket]} · {group.items.length} lançamento
                        {group.items.length === 1 ? '' : 's'}
                        {share !== null && ` · ${formatPercent(share * 100)} do custo`}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(group.total)}
                    </td>
                  </tr>
                  {group.items.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono text-slate-700">{formatDate(e.date)}</td>
                      <td className="py-2 px-3 text-slate-700 truncate max-w-[220px]">{e.description}</td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-[160px]">{e.supplier}</td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-[140px]">{e.driverName || DASH}</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-900">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
