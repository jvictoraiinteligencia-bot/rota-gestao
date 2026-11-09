import { FinancingVehicleLink } from '../types';

// Datas trabalhadas como texto 'YYYY-MM-DD' (colunas DATE), sem new Date(), para não sofrer fuso horário.

const pad2 = (value: number) => String(value).padStart(2, '0');

function daysInMonth(year: number, month: number): number {
  // month: 1-12
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [y, m, d] = value.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export interface InstallmentScheduleItem {
  number: number;
  competence: string; // YYYY-MM-01
  dueDate: string; // YYYY-MM-DD
}

/**
 * Mesma regra de public.gerar_parcelas_financiamento: mantém o dia da 1ª parcela e, nos meses
 * sem esse dia (29, 30, 31), usa o último dia do próprio mês. Usado apenas para pré-visualização;
 * as parcelas reais são geradas pelo banco.
 */
export function buildInstallmentSchedule(firstDueDate: string, count: number): InstallmentScheduleItem[] {
  if (!isValidISODate(firstDueDate) || !(count > 0)) return [];
  const [y, m, d] = firstDueDate.split('-').map(Number);
  const items: InstallmentScheduleItem[] = [];
  for (let i = 0; i < count; i++) {
    const monthIndex = m - 1 + i;
    const year = y + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const day = Math.min(d, daysInMonth(year, month));
    items.push({
      number: i + 1,
      competence: `${year}-${pad2(month)}-01`,
      dueDate: `${year}-${pad2(month)}-${pad2(day)}`,
    });
  }
  return items;
}

export function firstDayOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

// Intervalos fechados [início, fim]; fim null = sem término.
export function dateRangesOverlap(aStart: string, aEnd: string | null, bStart: string, bEnd: string | null): boolean {
  const aEndsBeforeB = aEnd !== null && aEnd < bStart;
  const bEndsBeforeA = bEnd !== null && bEnd < aStart;
  return !aEndsBeforeB && !bEndsBeforeA;
}

export function isLinkActiveOn(link: FinancingVehicleLink, isoDate: string): boolean {
  return link.startDate <= isoDate && (link.endDate === null || link.endDate >= isoDate);
}

/** Vínculo da mesma placa no mesmo contrato com período sobreposto (espelha a restrição do banco). */
export function findOverlappingLink(
  links: FinancingVehicleLink[],
  financingId: string,
  vehicleId: string,
  startDate: string,
  endDate: string | null,
  excludeLinkId?: string
): FinancingVehicleLink | undefined {
  return links.find(
    (l) =>
      l.id !== excludeLinkId &&
      l.financingId === financingId &&
      l.vehicleId === vehicleId &&
      dateRangesOverlap(l.startDate, l.endDate, startDate, endDate)
  );
}
