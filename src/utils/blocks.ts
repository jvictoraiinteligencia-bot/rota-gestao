import { CommonStatus } from '../types';

export interface BlockLike {
  id: string;
  name: string;
  status: CommonStatus | string;
}

/** Chave de comparação: "SECOS", "Secos", " secos " e "Sécos" representam o mesmo bloco. */
export function normalizeBlockKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Forma gravada no cadastro: espaços padronizados e maiúsculas. */
export function formatBlockName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toUpperCase();
}

/** Bloco com o mesmo nome padronizado (ativo ou inativo), ignorando o próprio registro em edição. */
export function findBlockWithSameName<T extends BlockLike>(blocks: T[], name: string, ignoreId?: string): T | undefined {
  const key = normalizeBlockKey(name);
  if (!key) return undefined;
  return blocks.find((b) => b.id !== ignoreId && normalizeBlockKey(b.name) === key);
}

/** Bloco cadastrado correspondente a um nome, priorizando o ativo. */
export function findBlockByName<T extends BlockLike>(blocks: T[], name: string): T | undefined {
  const key = normalizeBlockKey(name);
  if (!key) return undefined;
  const matches = blocks.filter((b) => normalizeBlockKey(b.name) === key);
  return matches.find((b) => b.status === 'Ativo') || matches[0];
}

/**
 * Identidade do bloco de uma rota para a regra CLIENTE + BLOCO + ROTA.
 * Usa o bloco cadastrado (bloco_id); rotas antigas sem vínculo usam o bloco cadastrado
 * de mesmo nome e, na falta dele, o texto antigo.
 */
export function routeBlockIdentity(
  blockId: string | null | undefined,
  legacyText: string | null | undefined,
  blocks: BlockLike[]
): string {
  if (blockId) return `id:${blockId}`;
  const match = findBlockByName(blocks, legacyText || '');
  return match ? `id:${match.id}` : `txt:${normalizeBlockKey(legacyText || '')}`;
}
