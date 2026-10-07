import { FreightPricing } from '../types';

/**
 * Tarifa duplicada: outra tarifa ATIVA para a mesma ROTA + TIPO DE CARRO.
 * Cliente e Bloco vêm da rota, então a mesma rota implica o mesmo Cliente + Bloco.
 * Tarifas inativas não conflitam (ficam como histórico).
 */
export function findDuplicateActiveTariff(
  pricing: FreightPricing[],
  routeId: string,
  vehicleTypeId: string,
  excludeId?: string
): FreightPricing | undefined {
  if (!routeId || !vehicleTypeId) return undefined;
  return pricing.find(
    (fp) =>
      fp.id !== excludeId &&
      fp.status === 'Ativo' &&
      fp.routeId === routeId &&
      fp.vehicleTypeId === vehicleTypeId
  );
}
