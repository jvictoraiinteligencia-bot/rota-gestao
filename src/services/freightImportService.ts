import { getSupabase } from '../lib/supabase';
import { BlockModel, ClientModel, FreightPricing, RouteModel, VehicleTypeModel } from '../types';
import { BlockLike, normalizeBlockKey, routeBlockIdentity } from '../utils/blocks';
import { getTodayISO } from '../utils/formatters';
import { CellValue, cellToText, isEmptyRow, normalizeText, readSheetRows } from './routeImportService';
import { HISTORY_MIGRATION_HINT, isMissingHistoryStructure } from './supabaseService';

export const FREIGHT_IMPORT_COLUMNS = ['CLIENTE', 'BLOCO', 'ROTA', 'TIPO DE CARRO', 'VALOR DO FRETE'] as const;
export const FREIGHT_IMPORT_REASON = 'Importação de valores';
export const FREIGHT_IMPORT_NOTE = 'Importado via planilha';

type FreightImportColumn = (typeof FREIGHT_IMPORT_COLUMNS)[number];

export interface FreightImportRow {
  lineNumber: number;
  cliente: CellValue;
  bloco: CellValue;
  rota: CellValue;
  tipoCarro: CellValue;
  valor: CellValue;
}

export interface FreightImportReference {
  clients: Pick<ClientModel, 'id' | 'name' | 'status'>[];
  blocks: Pick<BlockModel, 'id' | 'name' | 'status'>[];
  routes: Pick<RouteModel, 'id' | 'code' | 'name' | 'clientId' | 'blockId' | 'block' | 'distanceKm' | 'status'>[];
  vehicleTypes: Pick<VehicleTypeModel, 'id' | 'name' | 'category' | 'status'>[];
  tariffs: Pick<FreightPricing, 'id' | 'routeId' | 'vehicleTypeId' | 'freightValue' | 'status' | 'createdAt'>[];
}

export type FreightImportStatus = 'new' | 'update' | 'unchanged' | 'error';

export interface FreightImportPreviewRow {
  lineNumber: number;
  cliente: string;
  bloco: string;
  rota: string;
  tipoCarro: string;
  valorText: string;
  value: number | null;
  status: FreightImportStatus;
  errors: string[];
  routeId?: string;
  vehicleTypeId?: string;
  routeKm?: number;
  tariffId?: string;
  tariffInactive?: boolean;
  currentValue?: number;
}

export interface FreightImportSummary {
  total: number;
  newCount: number;
  updateCount: number;
  unchangedCount: number;
  errorCount: number;
}

export interface FreightImportPlan {
  rows: FreightImportPreviewRow[];
  summary: FreightImportSummary;
}

export interface FreightImportFailure {
  lineNumber: number;
  reason: string;
}

export type FreightImportApplyResult =
  | { status: 'stale'; plan: FreightImportPlan }
  | {
      status: 'done';
      created: number;
      updated: number;
      unchanged: number;
      failures: FreightImportFailure[];
    };

const INSERT_CHUNK_SIZE = 200;
const RPC_CONCURRENCY = 10;
const FETCH_PAGE_SIZE = 1000;

/** Igual a normalizeText, tratando travessões (—, –) como hífen. */
function matchKey(value: string): string {
  return normalizeText(value.replace(/[\u2010-\u2015\u2212]/g, '-'));
}

const toCents = (value: number) => Math.round(value * 100);

function groupBy<T>(items: T[], getKeys: (item: T) => string[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    new Set(getKeys(item)).forEach((key) => {
      if (!key) return;
      map.set(key, [...(map.get(key) || []), item]);
    });
  });
  return map;
}

/**
 * Aceita 3500 | 3500,50 | 3.500,50 | 3500.50 | 3,500.50 | R$ 3.500,50.
 * Com um único separador "." seguido de grupos de 3 dígitos (3.500), o ponto é de milhar.
 */
export function parseFreightValue(value: CellValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined || value instanceof Date || typeof value === 'boolean') return null;

  let text = String(value).replace(/R\$/gi, '').replace(/\s/g, '');
  if (!text) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    text = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  } else if (lastComma !== -1) {
    text = (text.match(/,/g) || []).length > 1 ? text.replace(/,/g, '') : text.replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '');
  }

  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

