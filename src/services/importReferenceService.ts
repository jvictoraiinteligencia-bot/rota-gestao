import type { Row, Sheet } from 'write-excel-file/browser';
import { BlockModel, ClientModel, CommonStatus, RouteModel, VehicleTypeModel } from '../types';
import { BlockLike, routeBlockIdentity } from '../utils/blocks';
import { getTodayISO } from '../utils/formatters';
import { fetchAllRows } from './freightImportService';

export type ClientReference = Pick<ClientModel, 'id' | 'name' | 'document' | 'status'>;
export type BlockReference = Pick<BlockModel, 'id' | 'code' | 'name' | 'status'>;
export type VehicleTypeReference = Pick<
  VehicleTypeModel,
  'id' | 'name' | 'category' | 'payloadCapacity' | 'axlesCount' | 'status'
>;

export interface RouteReference extends Pick<RouteModel, 'id' | 'code' | 'name' | 'distanceKm' | 'status'> {
  clientName: string;
  blockName: string;
  /** false quando a rota não tem bloco cadastrado correspondente (só texto antigo) e não é localizada na importação. */
  blockRegistered: boolean;
}

export interface ImportReferences {
  clients: ClientReference[];
  blocks: BlockReference[];
  routes: RouteReference[];
  vehicleTypes: VehicleTypeReference[];
  loadedAt: string;
}

const byText = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });

/** Consulta somente leitura dos cadastros atuais no Supabase, incluindo registros inativos. */
export async function loadImportReferences(): Promise<ImportReferences> {
  const [clientes, blocos, rotas, tipos] = await Promise.all([
    fetchAllRows('clientes', 'id, nome, documento, status'),
    fetchAllRows('blocos', 'id, codigo, nome, status'),
    fetchAllRows('rotas', 'id, codigo, nome, cliente_id, bloco_id, bloco, distancia_km, status'),
    fetchAllRows('tipos_carro', 'id, nome, categoria, capacidade_carga, quantidade_eixos, status'),
  ]);

  const clients: ClientReference[] = clientes
    .map((c) => ({ id: c.id, name: c.nome || '', document: c.documento || '', status: c.status as CommonStatus }))
    .sort((a, b) => byText(a.name, b.name));

  const blocks: BlockReference[] = blocos
    .map((b) => ({ id: b.id, code: b.codigo || '', name: b.nome || '', status: b.status as CommonStatus }))
    .sort((a, b) => byText(a.code, b.code) || byText(a.name, b.name));

  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const blockList: BlockLike[] = blocks.map((b) => ({ id: b.id, name: b.name, status: b.status }));

  const routes: RouteReference[] = rotas
    .map((r) => {
      const identity = routeBlockIdentity(r.bloco_id, r.bloco, blockList);
      const registeredBlock = identity.startsWith('id:') ? blockById.get(identity.slice(3)) : undefined;
      return {
        id: r.id,
        code: r.codigo || '',
        name: r.nome || '',
        clientName: (r.cliente_id && clientNameById.get(r.cliente_id)) || '',
        blockName: registeredBlock?.name || r.bloco || '',
        blockRegistered: Boolean(registeredBlock),
        distanceKm: Number(r.distancia_km) || 0,
        status: r.status as CommonStatus,
      };
    })
    .sort((a, b) => byText(a.code, b.code) || byText(a.name, b.name));

  const vehicleTypes: VehicleTypeReference[] = tipos
    .map((t) => ({
      id: t.id,
      name: t.nome || '',
      category: t.categoria,
      payloadCapacity: t.capacidade_carga || '',
      axlesCount: Number(t.quantidade_eixos) || 0,
      status: t.status as CommonStatus,
    }))
    .sort((a, b) => byText(a.name, b.name));

  return { clients, blocks, routes, vehicleTypes, loadedAt: new Date().toISOString() };
}

const header = (titles: string[]): Row => titles.map((value) => ({ value, fontWeight: 'bold' as const }));

export function buildImportReferenceSheets(data: ImportReferences): Sheet<Blob>[] {
  return [
    {
      sheet: 'CLIENTES',
      stickyRowsCount: 1,
      columns: [{ width: 50 }, { width: 22 }, { width: 10 }],
      data: [
        header(['CLIENTE', 'DOCUMENTO', 'STATUS']),
        ...data.clients.map((c) => [c.name, c.document, c.status]),
      ],
    },
    {
      sheet: 'BLOCOS',
      stickyRowsCount: 1,
      columns: [{ width: 10 }, { width: 30 }, { width: 10 }],
      data: [header(['CÓDIGO', 'BLOCO', 'STATUS']), ...data.blocks.map((b) => [b.code, b.name, b.status])],
    },
    {
      sheet: 'ROTAS',
      stickyRowsCount: 1,
      columns: [{ width: 12 }, { width: 45 }, { width: 20 }, { width: 45 }, { width: 10 }, { width: 10 }],
      data: [
        header(['CÓDIGO', 'CLIENTE', 'BLOCO', 'ROTA', 'KM', 'STATUS']),
        ...data.routes.map((r) => [r.code, r.clientName, r.blockName, r.name, r.distanceKm, r.status]),
      ],
    },
    {
      sheet: 'TIPOS DE CARRO',
      stickyRowsCount: 1,
      columns: [{ width: 25 }, { width: 15 }, { width: 20 }, { width: 8 }, { width: 10 }],
      data: [
        header(['TIPO DE CARRO', 'CATEGORIA', 'CAPACIDADE DE CARGA', 'EIXOS', 'STATUS']),
        ...data.vehicleTypes.map((t) => [t.name, t.category, t.payloadCapacity, t.axlesCount, t.status]),
      ],
    },
  ];
}

export async function downloadImportReferencesXlsx(data: ImportReferences): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  await writeXlsxFile(buildImportReferenceSheets(data)).toFile(`referencias_importacao_${getTodayISO()}.xlsx`);
}
