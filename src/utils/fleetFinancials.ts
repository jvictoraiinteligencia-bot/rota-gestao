import { Expense, PeriodFilter, Trip, Vehicle } from '../types';

export interface DateRange {
  start?: string; // YYYY-MM-DD (inclusive)
  end?: string; // YYYY-MM-DD (inclusive)
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPeriodRange(
  period: PeriodFilter,
  customStart?: string,
  customEnd?: string,
  today: Date = new Date()
): DateRange {
  const y = today.getFullYear();
  const m = today.getMonth();

  switch (period) {
    case 'thisMonth':
      return { start: toISODate(new Date(y, m, 1)), end: toISODate(new Date(y, m + 1, 0)) };
    case 'lastMonth':
      return { start: toISODate(new Date(y, m - 1, 1)), end: toISODate(new Date(y, m, 0)) };
    case 'last30days':
      return { start: toISODate(new Date(y, m, today.getDate() - 30)), end: toISODate(today) };
    case 'thisQuarter': {
      const quarterStart = Math.floor(m / 3) * 3;
      return {
        start: toISODate(new Date(y, quarterStart, 1)),
        end: toISODate(new Date(y, quarterStart + 3, 0)),
      };
    }
    case 'thisYear':
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    case 'custom':
      return { start: customStart || undefined, end: customEnd || undefined };
    default:
      return {};
  }
}

// Compares the 'YYYY-MM-DD' text directly: parsing with new Date() would shift DATE columns by the local timezone.
export function isDateInRange(date: string, range: DateRange): boolean {
  if (!range.start && !range.end) return true;
  if (!date) return false;
  const day = date.slice(0, 10);
  if (range.start && day < range.start) return false;
  if (range.end && day > range.end) return false;
  return true;
}

export function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export type CostBucket = 'combustivel' | 'manutencaoPecas' | 'pedagios' | 'outros';

export const COST_BUCKET_LABELS: Record<CostBucket, string> = {
  combustivel: 'Combustível',
  manutencaoPecas: 'Manutenção/Peças',
  pedagios: 'Pedágios',
  outros: 'Outros custos',
};

const BUCKET_BY_CATEGORY: Record<string, CostBucket> = {
  combustivel: 'combustivel',
  manutencao: 'manutencaoPecas',
  pecas: 'manutencaoPecas',
  pedagio: 'pedagios',
};

export function getCostBucket(category: string): CostBucket {
  return BUCKET_BY_CATEGORY[normalizeText(category)] || 'outros';
}

// Returns null instead of NaN/Infinity so the UI can show "—".
export function safeRatio(numerator: number, denominator: number): number | null {
  if (!(denominator > 0)) return null;
  const ratio = numerator / denominator;
  return Number.isFinite(ratio) ? ratio : null;
}

const toCents = (value: number) => Math.round(value * 100) / 100;
const finiteOrZero = (value: number) => (Number.isFinite(value) ? value : 0);

export interface ExpenseGroup {
  category: string;
  bucket: CostBucket;
  total: number;
  items: Expense[];
}

export interface PlateFinancials {
  vehicle: Vehicle;
  faturamento: number;
  viagens: number;
  km: number;
  costs: Record<CostBucket, number>;
  custoTotal: number;
  resultado: number;
  margem: number | null;
  custoPorKm: number | null;
  faturamentoPorKm: number | null;
  faturamentoMedioViagem: number | null;
  expenseGroups: ExpenseGroup[];
}

/**
 * `trips` and `expenses` must already be restricted to this vehicle (viagens.veiculo_id / despesas.veiculo_id)
 * and to the active filters. valor_frete and km_rodado are totals per launch; quantidade_viagens is the trip count.
 */
export function computePlateFinancials(
  vehicle: Vehicle,
  trips: Trip[],
  expenses: Expense[]
): PlateFinancials {
  const faturamento = toCents(trips.reduce((acc, t) => acc + finiteOrZero(t.freightValue), 0));
  const viagens = trips.reduce((acc, t) => acc + (t.tripCount || 1), 0);
  const km = trips.reduce((acc, t) => acc + finiteOrZero(t.distanceKm), 0);

  const costs: Record<CostBucket, number> = { combustivel: 0, manutencaoPecas: 0, pedagios: 0, outros: 0 };
  const groups = new Map<string, ExpenseGroup>();

  expenses.forEach((expense) => {
    const amount = finiteOrZero(expense.amount);
    const category = (expense.category || '').trim() || 'Sem tipo informado';
    const bucket = getCostBucket(category);
    costs[bucket] += amount;

    const key = normalizeText(category);
    const group = groups.get(key) || { category, bucket, total: 0, items: [] };
    group.total += amount;
    group.items.push(expense);
    groups.set(key, group);
  });

  (Object.keys(costs) as CostBucket[]).forEach((bucket) => {
    costs[bucket] = toCents(costs[bucket]);
  });

  const custoTotal = toCents(expenses.reduce((acc, e) => acc + finiteOrZero(e.amount), 0));
  const resultado = toCents(faturamento - custoTotal);

  const expenseGroups = Array.from(groups.values())
    .map((group) => ({ ...group, total: toCents(group.total) }))
    .sort((a, b) => b.total - a.total);

  const margemRatio = safeRatio(resultado, faturamento);

  return {
    vehicle,
    faturamento,
    viagens,
    km,
    costs,
    custoTotal,
    resultado,
    margem: margemRatio === null ? null : margemRatio * 100,
    custoPorKm: safeRatio(custoTotal, km),
    faturamentoPorKm: safeRatio(faturamento, km),
    faturamentoMedioViagem: safeRatio(faturamento, viagens),
    expenseGroups,
  };
}

export type FleetSortKey = 'faturamento' | 'resultado' | 'margem' | 'custo' | 'km';

const SORT_VALUE: Record<FleetSortKey, (p: PlateFinancials) => number | null> = {
  faturamento: (p) => p.faturamento,
  resultado: (p) => p.resultado,
  margem: (p) => p.margem,
  custo: (p) => p.custoTotal,
  km: (p) => p.km,
};

// Descending; plates without a value (e.g. margin without revenue) go last.
export function sortPlateFinancials(list: PlateFinancials[], key: FleetSortKey): PlateFinancials[] {
  const getValue = SORT_VALUE[key];
  return [...list].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    if (va === null && vb === null) return a.vehicle.plate.localeCompare(b.vehicle.plate);
    if (va === null) return 1;
    if (vb === null) return -1;
    return vb - va || a.vehicle.plate.localeCompare(b.vehicle.plate);
  });
}
