export function formatCurrency(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  if (isNaN(value)) return 'R$ 0';
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`;
  }
  return formatCurrency(value);
}

export function formatKm(value: number): string {
  if (isNaN(value)) return '0 km';
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)} km`;
}

export function formatNumber(value: number, decimals: number = 0): string {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0,0%';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function formatMonthYear(yearMonth: string): string {
  // input: '2026-05' or '2026-05-15'
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-');
  const idx = parseInt(month, 10) - 1;
  return `${MONTH_ABBR[idx] || month}/${year}`;
}

export function formatMonthLabel(yearMonth: string, style: 'long' | 'short' | 'full' = 'long'): string {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-');
  const idx = parseInt(month, 10) - 1;
  if (style === 'full') return `${MONTH_NAMES[idx] || month} / ${year}`;
  if (style === 'short') return `${MONTH_ABBR[idx] || month}/${year.slice(-2)}`;
  return `${MONTH_ABBR[idx] || month} ${year}`;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const CNH_EXPIRY_ALERT_DAYS = 60;

export function getTodayISO(): string {
  return toISODate(new Date());
}

export function getISODateDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function getFirstDayOfMonthISO(): string {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
}

// Returns 'YYYY-MM' keys for the last `count` months, oldest first, ending in the current month.
export function getRecentMonthKeys(count: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export function formatCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatPlate(plate: string): string {
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return plate.toUpperCase();
}

/**
 * Utility to download CSV in browser
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel in Portuguese
    [headers.map(escapeCsv).join(';'), ...rows.map((row) => row.map(escapeCsv).join(';'))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
