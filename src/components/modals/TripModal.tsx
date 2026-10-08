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
import { ClientModel, RouteModel, Trip } from '../../types';
import { useTransport } from '../../context/TransportContext';
import { INITIAL_OPERATION_TYPES } from '../../data/initialData';
import { formatCurrency, formatKm, getTodayISO } from '../../utils/formatters';
import { formatRouteKm } from '../../utils/freightPricing';
import { routeBlockIdentity } from '../../utils/blocks';
import { normalizeText } from '../../services/routeImportService';
import { SearchableSelect } from '../common/SearchableSelect';

const InactiveBadge: React.FC<{ label?: string }> = ({ label = 'Inativo' }) => (
  <span className="ml-1.5 inline-block text-[10px] font-semibold uppercase text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded align-middle">
    {label}
  </span>
);

const NO_TARIFF_MESSAGE = 'Não existe tarifa cadastrada para esta combinação.';

interface BlockOption {
  key: string; // identidade do bloco da rota (routeBlockIdentity)
  code: string;
  name: string;
  inactive: boolean;
  unregistered: boolean;
}

const blockLabel = (b: { code: string; name: string }) => (b.code ? `${b.code} - ${b.name}` : b.name);

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
    clients,
    activeClients,
    blocks,
    freightPricing,
    addTrip,
    updateTrip,
  } = useTransport();

  const [date, setDate] = useState(getTodayISO());
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [clientId, setClientId] = useState('');
  const [blockKey, setBlockKey] = useState('');

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
  const [branch, setBranch] = useState(branches[0]?.name || '');
  const [notes, setNotes] = useState('');

  // Selected vehicle object
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const detectedVehicleType = selectedVehicle ? selectedVehicle.vehicleType : null;

  useEffect(() => {
    if (tripToEdit) {
      setDate(tripToEdit.date);
      setVehicleId(tripToEdit.vehicleId || '');
      setDriverId(tripToEdit.driverId || '');
      // Viagens antigas não têm cliente_id: usa o cliente da rota ou, na falta dela, o nome digitado (se único).
      const editRoute = routes.find((r) => r.id === tripToEdit.routeId);
      const sameNameClients = clients.filter(
        (c) => normalizeText(c.name) === normalizeText(tripToEdit.client || '')
      );
      const editClientId =
        tripToEdit.clientId || editRoute?.clientId || (sameNameClients.length === 1 ? sameNameClients[0].id : '');
      const keepRoute = editRoute && editRoute.clientId === editClientId ? editRoute : undefined;
      setClientId(editClientId);
      setBlockKey(keepRoute ? routeBlockIdentity(keepRoute.blockId, keepRoute.block, blocks) : '');
      setRouteId(keepRoute ? keepRoute.id : '');
      setOrigin(tripToEdit.origin);
      setDestination(tripToEdit.destination);
      setOperationType(tripToEdit.operationType);
      setFreightValue(tripToEdit.freightValue);
      setTariffFreightValue(tripToEdit.tariffFreightValue);
      setFreightOverrideReason(tripToEdit.freightOverrideReason || '');
      setDistanceKm(tripToEdit.distanceKm);
      setTripCount(tripToEdit.tripCount || 1);
      setBranch(tripToEdit.branch || branches[0]?.name || '');
      setNotes(tripToEdit.notes || '');
      setTariffAppliedNotice(
        tripToEdit.tariffFreightValue
          ? `Tarifa tabelada: ${formatCurrency(tripToEdit.tariffFreightValue)}`
          : null
      );
    } else {
      setDate(getTodayISO());
      const defaultVeh = vehicles[0]?.id || '';
      setVehicleId(defaultVeh);
      setDriverId(drivers[0]?.id || '');
      setClientId('');
      setBlockKey('');
      setRouteId('');
      setOrigin('');
      setDestination('');
      setOperationType('Carga Fechada (FTL)');
      setFreightValue('');
      setTariffFreightValue(undefined);
      setFreightOverrideReason('');
      setDistanceKm('');
      setTripCount(1);
      setBranch(branches[0]?.name || '');
      setNotes('');
      setTariffAppliedNotice(null);
    }
  }, [tripToEdit, isOpen, vehicles, drivers, branches, clients, routes, blocks]);

  if (!isOpen) return null;

  // Cliente -> Rota: só clientes ativos; na edição, o cliente atual aparece mesmo se inativo.
  const clientOptions: ClientModel[] = [...activeClients];
  const currentClient = clients.find((c) => c.id === clientId);
  if (currentClient && !clientOptions.some((c) => c.id === currentClient.id)) clientOptions.push(currentClient);
  clientOptions.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  // Cliente -> Bloco -> Rota (CLIENTE + BLOCO + ROTA). Rotas antigas sem cliente nunca entram
  // (r.clientId vazio) e a filial não participa da seleção. Na edição, a rota atual aparece mesmo se inativa.
  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const getBlockKey = (r: RouteModel) => routeBlockIdentity(r.blockId, r.block, blocks);
  const clientRoutes = clientId
    ? routes.filter((r) => r.clientId === clientId && (r.status === 'Ativo' || r.id === tripToEdit?.routeId))
    : [];

  const blockOptionsByKey = new Map<string, BlockOption>();
  clientRoutes.forEach((r) => {
    const key = getBlockKey(r);
    if (blockOptionsByKey.has(key)) return;
    const registered = key.startsWith('id:') ? blockById.get(key.slice(3)) : undefined;
    const inactive = Boolean(registered) && registered?.status !== 'Ativo';
    // Blocos inativos não recebem novas viagens; na edição, o bloco da rota atual é mantido.
    if (inactive && r.id !== tripToEdit?.routeId) return;
    blockOptionsByKey.set(key, {
      key,
      code: registered?.code || '',
      name: registered?.name || r.block || 'Sem bloco',
      inactive,
      unregistered: !registered,
    });
  });
  const blockOptions = [...blockOptionsByKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const selectedBlock = blockOptionsByKey.get(blockKey);

  const routeOptions = blockKey
    ? clientRoutes
        .filter((r) => getBlockKey(r) === blockKey)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    : [];

  const selectedRoute = routes.find((r) => r.id === routeId);
  const selectedRouteKm = selectedRoute ? Number(selectedRoute.distanceKm) : 0;
  const hasValidRouteKm = Number.isFinite(selectedRouteKm) && selectedRouteKm > 0;

  const clearTariff = () => {
    setFreightValue('');
    setTariffFreightValue(undefined);
    setFreightOverrideReason('');
  };

  // CLIENTE + BLOCO + ROTA + TIPO DE CARRO = VALOR DO FRETE. A tarifa aponta para a rota (id),
  // que carrega Cliente e Bloco; a rota só é aceita se pertencer ao cliente e bloco selecionados.
  const findRouteTariff = (route: RouteModel, vehicleTypeName: string) => {
    if (route.clientId !== clientId || getBlockKey(route) !== blockKey) return undefined;
    const typeKey = normalizeText(vehicleTypeName);
    return freightPricing.find(
      (fp) => fp.status === 'Ativo' && fp.routeId === route.id && normalizeText(fp.vehicleTypeName) === typeKey
    );
  };

  // Preenche os dados da rota e busca a tarifa para Cliente + Bloco + Rota + Tipo de Carro
  const applyRouteAndTariff = (selectedRouteId: string, vehicleTypeName: string) => {
    const matchedRoute = routes.find((r) => r.id === selectedRouteId);
    if (!matchedRoute) return;

    if (matchedRoute.origin) setOrigin(matchedRoute.origin);
    if (matchedRoute.destination) setDestination(matchedRoute.destination);
    const km = Number(matchedRoute.distanceKm);
    setDistanceKm(Number.isFinite(km) && km > 0 ? km : '');
    if (matchedRoute.operationType) {
      setOperationType(matchedRoute.operationType);
    }
    if (matchedRoute.branch) {
      setBranch(matchedRoute.branch);
    }

    if (!vehicleTypeName) {
      clearTariff();
      setTariffAppliedNotice('Selecione a placa para identificar o tipo de carro e buscar a tarifa da rota.');
      return;
    }

    const tariff = findRouteTariff(matchedRoute, vehicleTypeName);
    if (tariff && tariff.freightValue > 0) {
      setFreightValue(tariff.freightValue);
      setTariffFreightValue(tariff.freightValue);
      setFreightOverrideReason('');
      setTariffAppliedNotice(
        `Tarifa tabelada aplicada: ${formatCurrency(tariff.freightValue)} (${matchedRoute.client} · ${matchedRoute.block || 'Sem bloco'} · ${matchedRoute.name} + ${vehicleTypeName})`
      );
    } else {
      clearTariff();
      setTariffAppliedNotice(
        `${NO_TARIFF_MESSAGE} (${matchedRoute.client} · ${matchedRoute.block || 'Sem bloco'} · ${matchedRoute.name} + ${vehicleTypeName})`
      );
    }
  };

  // Handler when user selects vehicle plate
  const handleVehicleChange = (newVehicleId: string) => {
    setVehicleId(newVehicleId);
    const veh = vehicles.find((v) => v.id === newVehicleId);
    if (!veh) return;

    // If route is already chosen, recalculate tariff for this combination
    if (routeId) {
      applyRouteAndTariff(routeId, veh.vehicleType);
    }
  };

  // Limpa rota, KM e frete. Origem/Destino só são limpos se vieram da rota anterior.
  const clearRouteSelection = () => {
    if (selectedRoute) {
      if (selectedRoute.origin && origin === selectedRoute.origin) setOrigin('');
      if (selectedRoute.destination && destination === selectedRoute.destination) setDestination('');
    }
    setRouteId('');
    setDistanceKm('');
    clearTariff();
    setTariffAppliedNotice(null);
  };

  const handleClientChange = (newClientId: string) => {
    if (newClientId === clientId) return;
    clearRouteSelection();
    setClientId(newClientId);
    setBlockKey('');
  };

  const handleBlockChange = (newBlockKey: string) => {
    if (newBlockKey === blockKey) return;
    clearRouteSelection();
    setBlockKey(newBlockKey);
  };

  // Handler when user selects a Route
  const handleRouteChange = (newRouteId: string) => {
    setRouteId(newRouteId);
    const veh = vehicles.find((v) => v.id === vehicleId);
    applyRouteAndTariff(newRouteId, veh ? veh.vehicleType : '');
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
    if (!vehicleId || !driverId || !clientId || !blockKey || !routeId || !origin || !destination || !numFreight) {
      alert(
        'Por favor, preencha todos os campos obrigatórios (Cliente, Bloco, Rota, Placa, Motorista, Origem, Destino e Valor do Frete).'
      );
      return;
    }

    if (
      !currentClient ||
      !selectedRoute ||
      selectedRoute.clientId !== clientId ||
      getBlockKey(selectedRoute) !== blockKey
    ) {
      alert('A rota selecionada não pertence ao cliente e bloco informados. Selecione novamente o cliente, o bloco e a rota.');
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

    const payload = {
      date,
      vehicleId,
      plate: selVeh ? selVeh.plate : 'INDEFINIDO',
      driverId,
      driverName: selDrv ? selDrv.name : 'Indefinido',
      clientId: currentClient.id,
      client: currentClient.name,
      routeId: selectedRoute.id,
      routeName: selectedRoute.name,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Truck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {tripToEdit ? 'Editar Lançamento de Viagem' : 'Lançar Nova Viagem / Frete'}
              </h2>
              <p className="text-xs text-slate-500">
                Integração automática: Cliente + Bloco + Rota + Tipo de Carro (placa) = Valor do Frete
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-6 space-y-4">
            {/* 1-2. CLIENTE E BLOCO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">1. Cliente *</label>
                <SearchableSelect<ClientModel>
                  items={clientOptions}
                  value={clientId}
                  onChange={handleClientChange}
                  getKey={(c) => c.id}
                  getSearchText={(c) => c.name}
                  placeholder="Selecione o cliente..."
                  searchPlaceholder="Buscar cliente pelo nome..."
                  disabled={clientOptions.length === 0}
                  disabledText="Nenhum cliente ativo cadastrado"
                  renderOption={(c) => (
                    <span className="font-semibold text-slate-900">
                      {c.name}
                      {c.status !== 'Ativo' && <InactiveBadge />}
                    </span>
                  )}
                />
                {tripToEdit && !tripToEdit.clientId && !clientId && tripToEdit.client && (
                  <p className="mt-1 text-[11px] text-amber-700">
                    Viagem antiga lançada com o cliente "{tripToEdit.client}" em texto livre. Selecione o cliente
                    cadastrado.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">2. Bloco *</label>
                <SearchableSelect<BlockOption>
                  items={blockOptions}
                  value={blockKey}
                  onChange={handleBlockChange}
                  getKey={(b) => b.key}
                  getSearchText={(b) => blockLabel(b)}
                  placeholder="Selecione o bloco..."
                  searchPlaceholder="Buscar bloco por código ou nome..."
                  disabled={!clientId || blockOptions.length === 0}
                  disabledText={!clientId ? 'Selecione primeiro o cliente' : 'Nenhum bloco disponível para este cliente.'}
                  renderOption={(b) => (
                    <span className="font-semibold text-slate-900">
                      {blockLabel(b)}
                      {b.inactive && <InactiveBadge />}
                      {b.unregistered && <InactiveBadge label="Sem bloco cadastrado" />}
                    </span>
                  )}
                />
              </div>
            </div>

            {/* 3. ROTA (CLIENTE + BLOCO + ROTA) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Compass size={14} className="text-blue-600" />
                <span>3. Rota *</span>
              </label>
              <SearchableSelect<RouteModel>
                items={routeOptions}
                value={routeId}
                onChange={handleRouteChange}
                getKey={(r) => r.id}
                getSearchText={(r) => `${r.code} ${r.name}`}
                placeholder="Selecione a rota..."
                searchPlaceholder="Buscar por código ou nome da rota..."
                disabled={!clientId || !blockKey || routeOptions.length === 0}
                disabledText={
                  !clientId || !blockKey
                    ? 'Selecione primeiro o cliente e o bloco'
                    : 'Nenhuma rota ativa para este cliente e bloco.'
                }
                renderOption={(r) => (
                  <div className="space-y-0.5">
                    <div className="text-slate-900">
                      <span className="font-mono font-bold text-slate-500">{r.code}</span>
                      <span className="text-slate-400"> — </span>
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-slate-500"> ({selectedBlock?.name || r.block || 'Sem bloco'})</span>
                      {r.status !== 'Ativo' && <InactiveBadge label="Inativa" />}
                    </div>
                    <div className="text-[11px]">
                      {Number(r.distanceKm) > 0 ? (
                        <span className="font-mono text-slate-600">{formatRouteKm(Number(r.distanceKm))}</span>
                      ) : (
                        <span className="text-rose-600 font-semibold">sem KM cadastrado</span>
                      )}
                    </div>
                  </div>
                )}
              />
            </div>

            {/* IDENTIFICAÇÃO AUTOMÁTICA PELA ROTA */}
            {selectedRoute && (
              <dl className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                <div>
                  <dt className="text-[11px] text-slate-500">Cliente</dt>
                  <dd className="font-bold text-slate-900">{selectedRoute.client || currentClient?.name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">Bloco</dt>
                  <dd>
                    <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 rounded">
                      {selectedBlock ? blockLabel(selectedBlock) : selectedRoute.block || 'Sem bloco'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">Rota</dt>
                  <dd className="font-semibold text-slate-900">
                    <span className="font-mono text-slate-500">{selectedRoute.code}</span> — {selectedRoute.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">KM da rota (Cadastro de Rotas)</dt>
                  <dd className="font-mono text-slate-800">
                    {hasValidRouteKm ? (
                      formatRouteKm(selectedRouteKm)
                    ) : (
                      <span className="text-rose-600 font-sans font-semibold">sem KM cadastrado</span>
                    )}
                  </dd>
                </div>
              </dl>
            )}

            {/* 4-5. PLACA E MOTORISTA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  4. Selecionar Placa *
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
                  5. Motorista *
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

            {/* IDENTIFICAÇÃO AUTOMÁTICA DO TIPO DE CARRO PELA PLACA */}
            {selectedVehicle && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 px-3 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Tipo de Carro identificado:</span>
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
                  <span>Justificativa Obrigatória — Valor Alterado Manualmente</span>
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

            {/* DATA, OPERAÇÃO, FILIAL & OBSERVAÇÕES */}
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
          <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
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