// ==============================================================================
// Leitura do arquivo
// ==============================================================================
function normalizeHeader(value: CellValue): string {
  return normalizeText(cellToText(value)).replace(/\s*\(R\$\)$/, '');
}

export async function parseFreightImportFile(file: File): Promise<FreightImportRow[]> {
  const sheetRows = await readSheetRows(file);

  const headerIndex = sheetRows.findIndex((cells) => !isEmptyRow(cells));
  if (headerIndex === -1) {
    throw new Error('O arquivo está vazio.');
  }

  const header = sheetRows[headerIndex].map(normalizeHeader);
  const columnIndex = Object.fromEntries(
    FREIGHT_IMPORT_COLUMNS.map((col) => [col, header.indexOf(col)])
  ) as Record<FreightImportColumn, number>;

  const missing = FREIGHT_IMPORT_COLUMNS.filter((col) => columnIndex[col] === -1);
  if (missing.length > 0) {
    throw new Error(
      `Colunas obrigatórias ausentes: ${missing.join(', ')}. O cabeçalho deve conter: ${FREIGHT_IMPORT_COLUMNS.join(', ')}.`
    );
  }

  const rows: FreightImportRow[] = [];
  for (let i = headerIndex + 1; i < sheetRows.length; i++) {
    const cells = sheetRows[i];
    if (isEmptyRow(cells)) continue;
    rows.push({
      lineNumber: i + 1,
      cliente: cells[columnIndex.CLIENTE],
      bloco: cells[columnIndex.BLOCO],
      rota: cells[columnIndex.ROTA],
      tipoCarro: cells[columnIndex['TIPO DE CARRO']],
      valor: cells[columnIndex['VALOR DO FRETE']],
    });
  }

  return rows;
}

// ==============================================================================
// Validação (sem acesso ao banco)
// ==============================================================================
/**
 * Valida todas as linhas e classifica cada uma em nova tarifa, atualização, sem alteração ou erro.
 * Identidade da tarifa: CLIENTE + BLOCO + ROTA + TIPO DE CARRO (a filial não participa).
 * Cliente e Bloco pertencem à rota, então a combinação equivale a ROTA (do cliente/bloco) + TIPO DE CARRO.
 */
