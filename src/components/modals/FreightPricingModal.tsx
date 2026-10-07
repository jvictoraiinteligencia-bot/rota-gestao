import React, { useState, useEffect } from 'react';
import { X, DollarSign, ArrowRight, History, AlertCircle } from 'lucide-react';
import { FreightPricing, CommonStatus } from '../../types';
import { useTransport } from '../../context/TransportContext';
import { formatCurrency, formatNumber, getTodayISO } from '../../utils/formatters';
import { findDuplicateActiveTariff } from '../../utils/freightPricing';

const formatRouteKm = (km: number) => `${formatNumber(km, Number.isInteger(km) ? 0 : 2)} km`;

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
  const { routes, vehicleTypes, freightPricing, addFreightPricing, updateFreightPricing } = useTransport();

  const [routeId, setRouteId] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [freightValue, setFreightValue] = useState<number | ''>('');
  const [validFrom, setValidFrom] = useState(getTodayISO());
  const [validTo, setValidTo] = useState('');
  const [status, setStatus] = useState<CommonStatus>('Ativo');
  const [notes, setNotes] = useState('');
  const [reajustReason, setReajustReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaving(false);
    if (pricingToEdit) {
      setRouteId(pricingToEdit.routeId);
      setVehicleTypeId(pricingToEdit.vehicleTypeId);
      setFreightValue(pricingToEdit.freightValue);
      setValidFrom(pricingToEdit.validFrom);
      setValidTo(pricingToEdit.validTo || '');
      setStatus(pricingToEdit.status);
      setNotes(pricingToEdit.notes || '');
      setReajustReason('');
    } else {
      setRouteId(routes[0]?.id || '');
      setVehicleTypeId(vehicleTypes[0]?.id || '');
      setFreightValue('');
      setValidFrom(getTodayISO());
      setValidTo('');
      setStatus('Ativo');
      setNotes('');
      setReajustReason('');
    }
  }, [pricingToEdit, isOpen, routes, vehicleTypes]);

  if (!isOpen) return null;

  const selectedRoute = routes.find((r) => r.id === routeId);
  const selectedVehicleType = vehicleTypes.find((vt) => vt.id === vehicleTypeId);

  const numFreight = typeof freightValue === 'number' ? freightValue : 0;
  const isPriceChanged =
    pricingToEdit && Number(freightValue) !== Number(pricingToEdit.freightValue);

  const routeKm = selectedRoute ? Number(selectedRoute.distanceKm) : 0;
  const hasValidRouteKm = Number.isFinite(routeKm) && routeKm > 0;
  const valuePerKm = hasValidRouteKm && numFreight > 0 ? numFreight / routeKm : 0;

  const originalRoute = pricingToEdit ? routes.find((r) => r.id === pricingToEdit.routeId) : undefined;
  const isRouteChanged = Boolean(pricingToEdit) && routeId !== pricingToEdit?.routeId;
  const originalRouteKm = originalRoute ? Number(originalRoute.distanceKm) : 0;
  const originalValuePerKm =
    pricingToEdit && originalRouteKm > 0 ? Number(pricingToEdit.freightValue) / originalRouteKm : 0;

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
      alert('Selecione a rota, o tipo de carro e defina o valor do frete.');
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
      validFrom,
      validTo: validTo || undefined,
      status,
      notes: notes.trim(),
    };

    setSaving(true);
    try {
      if (pricingToEdit) {
        await updateFreightPricing(pricingToEdit.id, payload, reajustReason);
      } else {
        await addFreightPricing(payload);
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rota de Transporte *
            </label>
            <select
              required
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-blue-600 font-medium"
            >
              <option value="">Selecione a rota...</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.client || 'Sem cliente'} · {r.block || 'Sem bloco'} · {r.name} (
                  {Number(r.distanceKm) > 0 ? `${r.distanceKm} KM` : 'sem KM cadastrado'})
                </option>
              ))}
            </select>
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

          {/* Cliente + Bloco derivados da rota selecionada */}
          {selectedRoute && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
              <span className="text-slate-500 text-[11px] block">Contexto da tarifa (definido pela rota):</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-bold text-slate-900">{selectedRoute.client || 'Sem cliente'}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">Bloco:</span>
                <span className="font-bold text-indigo-700">{selectedRoute.block || 'Sem bloco'}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">Rota:</span>
                <span className="font-bold text-slate-900">{selectedRoute.name}</span>
                {selectedVehicleType && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">Tipo:</span>
                    <span className="font-bold text-blue-700">{selectedVehicleType.name}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {isRouteChanged && pricingToEdit && selectedRoute && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ArrowRight size={14} className="text-blue-700" />
                <span>Rota da tarifa será alterada</span>
              </div>
              <div>
                {pricingToEdit.routeName}
                {originalRouteKm > 0 && ` (${formatRouteKm(originalRouteKm)})`} → {selectedRoute.name}
                {hasValidRouteKm && ` (${formatRouteKm(routeKm)})`}
              </div>
              {originalValuePerKm > 0 && valuePerKm > 0 && (
                <div className="font-mono text-[11px]">
                  R$/KM: {formatCurrency(originalValuePerKm)}/km → {formatCurrency(valuePerKm)}/km
                </div>
              )}
              {(originalRoute?.clientId !== selectedRoute.clientId || originalRoute?.blockId !== selectedRoute.blockId) && (
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
                KM da Rota
              </label>
              <div className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 font-mono text-slate-700 bg-slate-100 cursor-not-allowed">
                {selectedRoute && hasValidRouteKm ? formatRouteKm(routeKm) : '—'}
              </div>
              <span className="text-[10px] text-slate-400">Definido no Cadastro de Rotas (somente consulta)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                R$ / KM (calculado)
              </label>
              <div className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 font-mono text-slate-700 bg-slate-100 cursor-not-allowed">
                {valuePerKm > 0 ? `${formatCurrency(valuePerKm)}/km` : '—'}
              </div>
              <span className="text-[10px] text-slate-400">Valor do Frete ÷ KM da Rota</span>
            </div>
          </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vigência Inicial *
              </label>
              <input
                type="date"
                required
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vigência Final (Opcional)
              </label>
              <input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-mono"
              />
            </div>
          </div>

          {/* Motivo do reajuste se o valor foi alterado */}
          {isPriceChanged && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <History size={14} className="text-amber-700" />
                <span>Registro de Alteração de Preço (Histórico)</span>
              </div>
              <p className="text-[11px] text-amber-800">
                O valor anterior de {formatCurrency(pricingToEdit.freightValue)} será mantido
                no histórico de vigência. As viagens já realizadas permanecerão com o valor
                antigo.
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
