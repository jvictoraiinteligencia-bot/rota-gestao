import { getSupabase } from '../lib/supabase';
import { FinancingInstallment, FinancingVehicleLink, VehicleFinancing } from '../types';

// ==============================================================================
// FINANCIAMENTO DE VEÍCULOS
// Tabelas criadas por supabase_migration_financiamentos.sql. Acesso pela anon key
// com SELECT/INSERT/UPDATE (sem DELETE): cancelamentos são feitos por status/data_fim.
// ==============================================================================

export const FINANCING_MIGRATION_HINT =
  'Execute o script supabase_migration_financiamentos.sql no SQL Editor do Supabase.';

const FINANCING_COLUMNS =
  'id, credor, numero_contrato, descricao, valor_financiado, valor_parcela, quantidade_parcelas, data_primeira_parcela, status, observacoes, created_at, updated_at';
const LINK_COLUMNS = 'id, financiamento_id, veiculo_id, data_inicio, data_fim, observacao, created_at, updated_at';
const INSTALLMENT_COLUMNS =
  'id, financiamento_id, numero, competencia, vencimento, valor, status, data_pagamento, valor_pago, observacao, created_at';

// PostgREST devolve no máximo 1000 linhas por requisição; parcelas podem passar disso.
const PAGE_SIZE = 1000;

const toNumberOrNull = (value: unknown): number | null =>
  value === null || value === undefined || value === '' ? null : Number(value);

function mapFinancingRow(row: any): VehicleFinancing {
  return {
    id: row.id,
    creditor: row.credor,
    contractNumber: row.numero_contrato || '',
    description: row.descricao || '',
    financedAmount: toNumberOrNull(row.valor_financiado),
    installmentValue: Number(row.valor_parcela),
    installmentsCount: Number(row.quantidade_parcelas),
    firstInstallmentDate: row.data_primeira_parcela,
    status: row.status,
    notes: row.observacoes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
  };
}

function mapLinkRow(row: any): FinancingVehicleLink {
  return {
    id: row.id,
    financingId: row.financiamento_id,
    vehicleId: row.veiculo_id,
    startDate: row.data_inicio,
    endDate: row.data_fim || null,
    notes: row.observacao || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
  };
}

function mapInstallmentRow(row: any): FinancingInstallment {
  return {
    id: row.id,
    financingId: row.financiamento_id,
    number: Number(row.numero),
    competence: row.competencia,
    dueDate: row.vencimento,
    amount: Number(row.valor),
    status: row.status,
    paymentDate: row.data_pagamento || null,
    paidAmount: toNumberOrNull(row.valor_pago),
    notes: row.observacao || '',
    createdAt: row.created_at,
  };
}

const emptyToNull = (value: string | undefined) => {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

function toFinancingPayload(f: Partial<VehicleFinancing>) {
  const payload: Record<string, unknown> = {};
  if (f.creditor !== undefined) payload.credor = f.creditor.trim();
  if (f.contractNumber !== undefined) payload.numero_contrato = emptyToNull(f.contractNumber);
  if (f.description !== undefined) payload.descricao = emptyToNull(f.description);
  if (f.financedAmount !== undefined) payload.valor_financiado = f.financedAmount;
  if (f.installmentValue !== undefined) payload.valor_parcela = f.installmentValue;
  if (f.installmentsCount !== undefined) payload.quantidade_parcelas = f.installmentsCount;
  if (f.firstInstallmentDate !== undefined) payload.data_primeira_parcela = f.firstInstallmentDate;
  if (f.status !== undefined) payload.status = f.status;
  if (f.notes !== undefined) payload.observacoes = emptyToNull(f.notes);
  return payload;
}

export function describeFinancingError(err: any): Error {
  const code = err?.code;
  const message = err?.message || String(err);
  switch (code) {
    case '23505':
      return new Error('Já existe um financiamento cadastrado com este credor e número de contrato.');
    case '23P01':
      return new Error('Esta placa já possui vínculo neste contrato em um período que se sobrepõe ao informado.');
    case '23503':
      return new Error('Contrato ou veículo não encontrado no banco. Atualize a página e tente novamente.');
    case '23514':
      return new Error('Dados inválidos: verifique valores, quantidade de parcelas e datas informadas.');
    case '42501':
      return new Error('O banco não permite esta operação (permissão negada nas tabelas de financiamento).');
    case 'P0001':
      return new Error(message); // mensagens de RAISE EXCEPTION da função de geração de parcelas
    default:
      break;
  }
  if (
    code === '42P01' ||
    code === '42883' ||
    code === 'PGRST202' ||
    code === 'PGRST205' ||
    /financiamento.*(does not exist|schema cache)/i.test(message)
  ) {
    return new Error(`A estrutura de financiamentos não foi encontrada no banco. ${FINANCING_MIGRATION_HINT}`);
  }
  return new Error(message);
}

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

async function fetchAllPages(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>
): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw describeFinancingError(error);
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

// ---------------------------------- Contratos ----------------------------------

export async function getFinancingsOnline(): Promise<VehicleFinancing[]> {
  const supabase = requireSupabase();
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from('financiamentos')
      .select(FINANCING_COLUMNS)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to)
  );
  return rows.map(mapFinancingRow);
}

