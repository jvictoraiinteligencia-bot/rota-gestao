import React, { useState, useEffect } from 'react';
import { X, DollarSign, ArrowRight, History, AlertCircle } from 'lucide-react';
import { FreightPricing, CommonStatus, RouteModel } from '../../types';
import { useTransport } from '../../context/TransportContext';
import { formatCurrency, getTodayISO } from '../../utils/formatters';
import {
  findDuplicateActiveTariff,
  formatRouteKm,
  NO_CLIENT_KEY,
  routeClientKey,
} from '../../utils/freightPricing';
import { routeBlockIdentity } from '../../utils/blocks';
import { SearchableSelect } from '../common/SearchableSelect';

interface ClientOption {
  key: string;
  name: string;
  inactive: boolean;
}

interface BlockOption {
  key: string;
  name: string;
  code: string;
  inactive: boolean;
  unregistered: boolean;
  routeCount: number;
}

const InactiveBadge: React.FC<{ label?: string }> = ({ label = 'Inativo' }) => (
  <span className="ml-1.5 inline-block text-[10px] font-semibold uppercase text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded align-middle">
    {label}
  </span>
);

const RouteKmText: React.FC<{ km: number }> = ({ km }) =>
  Number.isFinite(km) && km > 0 ? (
    <span className="font-mono text-slate-600">{formatRouteKm(km)}</span>
  ) : (
    <span className="text-rose-600 font-semibold">sem KM cadastrado</span>
  );

interface FreightPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pricingToEdit?: FreightPricing | null;
}

