import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  Compass,
  Truck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Trip } from '../../types';
import { useTransport } from '../../context/TransportContext';
import { INITIAL_OPERATION_TYPES } from '../../data/initialData';
import { formatCurrency, formatKm } from '../../utils/formatters';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripToEdit?: Trip | null;
}

export const TripModal: React.FC<TripModalProps> = ({
  isOpen,
  onClose,
  tripToEdit,
}) => {
  const {
    vehicles,
    drivers,
    branches,
    routes,
    findFreightTariff,
    addTrip,
    updateTrip,
  } = useTransport();

  const [date, setDate] = useState('2026-10-06');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [client, setClient] = useState('');

  // Route & Automated Freight Pricing
  const [routeId, setRouteId] = useState<string>('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distanceKm, setDistanceKm] = useState<number | ''>('');
  const [operationType, setOperationType] = useState('Carga Fechada (FTL)');

  // Freight Values & Tariff Override
  const [freightValue, setFreightValue] = useState<number | ''>('');
  const [tariffFreightValue, setTariffFreightValue] = useState<number | undefined>(undefined);
  const [freightOverrideReason, setFreightOverrideReason] = useState<string>('');
  const [tariffAppliedNotice, setTariffAppliedNotice] = useState<string | null>(null);

  const [tripCount, setTripCount] = useState<number>(1);
  const [branch, setBranch] = useState(branches[0]?.name || 'Matriz São Paulo');
  const [notes, setNotes] = useState('');

  // Selected vehicle object
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const detectedVehicleType = selectedVehicle ? selectedVehicle.vehicleType : null;

  useEffect(() => {
    if (tripToEdit) {
      setDate(tripToEdit.date);
      setVehicleId(tripToEdit.vehicleId || '');
      setDriverId(tripToEdit.driverId || '');
      setClient(tripToEdit.client);
      setRouteId(tripToEdit.routeId || '');
      setOrigin(tripToEdit.origin);
      setDestination(tripToEdit.destination);
      setOperationType(tripToEdit.operationType);
      setFreightValue(tripToEdit.freightValue);
      setTariffFreightValue(tripToEdit.tariffFreightValue);
      setFreightOverrideReason(tripToEdit.freightOverrideReason || '');
      setDistanceKm(tripToEdit.distanceKm);
      setTripCount(tripToEdit.tripCount || 1);
      setBranch(tripToEdit.branch || branches[0]?.name || 'Matriz São Paulo');
      setNotes(tripToEdit.notes || '');
      setTariffAppliedNotice(
        tripToEdit.tariffFreightValue
          ? `Tarifa tabelada: ${formatCurrency(tripToEdit.tariffFreightValue)}`
          : null
      );
    } else {
      setDate('2026-10-06');
      const defaultVeh = vehicles[0]?.id || '';
      setVehicleId(defaultVeh);
      setDriverId(drivers[0]?.id || '');
      setClient('');
      setRouteId('');
      setOrigin('São Paulo - SP');
      setDestination('Curitiba - PR');
      setOperationType('Carga Fechada (FTL)');
      setFreightValue('');
      setTariffFreightValue(undefined);
      setFreightOverrideReason('');
      setDistanceKm('');
      setTripCount(1);
      setBranch(branches[0]?.name || 'Matriz São Paulo');
      setNotes('');
      setTariffAppliedNotice(null);
    }
  }, [tripToEdit, isOpen, vehicles, drivers, branches]);

  if (!isOpen) return null;

  // Handler when user selects vehicle plate
  const handleVehicleChange = (newVehicleId: string) => {
    setVehicleId(newVehicleId);
    const veh = vehicles.find((v) => v.id === newVehicleId);
    if (!veh) return;

    // If route is already chosen, recalculate tariff for this combination
    if (routeId) {
      applyTariffLookup(routeId, veh.vehicleType);
    }
  };

  // Helper to look up and apply tariff
  const applyTariffLookup = (selectedRouteId: string, vehicleTypeName: string) => {
    if (!selectedRouteId || !vehicleTypeName) return;

    const matchedRoute = routes.find((r) => r.id === selectedRouteId);
    if (matchedRoute) {
      setOrigin(matchedRoute.origin);
      setDestination(matchedRoute.destination);
      setDistanceKm(matchedRoute.distanceKm);
      if (matchedRoute.operationType) {
        setOperationType(matchedRoute.operationType);
      }
      if (matchedRoute.branch) {
        setBranch(matchedRoute.branch);
      }
    }

    const tariff = findFreightTariff(selectedRouteId, vehicleTypeName);
    if (tariff && tariff.freightValue > 0) {
      setFreightValue(tariff.freightValue);
      setTariffFreightValue(tariff.freightValue);
      setFreightOverrideReason('');
      setTariffAppliedNotice(
        `Tarifa tabelada aplicada: ${formatCurrency(tariff.freightValue)} (${matchedRoute?.name} + ${vehicleTypeName})`
      );
    } else {
      setTariffFreightValue(undefined);
      setTariffAppliedNotice(
        `Nenhuma tarifa cadastrada na tabela para "${matchedRoute?.name}" com veículo "${vehicleTypeName}". Preencha o frete manualmente.`
      );
    }
  };

  // Handler when user selects a Route
  const handleRouteChange = (newRouteId: string) => {
    setRouteId(newRouteId);

    if (!newRouteId) {
      // Manual / off-table route
      setTariffFreightValue(undefined);
      setTariffAppliedNotice(null);
      return;
    }

    const veh = vehicles.find((v) => v.id === vehicleId);
    const vehicleType = veh ? veh.vehicleType : '';

    applyTariffLookup(newRouteId, vehicleType);
  };

  const numFreight = typeof freightValue === 'number' ? freightValue : 0;
  const numKm = typeof distanceKm === 'number' ? distanceKm : 0;
  const numCount = tripCount > 0 ? tripCount : 1;

  const faturamentoPorKm = numKm > 0 ? numFreight / numKm : 0;
  const faturamentoPorViagem = numFreight / numCount;

  // Check if manual value differs from tariff
  const isTariffOverridden =
    tariffFreightValue !== undefined &&
    freightValue !== '' &&
    Number(freightValue) !== Number(tariffFreightValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !driverId || !client || !origin || !destination || !numFreight) {
      alert('Por favor, preencha todos os campos obrigatórios (Veículo, Motorista, Cliente, Origem, Destino e Valor do Frete).');
      return;
    }

    if (isTariffOverridden && !freightOverrideReason.trim()) {
      alert(
        `O valor do frete (${formatCurrency(numFreight)}) difere do valor oficial da tabela (${formatCurrency(
          tariffFreightValue || 0
        )}). É obrigatório informar a justificativa da alteração manual.`
      );
      return;
    }

    const selVeh = vehicles.find((v) => v.id === vehicleId);
    const selDrv = drivers.find((d) => d.id === driverId);
    const selRoute = routes.find((r) => r.id === routeId);

    const payload = {
      date,
      vehicleId,
      plate: selVeh ? selVeh.plate : 'INDEFINIDO',
      driverId,
      driverName: selDrv ? selDrv.name : 'Indefinido',
      client,
      routeId: routeId || undefined,
      routeName: selRoute ? selRoute.name : undefined,
      origin,
      destination,
      operationType,
      freightValue: numFreight,
      tariffFreightValue: tariffFreightValue,
      freightOverrideReason: isTariffOverridden ? freightOverrideReason.trim() : undefined,
      distanceKm: numKm,
      tripCount: numCount,
      branch,
      notes: notes.trim(),
    };

    if (tripToEdit) {
      updateTrip(tripToEdit.id, payload);
    } else {
      addTrip(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Truck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {tripToEdit ? 'Editar Lançamento de Viagem' : 'Lançar Nova Viagem / Frete'}
              </h2>
              <p className="text-xs text-slate-500">
                Integração automática: Placa + Tipo de Carro + Rota = Valor do Frete
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
          {/* STEP 1: VEÍCULO & IDENTIFICAÇÃO AUTOMÁTICA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data do Frete *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. Selecionar Placa *
              </label>
              <select
                required
                value={vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full text-xs border border-blue-300 rounded-md px-3 py-2 text-slate-900 font-mono font-bold focus:outline-blue-600 bg-blue-50/30"
              >
                <option value="">Selecione o veículo...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.brandModel} ({v.vehicleType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motorista *
              </label>
              <select
                required
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                <option value="">Selecione o motorista...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.driverType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* STEP 2: IDENTIFICAÇÃO AUTOMÁTICA DO TIPO DE CARRO */}
          {selectedVehicle && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 px-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">2. Tipo de Carro identificado:</span>
                <span className="font-bold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded text-[11px]">
                  {detectedVehicleType}
                </span>
                <span className="text-slate-500 hidden sm:inline">
                  ({selectedVehicle.brandModel} · {selectedVehicle.ownershipType})
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Placa: {selectedVehicle.plate}
              </span>
            </div>
          )}

          {/* STEP 3: SELEÇÃO DA ROTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Compass size={14} className="text-blue-600" />
                <span>3. Selecionar Rota Cadastrada</span>
              </label>
              <select
                value={routeId}
                onChange={(e) => handleRouteChange(e.target.value)}
                className="w-full text-xs border border-blue-300 rounded-md px-3 py-2 text-slate-900 font-medium focus:outline-blue-600 bg-blue-50/20"
              >
                <option value="">Selecione a rota da tabela (ou rota avulsa)...</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code}: {r.name} ({r.distanceKm} KM)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cliente / Embarcador *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Ambev S.A., Nestlé, Vale, Cargill"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
              />
            </div>
          </div>

          {/* NOTICE: TARIFA AUTOMÁTICA ENCONTRADA OU AVISO */}
          {tariffAppliedNotice && (
            <div
              className={`rounded-lg p-2.5 px-3 text-xs flex items-center gap-2 border ${
                tariffFreightValue !== undefined
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {tariffFreightValue !== undefined ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <Info size={16} className="text-amber-600 shrink-0" />
              )}
              <span className="font-medium text-[11px]">{tariffAppliedNotice}</span>
            </div>
          )}

          {/* TRAJETO: ORIGEM E DESTINO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Origem (Cidade - UF) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: São Luís - MA ou São Paulo - SP"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destino (Cidade - UF) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Imperatriz - MA ou Curitiba - PR"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>
          </div>

          {/* STEP 4 & 5: VALORES, KM E PREENCHIMENTO AUTOMÁTICO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor do Frete (R$) *
                {tariffFreightValue !== undefined && (
                  <span className="text-[10px] text-emerald-700 font-normal ml-1">
                    (Tabelado: {formatCurrency(tariffFreightValue)})
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0,00"
                value={freightValue}
                onChange={(e) =>
                  setFreightValue(e.target.value === '' ? '' : Number(e.target.value))
                }
                className={`w-full text-xs border rounded-md px-3 py-2 font-mono font-bold text-base focus:outline-blue-600 ${
                  isTariffOverridden
                    ? 'border-amber-400 text-amber-900 bg-amber-50/50'
                    : 'border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Distância Rodada (KM) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                placeholder="Ex: 630"
                value={distanceKm}
                onChange={(e) =>
                  setDistanceKm(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-900 focus:outline-blue-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade de Viagens
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={tripCount}
                onChange={(e) => setTripCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-900 focus:outline-blue-600"
              />
            </div>
          </div>

          {/* STEP 6: JUSTIFICATIVA DE ALTERAÇÃO MANUAL DA TABELA */}
          {isTariffOverridden && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertTriangle size={15} className="text-amber-600" />
                <span>6. Justificativa Obrigatória — Valor Alterado Manualmente</span>
              </div>
              <p className="text-[11px] text-amber-800">
                O valor preenchido ({formatCurrency(numFreight)}) diverge da tabela oficial de fretes ({formatCurrency(tariffFreightValue || 0)}). Informe o motivo para fins de auditoria e controle:
              </p>
              <input
                type="text"
                required
                placeholder="Ex: Frete com retorno garantido, carga excedente com acréscimo, negociação especial com embarcador..."
                value={freightOverrideReason}
                onChange={(e) => setFreightOverrideReason(e.target.value)}
                className="w-full text-xs border border-amber-300 rounded-md px-3 py-2 text-slate-900 bg-white focus:outline-amber-600"
              />
            </div>
          )}

          {/* CÁLCULO AUTOMÁTICO DE INDICADORES */}
          <div className="bg-blue-50/70 border border-blue-200/60 rounded-lg p-3 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900 font-semibold">
              <Calculator size={15} className="text-blue-600" />
              <span>Cálculo Automático:</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-500">Faturamento/KM:</span>{' '}
                <span className="font-mono font-bold text-blue-800">
                  {formatCurrency(faturamentoPorKm)}/km
                </span>
              </div>
              <div className="border-l border-blue-200 pl-4">
                <span className="text-slate-500">Faturamento/Viagem:</span>{' '}
                <span className="font-mono font-bold text-blue-800">
                  {formatCurrency(faturamentoPorViagem)}
                </span>
              </div>
            </div>
          </div>

          {/* OPERAÇÃO, FILIAL & OBSERVAÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Operação
              </label>
              <select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                {INITIAL_OPERATION_TYPES.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filial Responsável
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações
              </label>
              <input
                type="text"
                placeholder="Ex: NF 4910, entrega agendada..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-xs"
            >
              {tripToEdit ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
