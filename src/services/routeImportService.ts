import { getSupabase } from '../lib/supabase';

export const ROUTE_IMPORT_COLUMNS = ['FILIAL', 'ROTA', 'KM'] as const;

type CellValue = string | number | boolean | Date | null | undefined;

export interface RouteImportRow {
  lineNumber: number;
  filial: CellValue;
  rota: CellValue;
  km: CellValue;
}

export interface RouteImportIssue {
  lineNumber: number;
  rota: string;
  reason: string;
}

export interface RouteImportSummary {
  total: number;
  imported: number;
  existing: number;
  errors: RouteImportIssue[];
  duplicates: RouteImportIssue[];
}

const INSERT_CHUNK_SIZE = 200;

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function cellToText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).replace(/\s+/g, ' ').trim();
}

function isEmptyRow(cells: CellValue[]): boolean {
  return cells.every((c) => cellToText(c) === '');
}

export function parseKm(value: CellValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined || value instanceof Date || typeof value === 'boolean') return null;

  let text = String(value).replace(/\s/g, '');
  if (!text) return null;

  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '');
  }

  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

// ==============================================================================
// Leitura de arquivos CSV / XLSX
// ==============================================================================
function decodeCsvBuffer(buffer: ArrayBuffer): string {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    // Excel em português costuma salvar CSV em Windows-1252
    text = new TextDecoder('windows-1252').decode(buffer);
  }
  return text.replace(/^\uFEFF/, '');
}

function detectDelimiter(headerLine: string): string {
  const candidates = [';', ',', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  for (const delimiter of candidates) {
    let count = 0;
    let inQuotes = false;
    for (const char of headerLine) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === delimiter && !inQuotes) count++;
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

function parseCsvText(text: string): string[][] {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== '') || '';
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

async function readSheetRows(file: File): Promise<CellValue[][]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCsvText(decodeCsvBuffer(await file.arrayBuffer()));
  }

  if (extension === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser');
    return (await readSheet(file)) as CellValue[][];
  }

  throw new Error('Formato de arquivo não suportado. Envie um arquivo .csv ou .xlsx.');
}

export async function parseRouteImportFile(file: File): Promise<RouteImportRow[]> {
  const sheetRows = await readSheetRows(file);

  const headerIndex = sheetRows.findIndex((cells) => !isEmptyRow(cells));
  if (headerIndex === -1) {
    throw new Error('O arquivo está vazio.');
  }

  const header = sheetRows[headerIndex].map((c) => normalizeText(cellToText(c)));
  const columnIndex = {
    FILIAL: header.indexOf('FILIAL'),
    ROTA: header.indexOf('ROTA'),
    KM: header.indexOf('KM'),
  };

  const missing = ROUTE_IMPORT_COLUMNS.filter((col) => columnIndex[col] === -1);
  if (missing.length > 0) {
    throw new Error(
      `Colunas obrigatórias ausentes: ${missing.join(', ')}. O cabeçalho deve conter exatamente: ${ROUTE_IMPORT_COLUMNS.join(', ')}.`
    );
  }

  const rows: RouteImportRow[] = [];
  for (let i = headerIndex + 1; i < sheetRows.length; i++) {
    const cells = sheetRows[i];
    if (isEmptyRow(cells)) continue;
    rows.push({
      lineNumber: i + 1,
      filial: cells[columnIndex.FILIAL],
      rota: cells[columnIndex.ROTA],
      km: cells[columnIndex.KM],
    });
  }

  return rows;
}

