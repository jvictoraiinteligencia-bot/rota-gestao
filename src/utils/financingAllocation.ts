import { FinancingInstallment, FinancingVehicleLink, Trip, VehicleFinancing } from '../types';

// ==============================================================================
// Rateio das parcelas de financiamento por KM rodado.
//
// Para cada parcela de competência M (YYYY-MM-01):
//   - placas consideradas: vínculos do contrato cujo período [data_inicio, data_fim] cobre algum dia de M;
//   - KM de cada placa: soma de viagens.km_rodado da placa com data dentro de M E dentro do vínculo;
//   - placa sem KM no mês não recebe rateio;
//   - KM total > 0  -> parcela distribuída proporcionalmente ao KM, em centavos exatos;
//   - KM total = 0  -> parcela integralmente "não rateada".
// Nada é gravado: o rateio é recalculado sempre que viagens, vínculos ou parcelas mudam.
// ==============================================================================

export interface AllocationShare {
  vehicleId: string;
  km: number;
  amount: number;
}

export interface InstallmentAllocation {
  installmentId: string;
  financingId: string;
  creditor: string;
  contractNumber: string;
  number: number;
  competence: string; // YYYY-MM-01
  dueDate: string;
  amount: number;
  totalKm: number;
  /** Placas com vínculo no mês (com ou sem KM). */
  linkedVehicleIds: string[];
  /** Somente placas que rodaram; a soma dos valores é exatamente igual à parcela. */
  shares: AllocationShare[];
  /** Valor sem rateio (parcela inteira quando nenhuma placa rodou; senão 0). */
  unallocated: number;
}

const pad2 = (value: number) => String(value).padStart(2, '0');

export function getMonthBounds(competence: string): { start: string; end: string } {
  const [y, m] = competence.slice(0, 7).split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const month = `${y}-${pad2(m)}`;
  return { start: `${month}-01`, end: `${month}-${pad2(lastDay)}` };
}

/** Parcelas que entram no custo: não canceladas; de contrato cancelado, só as já pagas. */
export function isInstallmentChargeable(installment: FinancingInstallment, financing: VehicleFinancing): boolean {
  if (installment.status === 'Cancelada') return false;
  if (financing.status === 'Cancelado' && installment.status !== 'Paga') return false;
  return true;
}

const toCents = (value: number) => Math.round(value * 100);

/**
 * Distribui `amount` proporcionalmente ao KM pelo método do maior resto, em centavos inteiros
 * (BigInt para não perder precisão). A soma das partes é sempre igual ao valor da parcela.
 * Desempate dos centavos restantes: maior resto, depois maior KM, depois id da placa.
 */
export function splitAmountByKm(
  amount: number,
  kmByVehicle: Map<string, number>
): { shares: AllocationShare[]; unallocated: number } {
  const entries = Array.from(kmByVehicle.entries())
    .map(([vehicleId, km]) => ({ vehicleId, km, units: BigInt(Math.round((Number.isFinite(km) ? km : 0) * 100)) }))
    .filter((e) => e.units > 0n);

  const totalUnits = entries.reduce((acc, e) => acc + e.units, 0n);
  const cents = BigInt(toCents(amount));
  if (totalUnits === 0n || cents <= 0n) {
    return { shares: [], unallocated: totalUnits === 0n ? amount : 0 };
  }

  const parts = entries.map((e) => ({
    ...e,
    cents: (cents * e.units) / totalUnits,
    remainder: (cents * e.units) % totalUnits,
  }));

  let leftover = cents - parts.reduce((acc, p) => acc + p.cents, 0n);
  const order = [...parts].sort((a, b) => {
    if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
    if (a.units !== b.units) return a.units > b.units ? -1 : 1;
    return a.vehicleId.localeCompare(b.vehicleId);
  });
  for (const part of order) {
    if (leftover <= 0n) break;
    part.cents += 1n;
    leftover -= 1n;
  }

  return {
    shares: parts
      .map((p) => ({ vehicleId: p.vehicleId, km: p.km, amount: Number(p.cents) / 100 }))
      .sort((a, b) => b.km - a.km || a.vehicleId.localeCompare(b.vehicleId)),
    unallocated: 0,
  };
}

export function allocateFinancingInstallments(params: {
  financings: VehicleFinancing[];
  links: FinancingVehicleLink[];
  installments: FinancingInstallment[];
  trips: Trip[];
}): InstallmentAllocation[] {
  const { financings, links, installments, trips } = params;

  const financingById = new Map(financings.map((f) => [f.id, f]));

  const linksByFinancing = new Map<string, FinancingVehicleLink[]>();
  links.forEach((l) => {
    const list = linksByFinancing.get(l.financingId) || [];
    list.push(l);
    linksByFinancing.set(l.financingId, list);
  });

  const tripsByVehicle = new Map<string, Trip[]>();
  trips.forEach((t) => {
    if (!t.vehicleId || !t.date) return;
    const list = tripsByVehicle.get(t.vehicleId) || [];
    list.push(t);
    tripsByVehicle.set(t.vehicleId, list);
  });

  const result: InstallmentAllocation[] = [];

  installments.forEach((installment) => {
    const financing = financingById.get(installment.financingId);
    if (!financing || !isInstallmentChargeable(installment, financing)) return;

    const month = getMonthBounds(installment.competence);
    const kmByVehicle = new Map<string, number>();

    (linksByFinancing.get(financing.id) || []).forEach((link) => {
      // Interseção do vínculo com o mês de competência
      const start = link.startDate > month.start ? link.startDate : month.start;
      const end = link.endDate !== null && link.endDate < month.end ? link.endDate : month.end;
      if (start > end) return;

      const km = (tripsByVehicle.get(link.vehicleId) || []).reduce((acc, t) => {
        const day = t.date.slice(0, 10);
        if (day < start || day > end) return acc;
        return acc + (Number.isFinite(t.distanceKm) && t.distanceKm > 0 ? t.distanceKm : 0);
      }, 0);

      // Mesma placa com dois vínculos no mês (períodos distintos) soma os KM de ambos
      kmByVehicle.set(link.vehicleId, (kmByVehicle.get(link.vehicleId) || 0) + km);
    });

    const { shares, unallocated } = splitAmountByKm(installment.amount, kmByVehicle);
    const totalKm = Array.from(kmByVehicle.values()).reduce((acc, km) => acc + km, 0);

    result.push({
      installmentId: installment.id,
      financingId: financing.id,
      creditor: financing.creditor,
      contractNumber: financing.contractNumber,
      number: installment.number,
      competence: installment.competence,
      dueDate: installment.dueDate,
      amount: installment.amount,
      totalKm,
      linkedVehicleIds: Array.from(kmByVehicle.keys()),
      shares,
      unallocated,
    });
  });

  return result;
}

/** A competência M entra no período quando algum dia de M está dentro do intervalo (limites ausentes = abertos). */
export function isCompetenceInRange(competence: string, range: { start?: string; end?: string }): boolean {
  const month = getMonthBounds(competence);
  if (range.start && month.end < range.start) return false;
  if (range.end && month.start > range.end) return false;
  return true;
}