export function planFreightImport(rows: FreightImportRow[], ref: FreightImportReference): FreightImportPlan {
  const blockList: BlockLike[] = ref.blocks.map((b) => ({ id: b.id, name: b.name || '', status: b.status }));

  const clientsByKey = groupBy(ref.clients, (c) => [matchKey(c.name || '')]);
  const blocksByKey = groupBy(ref.blocks, (b) => [normalizeBlockKey(b.name || '')]);
  // A planilha pode trazer o tipo como "NOME" ou "NOME — CATEGORIA" (formato exibido no cadastro de tarifas).
  const typesByKey = groupBy(ref.vehicleTypes, (vt) => [
    matchKey(vt.name || ''),
    vt.category ? matchKey(`${vt.name} - ${vt.category}`) : '',
  ]);
  const routesByClientBlock = groupBy(ref.routes, (r) =>
    r.clientId ? [`${r.clientId}|${routeBlockIdentity(r.blockId, r.block, blockList)}`] : []
  );
  const tariffsByCombo = groupBy(ref.tariffs, (t) => [`${t.routeId}|${t.vehicleTypeId}`]);

  const comboKeys: (string | null)[] = [];

  const previewRows = rows.map((row): FreightImportPreviewRow => {
    const cliente = cellToText(row.cliente);
    const bloco = cellToText(row.bloco);
    const rota = cellToText(row.rota);
    const tipoCarro = cellToText(row.tipoCarro);
    const valorText = cellToText(row.valor);
    const parsedValue = valorText ? parseFreightValue(row.valor) : null;
    const value = parsedValue === null ? null : toCents(parsedValue) / 100;

    const errors: string[] = [];
    const preview: FreightImportPreviewRow = {
      lineNumber: row.lineNumber,
      cliente,
      bloco,
      rota,
      tipoCarro,
      valorText,
      value,
      status: 'error',
      errors,
    };

    // CLIENTE
    let client: FreightImportReference['clients'][number] | undefined;
    if (!cliente) {
      errors.push('CLIENTE não preenchido');
    } else {
      const matches = clientsByKey.get(matchKey(cliente)) || [];
      if (matches.length === 0) errors.push(`Cliente "${cliente}" não cadastrado no sistema`);
      else if (matches.length > 1)
        errors.push(
          `Cliente "${cliente}" é ambíguo: existem ${matches.length} clientes cadastrados com este nome. Corrija o Cadastro de Clientes`
        );
      else if (matches[0].status !== 'Ativo') errors.push(`Cliente "${cliente}" está inativo`);
      else client = matches[0];
    }

    // BLOCO
    let block: FreightImportReference['blocks'][number] | undefined;
    if (!bloco) {
      errors.push('BLOCO não preenchido');
    } else {
      const matches = blocksByKey.get(normalizeBlockKey(bloco)) || [];
      const active = matches.filter((b) => b.status === 'Ativo');
      if (matches.length === 0) errors.push(`Bloco "${bloco}" não cadastrado no sistema`);
      else if (active.length === 0) errors.push(`Bloco "${bloco}" está inativo`);
      else if (active.length > 1)
        errors.push(`Bloco "${bloco}" é ambíguo: existem ${active.length} blocos ativos com este nome`);
      else block = active[0];
    }

    // TIPO DE CARRO
    let vehicleType: FreightImportReference['vehicleTypes'][number] | undefined;
    if (!tipoCarro) {
      errors.push('TIPO DE CARRO não preenchido');
    } else {
      const matches = typesByKey.get(matchKey(tipoCarro)) || [];
      const active = matches.filter((vt) => vt.status === 'Ativo');
      if (matches.length === 0) errors.push(`Tipo de carro "${tipoCarro}" não cadastrado`);
      else if (active.length === 0) errors.push(`Tipo de carro "${tipoCarro}" está inativo`);
      else if (active.length > 1)
        errors.push(`Tipo de carro "${tipoCarro}" é ambíguo: existem ${active.length} tipos ativos com este nome`);
      else vehicleType = active[0];
    }

    // ROTA: localizada por CLIENTE + BLOCO + ROTA, nunca só pelo nome.
    let route: FreightImportReference['routes'][number] | undefined;
    if (!rota) {
      errors.push('ROTA não preenchida');
    } else if (client && block) {
      const routeKey = matchKey(rota);
      const candidates = (routesByClientBlock.get(`${client.id}|id:${block.id}`) || []).filter(
        (r) => matchKey(r.name || '') === routeKey || (r.code && matchKey(`${r.code} - ${r.name}`) === routeKey)
      );
      if (candidates.length === 0) {
        errors.push(`Rota "${rota}" não encontrada para o cliente "${client.name}" no bloco "${block.name}"`);
      } else if (candidates.length > 1) {
        errors.push(
          `Rota "${rota}" é ambígua: existem ${candidates.length} rotas com este nome para o cliente "${client.name}" no bloco "${block.name}"`
        );
      } else {
        route = candidates[0];
        const km = Number(route.distanceKm);
        if (Number.isFinite(km) && km > 0) {
          preview.routeKm = km;
        } else {
          errors.push(`Rota "${rota}" está sem KM válido. Corrija o KM no Cadastro de Rotas e importe novamente`);
        }
      }
    }

    // VALOR DO FRETE
    if (!valorText) errors.push('VALOR DO FRETE não preenchido');
    else if (value === null) errors.push(`VALOR DO FRETE "${valorText}" não é numérico`);
    else if (value <= 0) errors.push('VALOR DO FRETE deve ser maior que zero');

    if (route && vehicleType) {
      preview.routeId = route.id;
      preview.vehicleTypeId = vehicleType.id;
      comboKeys.push(`${route.id}|${vehicleType.id}`);
    } else if (cliente && bloco && rota && tipoCarro) {
      comboKeys.push(`txt:${matchKey(cliente)}|${normalizeBlockKey(bloco)}|${matchKey(rota)}|${matchKey(tipoCarro)}`);
    } else {
      comboKeys.push(null);
    }

    if (errors.length > 0 || !route || !vehicleType || value === null) return preview;

    // Tarifa existente para a combinação: prioriza a ativa; sem ativa, a inativa mais recente.
    const tariffs = tariffsByCombo.get(`${route.id}|${vehicleType.id}`) || [];
    const activeTariffs = tariffs.filter((t) => t.status === 'Ativo');
    if (activeTariffs.length > 1) {
      errors.push(
        `Existem ${activeTariffs.length} tarifas ativas para esta combinação na Tabela de Fretes. Inative as duplicadas antes de importar`
      );
      return preview;
    }
    const target =
      activeTariffs[0] ||
      [...tariffs].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))[0];

    if (!target) {
      if (route.status !== 'Ativo') {
        errors.push(`Rota "${rota}" está inativa no Cadastro de Rotas; não é possível cadastrar nova tarifa`);
        return preview;
      }
      preview.status = 'new';
      return preview;
    }

    preview.tariffId = target.id;
    preview.tariffInactive = target.status !== 'Ativo';
    preview.currentValue = Number(target.freightValue);
    preview.status = toCents(preview.currentValue) === toCents(value) ? 'unchanged' : 'update';
    return preview;
  });

  // Duplicidade dentro da planilha: nenhuma das linhas repetidas é importada.
  const linesByCombo = new Map<string, number[]>();
  comboKeys.forEach((key, i) => {
    if (key) linesByCombo.set(key, [...(linesByCombo.get(key) || []), previewRows[i].lineNumber]);
  });
  comboKeys.forEach((key, i) => {
    const lines = key ? linesByCombo.get(key) || [] : [];
    if (lines.length > 1) {
      const row = previewRows[i];
      row.errors.unshift(`Tarifa duplicada dentro da planilha (mesma combinação nas linhas ${lines.join(', ')})`);
      row.status = 'error';
    }
  });

  const summary: FreightImportSummary = {
    total: previewRows.length,
    newCount: previewRows.filter((r) => r.status === 'new').length,
    updateCount: previewRows.filter((r) => r.status === 'update').length,
    unchangedCount: previewRows.filter((r) => r.status === 'unchanged').length,
    errorCount: previewRows.filter((r) => r.status === 'error').length,
  };

  return { rows: previewRows, summary };
}