// ==============================================================================
// Gravação no Supabase
// ==============================================================================
function createRouteCodeGenerator(existingCodes: string[]) {
  const used = new Set(existingCodes.map((c) => c.toUpperCase()));
  let next =
    existingCodes.reduce((max, code) => {
      const match = /^R(\d+)$/i.exec(code.trim());
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  return () => {
    let code = `R${String(next).padStart(3, '0')}`;
    while (used.has(code)) {
      next++;
      code = `R${String(next).padStart(3, '0')}`;
    }
    used.add(code);
    next++;
    return code;
  };
}

interface PendingInsert {
  lineNumber: number;
  rota: string;
  payload: {
    codigo: string;
    nome: string;
    origem: string;
    destino: string;
    filial_id: string;
    distancia_km: number;
    status: 'Ativo';
  };
}

export async function importRoutesToSupabase(rows: RouteImportRow[]): Promise<RouteImportSummary> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado. Conecte o banco antes de importar rotas.');

  const { data: filiaisData, error: filiaisError } = await supabase.from('filiais').select('id, nome');
  if (filiaisError) throw new Error(`Não foi possível consultar as filiais: ${filiaisError.message}`);

  const { data: rotasData, error: rotasError } = await supabase
    .from('rotas')
    .select('id, codigo, nome, filial_id, distancia_km');
  if (rotasError) throw new Error(`Não foi possível consultar a tabela rotas: ${rotasError.message}`);

  const filialByName = new Map<string, string>();
  (filiaisData || []).forEach((f: { id: string; nome: string }) => {
    filialByName.set(normalizeText(f.nome || ''), f.id);
  });

  const routeKey = (filialId: string, nome: string) => `${filialId}|${normalizeText(nome)}`;
  const existingKeys = new Set<string>();
  (rotasData || []).forEach((r: { filial_id: string | null; nome: string }) => {
    if (r.filial_id) existingKeys.add(routeKey(r.filial_id, r.nome || ''));
  });

  const nextCode = createRouteCodeGenerator((rotasData || []).map((r: { codigo: string }) => r.codigo || ''));

  const summary: RouteImportSummary = {
    total: rows.length,
    imported: 0,
    existing: 0,
    errors: [],
    duplicates: [],
  };

  const fileKeys = new Map<string, number>();
  const pending: PendingInsert[] = [];

  for (const row of rows) {
    const filial = cellToText(row.filial);
    const rota = cellToText(row.rota);
    const kmText = cellToText(row.km);
    const km = parseKm(row.km);

    const reasons: string[] = [];
    if (!filial) reasons.push('FILIAL não preenchida');
    if (!rota) reasons.push('ROTA não preenchida');
    if (!kmText) reasons.push('KM não preenchido');
    else if (km === null) reasons.push(`KM "${kmText}" não é numérico`);
    else if (km <= 0) reasons.push('KM deve ser maior que zero');

    const filialId = filial ? filialByName.get(normalizeText(filial)) : undefined;
    if (filial && !filialId) reasons.push(`Filial "${filial}" não cadastrada no sistema`);

    if (reasons.length > 0 || !filialId || km === null) {
      summary.errors.push({ lineNumber: row.lineNumber, rota, reason: reasons.join('; ') });
      continue;
    }

    const key = routeKey(filialId, rota);
    if (existingKeys.has(key)) {
      summary.existing++;
      summary.duplicates.push({
        lineNumber: row.lineNumber,
        rota,
        reason: `Rota já cadastrada para a filial "${filial}"`,
      });
      continue;
    }
    if (fileKeys.has(key)) {
      summary.existing++;
      summary.duplicates.push({
        lineNumber: row.lineNumber,
        rota,
        reason: `Repetida no arquivo (mesma FILIAL + ROTA da linha ${fileKeys.get(key)})`,
      });
      continue;
    }
    fileKeys.set(key, row.lineNumber);

    pending.push({
      lineNumber: row.lineNumber,
      rota,
      payload: {
        codigo: nextCode(),
        nome: rota,
        origem: '',
        destino: '',
        filial_id: filialId,
        distancia_km: Math.round(km * 100) / 100,
        status: 'Ativo',
      },
    });
  }

  for (let i = 0; i < pending.length; i += INSERT_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + INSERT_CHUNK_SIZE);
    const { error } = await supabase.from('rotas').insert(chunk.map((p) => p.payload));

    if (!error) {
      summary.imported += chunk.length;
      continue;
    }

    // Retry one by one so a single bad row doesn't discard the whole chunk.
    for (const item of chunk) {
      const { error: rowError } = await supabase.from('rotas').insert([item.payload]);
      if (rowError) {
        summary.errors.push({
          lineNumber: item.lineNumber,
          rota: item.rota,
          reason: `Erro ao gravar no Supabase: ${rowError.message}`,
        });
      } else {
        summary.imported++;
      }
    }
  }

  summary.errors.sort((a, b) => a.lineNumber - b.lineNumber);
  return summary;
}

export function downloadRouteImportTemplate() {
  const content = '\uFEFF' + ROUTE_IMPORT_COLUMNS.join(',') + '\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'modelo_importacao_rotas.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