export const FreightPricingModal: React.FC<FreightPricingModalProps> = ({
  isOpen,
  onClose,
  pricingToEdit,
}) => {
  const {
    routes,
    clients,
    activeClients,
    blocks,
    vehicleTypes,
    freightPricing,
    addFreightPricing,
    updateFreightPricing,
  } = useTransport();

  const [clientKey, setClientKey] = useState('');
  const [blockKey, setBlockKey] = useState('');
  const [routeId, setRouteId] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [freightValue, setFreightValue] = useState<number | ''>('');
  const [status, setStatus] = useState<CommonStatus>('Ativo');
  const [notes, setNotes] = useState('');
  const [reajustReason, setReajustReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaving(false);
    if (pricingToEdit) {
      const currentRoute = routes.find((r) => r.id === pricingToEdit.routeId);
      setClientKey(currentRoute ? routeClientKey(currentRoute) : '');
      setBlockKey(currentRoute ? routeBlockIdentity(currentRoute.blockId, currentRoute.block, blocks) : '');
      setRouteId(currentRoute ? currentRoute.id : '');
      setVehicleTypeId(pricingToEdit.vehicleTypeId);
      setFreightValue(pricingToEdit.freightValue);
      setStatus(pricingToEdit.status);
      setNotes(pricingToEdit.notes || '');
      setReajustReason('');
    } else {
      setClientKey('');
      setBlockKey('');
      setRouteId('');
      setVehicleTypeId(vehicleTypes[0]?.id || '');
      setFreightValue('');
      setStatus('Ativo');
      setNotes('');
      setReajustReason('');
    }
  }, [pricingToEdit, isOpen, routes, blocks, vehicleTypes]);

  if (!isOpen) return null;

  // Hierarquia CLIENTE -> BLOCO -> ROTA. Para novas tarifas só entram rotas ativas de clientes
  // e blocos ativos; na edição, a rota atual (e seu cliente/bloco) aparece mesmo se inativa.
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const getBlockKey = (r: RouteModel) => routeBlockIdentity(r.blockId, r.block, blocks);
  const isBlockKeyActive = (key: string) =>
    !key.startsWith('id:') || blockById.get(key.slice(3))?.status === 'Ativo';
  const isRouteAvailable = (r: RouteModel) =>
    r.status === 'Ativo' &&
    Boolean(r.clientId) &&
    clientById.get(r.clientId)?.status === 'Ativo' &&
    isBlockKeyActive(getBlockKey(r));

  const currentRoute = pricingToEdit ? routes.find((r) => r.id === pricingToEdit.routeId) : undefined;
  const selectableRoutes = routes.filter((r) => r.id === currentRoute?.id || isRouteAvailable(r));

  const clientOptions: ClientOption[] = activeClients.map((c) => ({ key: c.id, name: c.name, inactive: false }));
  if (currentRoute) {
    const currentClientKey = routeClientKey(currentRoute);
    if (!clientOptions.some((o) => o.key === currentClientKey)) {
      clientOptions.push(
        currentClientKey === NO_CLIENT_KEY
          ? { key: NO_CLIENT_KEY, name: 'Sem cliente vinculado (rota antiga)', inactive: false }
          : {
              key: currentClientKey,
              name: clientById.get(currentClientKey)?.name || currentRoute.client || 'Cliente não encontrado',
              inactive: true,
            }
      );
    }
  }
  clientOptions.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const clientRoutes = clientKey ? selectableRoutes.filter((r) => routeClientKey(r) === clientKey) : [];
  const blockOptionsByKey = new Map<string, BlockOption>();
  clientRoutes.forEach((r) => {
    const key = getBlockKey(r);
    const existing = blockOptionsByKey.get(key);
    if (existing) {
      existing.routeCount += 1;
      return;
    }
    const registered = key.startsWith('id:') ? blockById.get(key.slice(3)) : undefined;
    blockOptionsByKey.set(key, {
      key,
      name: registered?.name || r.block || 'Sem bloco',
      code: registered?.code || '',
      inactive: Boolean(registered) && registered?.status !== 'Ativo',
      unregistered: !registered,
      routeCount: 1,
    });
  });
  const blockOptions = [...blockOptionsByKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const routeOptions = clientKey && blockKey ? clientRoutes.filter((r) => getBlockKey(r) === blockKey) : [];

  const handleClientChange = (key: string) => {
    if (key === clientKey) return;
    setClientKey(key);
    setBlockKey('');
    setRouteId('');
  };

  const handleBlockChange = (key: string) => {
    if (key === blockKey) return;
    setBlockKey(key);
    setRouteId('');
  };

  const selectedRoute = routes.find((r) => r.id === routeId);
  const selectedVehicleType = vehicleTypes.find((vt) => vt.id === vehicleTypeId);

  const numFreight = typeof freightValue === 'number' ? freightValue : 0;
  const isPriceChanged =
    pricingToEdit && Number(freightValue) !== Number(pricingToEdit.freightValue);

  const routeKm = selectedRoute ? Number(selectedRoute.distanceKm) : 0;
  const hasValidRouteKm = Number.isFinite(routeKm) && routeKm > 0;
  const valuePerKm = hasValidRouteKm && numFreight > 0 ? numFreight / routeKm : 0;

  const isRouteChanged = Boolean(pricingToEdit) && routeId !== pricingToEdit?.routeId;
  const currentRouteKm = currentRoute ? Number(currentRoute.distanceKm) : 0;
  const originalValuePerKm =
    pricingToEdit && currentRouteKm > 0 ? Number(pricingToEdit.freightValue) / currentRouteKm : 0;

  const duplicateTariff =
    status === 'Ativo'
      ? findDuplicateActiveTariff(freightPricing, routeId, vehicleTypeId, pricingToEdit?.id)
      : undefined;
  const duplicateMessage = duplicateTariff
    ? `Tarifa duplicada: já existe uma tarifa ativa para a rota "${duplicateTariff.routeName}" com o tipo de carro "${duplicateTariff.vehicleTypeName}" (${formatCurrency(duplicateTariff.freightValue)}). Inative a tarifa existente ou escolha outra combinação.`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!routeId || !vehicleTypeId || !numFreight) {
      alert('Selecione Cliente, Bloco e Rota, o tipo de carro e defina o valor do frete.');
      return;
    }
    if (!selectedRoute || !hasValidRouteKm) {
      alert(
        'A rota selecionada não possui KM válido cadastrado. Corrija o KM no Cadastro de Rotas antes de cadastrar a tarifa.'
      );
      return;
    }
    if (duplicateTariff) {
      alert(duplicateMessage);
      return;
    }

    const payload = {
      routeId,
      routeName: selectedRoute.name,
      distanceKm: routeKm,
      vehicleTypeId,
      vehicleTypeName: selectedVehicleType ? selectedVehicleType.name : 'Veículo',
      freightValue: numFreight,
      status,
      notes: notes.trim(),
    };

    setSaving(true);
    try {
      if (pricingToEdit) {
        await updateFreightPricing(pricingToEdit.id, payload, reajustReason);
      } else {
        // vigencia_inicial é obrigatória no banco: registra a data do cadastro.
        await addFreightPricing({ ...payload, validFrom: getTodayISO() });
      }
      onClose();
    } catch {
      // O contexto já informa o erro ao usuário; o formulário permanece aberto para correção.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <DollarSign size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {pricingToEdit ? 'Editar Tarifa de Frete' : 'Cadastrar Tarifa na Tabela de Fretes'}
              </h2>
              <p className="text-xs text-slate-500">
                Regra tarifária: Rota + Tipo de Carro = Valor do Frete
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente *</label>
            <SearchableSelect<ClientOption>
              items={clientOptions}
              value={clientKey}
              onChange={handleClientChange}
              getKey={(c) => c.key}
              getSearchText={(c) => c.name}
              placeholder="Selecione o cliente..."
              searchPlaceholder="Buscar cliente pelo nome..."
              renderOption={(c) => (
                <span className="font-semibold text-slate-900">
                  {c.name}
                  {c.inactive && <InactiveBadge />}
                </span>
              )}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bloco *</label>
            <SearchableSelect<BlockOption>
              items={blockOptions}
              value={blockKey}
              onChange={handleBlockChange}
              getKey={(b) => b.key}
              getSearchText={(b) => `${b.code} ${b.name}`}
              placeholder="Selecione o bloco..."
              searchPlaceholder="Buscar bloco..."
              disabled={!clientKey || blockOptions.length === 0}
              disabledText={!clientKey ? 'Selecione primeiro um cliente' : 'Nenhum bloco disponível para este cliente'}
              renderOption={(b) => (
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 rounded">
                    {b.name}
                  </span>
                  {b.code && <span className="text-[11px] text-slate-400 font-mono">cód. {b.code}</span>}
                  <span className="text-[11px] text-slate-500">
                    · {b.routeCount} rota{b.routeCount > 1 ? 's' : ''}
                  </span>
                  {b.inactive && <InactiveBadge />}
                  {b.unregistered && <InactiveBadge label="Sem bloco cadastrado" />}
                </span>
              )}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rota de Transporte *
            </label>
            <SearchableSelect<RouteModel>
              items={routeOptions}
              value={routeId}
              onChange={setRouteId}
              getKey={(r) => r.id}
              getSearchText={(r) => `${r.code} ${r.name}`}
              placeholder="Selecione a rota..."
              searchPlaceholder="Buscar por código ou nome da rota..."
              disabled={!clientKey || !blockKey}
              disabledText="Selecione primeiro o cliente e o bloco"
              renderOption={(r) => (
                <div className="space-y-0.5">
                  <div className="text-slate-900">
                    <span className="font-mono font-bold text-slate-500">{r.code}</span>
                    <span className="text-slate-400"> — </span>
                    <span className="font-semibold">{r.name}</span>
                    {r.status !== 'Ativo' && <InactiveBadge label="Inativa" />}
                  </div>
                  <div className="text-[11px]">
                    <RouteKmText km={Number(r.distanceKm)} />
                  </div>
                </div>
              )}
            />

            {selectedRoute && (
              <dl className="mt-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-slate-500">Cliente:</dt>
                <dd className="font-bold text-slate-900">{selectedRoute.client || 'Sem cliente'}</dd>
                <dt className="text-slate-500">Bloco:</dt>
                <dd>
                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 rounded">
                    {selectedRoute.block || 'Sem bloco'}
                  </span>
                </dd>
                <dt className="text-slate-500">Rota:</dt>
                <dd className="font-semibold text-slate-900">
                  <span className="font-mono text-slate-500">{selectedRoute.code}</span> — {selectedRoute.name}
                </dd>
                <dt className="text-slate-500">KM da rota:</dt>
                <dd className="font-mono text-slate-800">
                  {hasValidRouteKm ? formatRouteKm(routeKm) : <span className="text-rose-600 font-sans font-semibold">sem KM cadastrado</span>}
                  <span className="ml-2 font-sans text-[10px] text-slate-400">(Cadastro de Rotas, somente consulta)</span>
                </dd>
              </dl>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipo de Carro / Veículo *
            </label>
            <select
              required
              value={vehicleTypeId}
              onChange={(e) => setVehicleTypeId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-blue-600 font-medium"
            >
              <option value="">Selecione o tipo de carro...</option>
              {vehicleTypes.map((vt) => (
                <option key={vt.id} value={vt.id}>
                  {vt.name} — {vt.category} ({vt.payloadCapacity})
                </option>
              ))}
            </select>
          </div>

          {isRouteChanged && pricingToEdit && selectedRoute && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ArrowRight size={14} className="text-blue-700" />
                <span>Rota da tarifa será alterada</span>
              </div>
              <div>
                {pricingToEdit.routeName}
                {currentRouteKm > 0 && ` (${formatRouteKm(currentRouteKm)})`} → {selectedRoute.name}
                {hasValidRouteKm && ` (${formatRouteKm(routeKm)})`}
              </div>
              {originalValuePerKm > 0 && valuePerKm > 0 && (
                <div className="font-mono text-[11px]">
                  R$/KM: {formatCurrency(originalValuePerKm)}/km → {formatCurrency(valuePerKm)}/km
                </div>
              )}
              {(currentRoute?.clientId !== selectedRoute.clientId || currentRoute?.blockId !== selectedRoute.blockId) && (
                <div className="text-[11px] text-blue-800">
                  Cliente e Bloco passam a ser os da nova rota: {selectedRoute.client || 'Sem cliente'} ·{' '}
                  {selectedRoute.block || 'Sem bloco'}.
                </div>
              )}
            </div>
          )}

          {duplicateTariff && (
            <div className="p-3 rounded-md text-xs border flex items-start gap-2 bg-rose-50 border-rose-200 text-rose-800">
              <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{duplicateMessage}</span>
            </div>
          )}

          {selectedRoute && !hasValidRouteKm && (
            <div className="p-3 rounded-md text-xs border flex items-start gap-2 bg-rose-50 border-rose-200 text-rose-800">
              <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
              <span>
                A rota <strong>{selectedRoute.name}</strong> não possui KM válido cadastrado. Corrija o KM no
                Cadastro de Rotas antes de cadastrar a tarifa.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor do Frete (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="Ex: 3500.00"
                value={freightValue}
                onChange={(e) =>
                  setFreightValue(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-900 focus:outline-blue-600 font-bold text-base"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                R$ / KM (calculado)
              </label>
              <div className="w-full border border-slate-200 rounded-md px-3 py-2 font-mono text-base text-slate-700 bg-slate-100 cursor-not-allowed">
                {valuePerKm > 0 ? `${formatCurrency(valuePerKm)}/km` : '—'}
              </div>
              <span className="text-[10px] text-slate-400">Valor do Frete ÷ KM da Rota</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status da Tarifa
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CommonStatus)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
            >
              <option value="Ativo">Ativo (Aplicar automaticamente)</option>
              <option value="Inativo">Inativo (Suspenso)</option>
            </select>
          </div>

          {/* Motivo do reajuste se o valor foi alterado */}
          {isPriceChanged && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <History size={14} className="text-amber-700" />
                <span>Registro de Alteração de Preço (Histórico)</span>
              </div>
              <p className="text-[11px] text-amber-800">
                O valor anterior de {formatCurrency(pricingToEdit.freightValue)} será registrado
                no histórico de alterações da tarifa. As viagens já realizadas permanecerão com o
                valor antigo.
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                  Motivo / Justificativa do Reajuste:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Reajuste do diesel, aumento de custo de pedágio..."
                  value={reajustReason}
                  onChange={(e) => setReajustReason(e.target.value)}
                  className="w-full text-xs border border-amber-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-amber-600 bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações da Tarifa
            </label>
            <input
              type="text"
              placeholder="Ex: Pedágio incluso, descarga por conta do cliente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || (Boolean(selectedRoute) && !hasValidRouteKm) || Boolean(duplicateTariff)}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : pricingToEdit ? 'Salvar Tarifa' : 'Adicionar à Tabela'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