// ==============================================================================
// Supabase
// ==============================================================================
export async function fetchAllRows(table: string, columns: string): Promise<any[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado. Conecte o banco antes de importar valores.');

  const all: any[] = [];
  for (let from = 0; ; from += FETCH_PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw new Error(`Não foi possível consultar a tabela ${table}: ${error.message}`);
    all.push(...(data || []));
    if (!data || data.length < FETCH_PAGE_SIZE) return all;
  }
}

export async function loadFreightImportReference(): Promise<FreightImportReference> {
  const [clientes, blocos, rotas, tipos, tarifas] = await Promise.all([
    fetchAllRows('clientes', 'id, nome, status'),
    fetchAllRows('blocos', 'id, nome, status'),
    fetchAllRows('rotas', 'id, codigo, nome, cliente_id, bloco_id, bloco, distancia_km, status'),
    fetchAllRows('tipos_carro', 'id, nome, categoria, status'),
    fetchAllRows('tabela_fretes', 'id, rota_id, tipo_carro_id, valor_frete, status, created_at'),
  ]);

  return {
    clients: clientes.map((c) => ({ id: c.id, name: c.nome || '', status: c.status || 'Ativo' })),
    blocks: blocos.map((b) => ({ id: b.id, name: b.nome || '', status: b.status })),
    routes: rotas.map((r) => ({
      id: r.id,
      code: r.codigo || '',
      name: r.nome || '',
      clientId: r.cliente_id || '',
      blockId: r.bloco_id || '',
      block: r.bloco || '',
      distanceKm: Number(r.distancia_km) || 0,
      status: r.status,
    })),
    vehicleTypes: tipos.map((t) => ({ id: t.id, name: t.nome || '', category: t.categoria, status: t.status })),
    tariffs: tarifas.map((t) => ({
      id: t.id,
      routeId: t.rota_id,
      vehicleTypeId: t.tipo_carro_id,
      freightValue: Number(t.valor_frete),
      status: t.status,
      createdAt: t.created_at,
    })),
  };
}

