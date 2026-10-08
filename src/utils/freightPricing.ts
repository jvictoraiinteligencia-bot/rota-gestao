import { FreightPricing, RouteModel } from '../types';
import { formatNumber } from './formatters';

export const formatRouteKm = (km: number) => `${formatNumber(km, Number.isInteger(km) ? 0 : 2)} km`;

/** Rotas antigas sem cliente vinculado ficam agrupadas sob esta chave. */
export const NO_CLIENT_KEY = 'sem-cliente';

export const routeClientKey = (route: RouteModel) => route.clientId || NO_CLIENT_KEY;

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