export async function insertFinancingOnline(
  f: Omit<VehicleFinancing, 'id' | 'createdAt' | 'updatedAt'>
): Promise<VehicleFinancing> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('financiamentos')
    .insert([toFinancingPayload(f)])
    .select(FINANCING_COLUMNS)
    .single();
  if (error) throw describeFinancingError(error);
  return mapFinancingRow(data);
}

export async function updateFinancingOnline(id: string, f: Partial<VehicleFinancing>): Promise<VehicleFinancing> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('financiamentos')
    .update(toFinancingPayload(f))
    .eq('id', id)
    .select(FINANCING_COLUMNS)
    .single();
  if (error) throw describeFinancingError(error);
  return mapFinancingRow(data);
}

// ------------------------------- Placas vinculadas ------------------------------

export async function getFinancingVehiclesOnline(): Promise<FinancingVehicleLink[]> {
  const supabase = requireSupabase();
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from('financiamento_veiculos')
      .select(LINK_COLUMNS)
      .order('data_inicio', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
  );
  return rows.map(mapLinkRow);
}

export async function insertFinancingVehicleOnline(link: {
  financingId: string;
  vehicleId: string;
  startDate: string;
  endDate?: string | null;
  notes?: string;
}): Promise<FinancingVehicleLink> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('financiamento_veiculos')
    .insert([
      {
        financiamento_id: link.financingId,
        veiculo_id: link.vehicleId,
        data_inicio: link.startDate,
        data_fim: link.endDate || null,
        observacao: emptyToNull(link.notes),
      },
    ])
    .select(LINK_COLUMNS)
    .single();
  if (error) throw describeFinancingError(error);
  return mapLinkRow(data);
}

/** Encerra o vínculo preenchendo data_fim (o registro é mantido para o histórico do rateio). */
export async function endFinancingVehicleOnline(linkId: string, endDate: string): Promise<FinancingVehicleLink> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('financiamento_veiculos')
    .update({ data_fim: endDate })
    .eq('id', linkId)
    .select(LINK_COLUMNS)
    .single();
  if (error) throw describeFinancingError(error);
  return mapLinkRow(data);
}

// ----------------------------------- Parcelas -----------------------------------

export async function getFinancingInstallmentsOnline(): Promise<FinancingInstallment[]> {
  const supabase = requireSupabase();
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from('financiamento_parcelas')
      .select(INSTALLMENT_COLUMNS)
      .order('financiamento_id', { ascending: true })
      .order('numero', { ascending: true })
      .range(from, to)
  );
  return rows.map(mapInstallmentRow);
}

/** Chama public.gerar_parcelas_financiamento (recusa se o contrato já tiver parcelas). */
export async function generateFinancingInstallmentsOnline(financingId: string): Promise<FinancingInstallment[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('gerar_parcelas_financiamento', {
    p_financiamento_id: financingId,
  });
  if (error) throw describeFinancingError(error);
  return ((data as any[]) || []).map(mapInstallmentRow);
}