export async function validateFreightImport(rows: FreightImportRow[]): Promise<FreightImportPlan> {
  return planFreightImport(rows, await loadFreightImportReference());
}

function planSignature(plan: FreightImportPlan): string {
  return plan.rows
    .map((r) => [r.lineNumber, r.status, r.routeId, r.vehicleTypeId, r.tariffId, r.value, r.currentValue].join(':'))
    .join('|');
}

/**
 * Revalida com os dados atuais do banco antes de gravar. Se algo mudou desde a prévia,
 * nada é gravado e a nova prévia é devolvida para conferência.
 */
export async function applyFreightImport(
  rows: FreightImportRow[],
  validatedPlan: FreightImportPlan
): Promise<FreightImportApplyResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado. Conecte o banco antes de importar valores.');

  const fresh = await validateFreightImport(rows);
  if (fresh.summary.errorCount > 0 || planSignature(fresh) !== planSignature(validatedPlan)) {
    return { status: 'stale', plan: fresh };
  }

  let created = 0;
  let updated = 0;
  let unchanged = fresh.summary.unchangedCount;
  const failures: FreightImportFailure[] = [];

  // Alterações de valor passam pela função do banco, que grava o histórico na mesma transação.
  const reajustar = async (row: FreightImportPreviewRow) => {
    const { data, error } = await supabase.rpc('reajustar_valor_tarifa_frete', {
      p_tabela_frete_id: row.tariffId,
      p_valor_novo: row.value,
      p_motivo: FREIGHT_IMPORT_REASON,
      p_alterado_por: null,
    });
    if (error) throw error;
    if (data?.id) updated++;
    else unchanged++;
  };

  const updates = fresh.rows.filter((r) => r.status === 'update');
  if (updates.length > 0) {
    // A primeira alteração roda sozinha: se a estrutura de histórico não existir, nada foi gravado ainda.
    try {
      await reajustar(updates[0]);
    } catch (err: any) {
      if (isMissingHistoryStructure(err)) {
        throw new Error(
          `Nenhum valor foi importado porque o histórico de reajustes ainda não existe no banco. ${HISTORY_MIGRATION_HINT}`
        );
      }
      failures.push({ lineNumber: updates[0].lineNumber, reason: `Erro ao atualizar valor: ${err?.message || err}` });
    }

    for (let i = 1; i < updates.length; i += RPC_CONCURRENCY) {
      const chunk = updates.slice(i, i + RPC_CONCURRENCY);
      const results = await Promise.allSettled(chunk.map(reajustar));
      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
          failures.push({
            lineNumber: chunk[idx].lineNumber,
            reason: `Erro ao atualizar valor: ${res.reason?.message || res.reason}`,
          });
        }
      });
    }
  }

  const today = getTodayISO();
  const inserts = fresh.rows
    .filter((r) => r.status === 'new')
    .map((r) => ({
      lineNumber: r.lineNumber,
      payload: {
        rota_id: r.routeId,
        tipo_carro_id: r.vehicleTypeId,
        valor_frete: r.value,
        vigencia_inicial: today,
        vigencia_final: null,
        status: 'Ativo',
        observacao: FREIGHT_IMPORT_NOTE,
      },
    }));

  for (let i = 0; i < inserts.length; i += INSERT_CHUNK_SIZE) {
    const chunk = inserts.slice(i, i + INSERT_CHUNK_SIZE);
    const { error } = await supabase.from('tabela_fretes').insert(chunk.map((c) => c.payload));
    if (!error) {
      created += chunk.length;
      continue;
    }

    // Grava linha a linha para que uma linha com problema não descarte o lote inteiro.
    for (const item of chunk) {
      const { error: rowError } = await supabase.from('tabela_fretes').insert([item.payload]);
      if (rowError) {
        failures.push({ lineNumber: item.lineNumber, reason: `Erro ao cadastrar tarifa: ${rowError.message}` });
      } else {
        created++;
      }
    }
  }

  failures.sort((a, b) => a.lineNumber - b.lineNumber);
  return { status: 'done', created, updated, unchanged, failures };
}

export function downloadFreightImportTemplate() {
  const content = '\uFEFF' + FREIGHT_IMPORT_COLUMNS.join(',') + '\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'modelo_importacao_valores_frete.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
