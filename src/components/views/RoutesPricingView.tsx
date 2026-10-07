import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Truck,
  DollarSign,
  Plus,
  Search,
  Edit2,
  Trash2,
  History,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { RouteModel, VehicleTypeModel, FreightPricing } from '../../types';
import { RouteModal } from '../modals/RouteModal';
import { RouteImportModal } from '../modals/RouteImportModal';
import { VehicleTypeModal } from '../modals/VehicleTypeModal';
import { FreightPricingModal } from '../modals/FreightPricingModal';
import { MetricCard } from '../common/MetricCard';
import {
  formatCurrency,
  formatDate,
  formatKm,
  formatNumber,
  downloadCSV,
} from '../../utils/formatters';

type TabType = 'pricing' | 'routes' | 'vehicleTypes';

export const RoutesPricingView: React.FC = () => {
  const {
    routes,
    vehicleTypes,
    freightPricing,
    deleteRoute,
    toggleRouteStatus,
    deleteVehicleType,
    toggleVehicleTypeStatus,
    deleteFreightPricing,
    toggleFreightPricingStatus,
  } = useTransport();

  const [activeTab, setActiveTab] = useState<TabType>('pricing');

  // Search & Filters for Pricing Table
  const [pricingSearch, setPricingSearch] = useState('');
  const [filterRoute, setFilterRoute] = useState('all');
  const [filterVehicleType, setFilterVehicleType] = useState('all');
  const [filterPricingStatus, setFilterPricingStatus] = useState('all');

  // Search for Routes
  const [routeSearch, setRouteSearch] = useState('');
  const [routeStatusFilter, setRouteStatusFilter] = useState('all');

  // Search for Vehicle Types
  const [typeSearch, setTypeSearch] = useState('');

  // Modals state
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<RouteModel | null>(null);
  const [routeImportOpen, setRouteImportOpen] = useState(false);

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<VehicleTypeModel | null>(null);

  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingToEdit, setPricingToEdit] = useState<FreightPricing | null>(null);

  // History Drawer / Modal state
  const [historyItem, setHistoryItem] = useState<FreightPricing | null>(null);

  // Filtered pricing list
  const filteredPricing = freightPricing.filter((fp) => {
    if (filterRoute !== 'all' && fp.routeId !== filterRoute) return false;
    if (filterVehicleType !== 'all' && fp.vehicleTypeId !== filterVehicleType) return false;
    if (filterPricingStatus !== 'all' && fp.status !== filterPricingStatus) return false;
    if (pricingSearch) {
      const q = pricingSearch.toLowerCase();
      const match =
        fp.routeName.toLowerCase().includes(q) ||
        fp.vehicleTypeName.toLowerCase().includes(q) ||
        (fp.notes && fp.notes.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Filtered routes list
  const filteredRoutes = routes.filter((r) => {
    if (routeStatusFilter !== 'all' && r.status !== routeStatusFilter) return false;
    if (routeSearch) {
      const q = routeSearch.toLowerCase();
      const match =
        (r.client || '').toLowerCase().includes(q) ||
        (r.block || '').toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Filtered vehicle types list
  const filteredTypes = vehicleTypes.filter((vt) => {
    if (typeSearch) {
      const q = typeSearch.toLowerCase();
      const match =
        vt.name.toLowerCase().includes(q) ||
        vt.category.toLowerCase().includes(q) ||
        vt.description.toLowerCase().includes(q) ||
        vt.payloadCapacity.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Export Freight Pricing Table to CSV
  const handleExportPricingCSV = () => {
    const headers = [
      'Rota',
      'Distância (KM)',
      'Tipo de Carro',
      'Valor do Frete (R$)',
      'R$/KM Estimado',
      'Vigência Inicial',
      'Vigência Final',
      'Status',
      'Observação',
    ];
    const rows = filteredPricing.map((fp) => [
      fp.routeName,
      fp.distanceKm,
      fp.vehicleTypeName,
      fp.freightValue.toFixed(2),
      fp.distanceKm > 0 ? (fp.freightValue / fp.distanceKm).toFixed(2) : '0.00',
      fp.validFrom,
      fp.validTo || 'Indeterminada',
      fp.status,
      fp.notes || '',
    ]);
    downloadCSV(`tabela_fretes_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  // Export Routes to CSV
  const handleExportRoutesCSV = () => {
    const headers = ['CLIENTE', 'BLOCO', 'ROTA', 'KM'];
    const rows = filteredRoutes.map((r) => [r.client || '', r.block || '', r.name, r.distanceKm]);
    downloadCSV(`rotas_transportadora_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  // KPI calculations
  const activePricingCount = freightPricing.filter((p) => p.status === 'Ativo').length;
  const activeRoutesCount = routes.filter((r) => r.status === 'Ativo').length;
  const activeTypesCount = vehicleTypes.filter((t) => t.status === 'Ativo').length;
  const avgTariff =
    freightPricing.length > 0
      ? freightPricing.reduce((acc, p) => acc + p.freightValue, 0) / freightPricing.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Compass size={18} className="text-blue-600" />
            Rotas, Tipos de Veículos & Tabela de Fretes
          </h2>
          <p className="text-xs text-slate-500">
            Defina rotas, categorias da frota e a fórmula oficial de precificação: <span className="font-semibold text-slate-700">ROTA + TIPO DE CARRO = VALOR DO FRETE</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'pricing' && (
            <>
              <button
                onClick={handleExportPricingCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Download size={14} />
                <span>Exportar Tabela</span>
              </button>
              <button
                onClick={() => {
                  setPricingToEdit(null);
                  setPricingModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs"
              >
                <Plus size={15} />
                <span>+ Nova Tarifa de Frete</span>
              </button>
            </>
          )}

          {activeTab === 'routes' && (
            <>
              <button
                onClick={handleExportRoutesCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Download size={14} />
                <span>Exportar Rotas</span>
              </button>
              <button
                onClick={() => setRouteImportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors shadow-xs"
              >
                <Upload size={14} />
                <span>Importar Rotas</span>
              </button>
              <button
                onClick={() => {
                  setRouteToEdit(null);
                  setRouteModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
              >
                <Plus size={15} />
                <span>+ Cadastrar Rota</span>
              </button>
            </>
          )}

          {activeTab === 'vehicleTypes' && (
            <button
              onClick={() => {
                setTypeToEdit(null);
                setTypeModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-xs"
            >
              <Plus size={15} />
              <span>+ Cadastrar Tipo de Carro</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Tarifas Cadastradas"
          value={`${activePricingCount}`}
          subLabel={`de ${freightPricing.length} combinações`}
          variant="primary"
          icon={DollarSign}
        />
        <MetricCard
          label="Rotas Operacionais"
          value={`${activeRoutesCount}`}
          subLabel={`de ${routes.length} rotas totais`}
          icon={MapPin}
        />
        <MetricCard
          label="Tipos de Veículo"
          value={`${activeTypesCount}`}
          subLabel="categorias de frota"
          icon={Truck}
        />
        <MetricCard
          label="Tarifa Média Padrão"
          value={formatCurrency(avgTariff)}
          subLabel="média das tabelas ativas"
          icon={TrendingUp}
        />
      </div>

      {/* Tabs Selector */}
      <div className="border-b border-slate-200 bg-white px-4 rounded-t-lg shadow-xs flex items-center justify-between overflow-x-auto">
        <div className="flex space-x-1 sm:space-x-4">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`py-3.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign size={16} />
            <span>3. Tabela de Fretes (Tarifas)</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeTab === 'pricing' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {freightPricing.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('routes')}
            className={`py-3.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'routes'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin size={16} />
            <span>2. Cadastro de Rotas</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeTab === 'routes' ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {routes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('vehicleTypes')}
            className={`py-3.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'vehicleTypes'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck size={16} />
            <span>1. Cadastro de Tipo de Carro</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeTab === 'vehicleTypes' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {vehicleTypes.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: TABELA DE FRETES */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          {/* Explanation Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-3 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-emerald-100 text-emerald-800">
                <DollarSign size={14} />
              </span>
              <span>
                <strong>Regra Tarifária Automática:</strong> Ao lançar uma viagem, o sistema identifica o tipo de carro da placa e preenche o valor do frete tabelado automaticamente.
              </span>
            </div>
            <span className="text-[11px] text-emerald-800 font-mono">
              Alterações de valor criam histórico de vigência sem afetar fretes passados.
            </span>
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por rota, tipo de carro ou observação..."
                value={pricingSearch}
                onChange={(e) => setPricingSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterRoute}
                onChange={(e) => setFilterRoute(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-emerald-600"
              >
                <option value="all">Todas as Rotas</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>

              <select
                value={filterVehicleType}
                onChange={(e) => setFilterVehicleType(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-emerald-600"
              >
                <option value="all">Todos os Tipos</option>
                {vehicleTypes.map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.name} ({vt.category})
                  </option>
                ))}
              </select>

              <select
                value={filterPricingStatus}
                onChange={(e) => setFilterPricingStatus(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-emerald-600"
              >
                <option value="all">Todos os Status</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>

          {/* Pricing Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Rota de Transporte</th>
                    <th className="py-3 px-3">Tipo de Carro</th>
                    <th className="py-3 px-3 text-right">KM</th>
                    <th className="py-3 px-3 text-right">Valor do Frete</th>
                    <th className="py-3 px-3 text-right">R$ / KM Estimado</th>
                    <th className="py-3 px-3">Vigência</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Histórico</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPricing.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Nenhuma tarifa de frete cadastrada com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredPricing.map((fp) => {
                      const valorPorKm = fp.distanceKm > 0 ? fp.freightValue / fp.distanceKm : 0;
                      const hasHistory = fp.history && fp.history.length > 0;

                      return (
                        <tr key={fp.id} className="hover:bg-slate-50 transition-colors">
                          {/* Rota */}
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-900">{fp.routeName}</span>
                            </div>
                            {fp.notes && (
                              <span className="text-[11px] text-slate-400 font-normal line-clamp-1">
                                {fp.notes}
                              </span>
                            )}
                          </td>

                          {/* Tipo de Carro */}
                          <td className="py-3 px-3">
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                              {fp.vehicleTypeName}
                            </span>
                          </td>

                          {/* KM */}
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                            {formatKm(fp.distanceKm)}
                          </td>

                          {/* Valor do Frete */}
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-700 text-sm">
                            {formatCurrency(fp.freightValue)}
                          </td>

                          {/* R$/KM Estimado */}
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                            {formatCurrency(valorPorKm)}/km
                          </td>

                          {/* Vigência */}
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                            <div>A partir de {formatDate(fp.validFrom)}</div>
                            {fp.validTo ? (
                              <div className="text-slate-400">até {formatDate(fp.validTo)}</div>
                            ) : (
                              <div className="text-slate-400 text-[10px]">Indeterminada</div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => toggleFreightPricingStatus(fp.id)}
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                                fp.status === 'Ativo'
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                  : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                              }`}
                              title="Clique para alternar status"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  fp.status === 'Ativo' ? 'bg-emerald-600' : 'bg-slate-400'
                                }`}
                              />
                              {fp.status}
                            </button>
                          </td>

                          {/* Histórico de Reajustes */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setHistoryItem(fp)}
                              className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors ${
                                hasHistory
                                  ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 font-medium'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                              title="Ver histórico de reajustes desta tarifa"
                            >
                              <History size={13} />
                              <span>{hasHistory ? `${fp.history?.length} reg.` : 'Ver'}</span>
                            </button>
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setPricingToEdit(fp);
                                  setPricingModalOpen(true);
                                }}
                                title="Editar tarifa"
                                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Deseja realmente excluir a tarifa da rota "${fp.routeName}" para ${fp.vehicleTypeName}?`
                                    )
                                  ) {
                                    deleteFreightPricing(fp.id);
                                  }
                                }}
                                title="Excluir tarifa"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CADASTRO DE ROTAS */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, bloco ou rota..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-blue-600"
              />
            </div>

            <select
              value={routeStatusFilter}
              onChange={(e) => setRouteStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-blue-600"
            >
              <option value="all">Todas as Rotas</option>
              <option value="Ativo">Ativas</option>
              <option value="Inativo">Inativas</option>
            </select>
          </div>

          {/* Routes Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-3">Bloco</th>
                    <th className="py-3 px-3">Rota</th>
                    <th className="py-3 px-3 text-right">KM</th>
                    <th
                      className="py-3 px-3 text-slate-400 font-medium normal-case tracking-normal"
                      title="Campo informativo: a filial não interfere na identificação da rota (CLIENTE + BLOCO + ROTA)"
                    >
                      Filial (informativa)
                    </th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Nenhuma rota encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredRoutes.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        {/* Cliente */}
                        <td className="py-3.5 px-4 text-slate-900 font-semibold">
                          {r.client || <span className="text-slate-400 font-normal">-</span>}
                        </td>

                        {/* Bloco */}
                        <td className="py-3 px-3">
                          {r.block && r.blockId ? (
                            <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                              {r.block}
                            </span>
                          ) : r.block ? (
                            <span
                              className="text-amber-800 bg-amber-50 border border-dashed border-amber-300 px-2 py-0.5 rounded text-[11px] font-semibold"
                              title="Texto antigo: bloco ainda não vinculado ao cadastro de Blocos. Edite a rota para vincular."
                            >
                              {r.block}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Rota */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{r.name}</div>
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 rounded border border-blue-200">
                              {r.code}
                            </span>
                            {(r.origin || r.destination) && (
                              <span className="flex items-center gap-1">
                                <span>{r.origin}</span>
                                <ArrowRight size={10} className="text-slate-400 shrink-0" />
                                <span>{r.destination}</span>
                              </span>
                            )}
                            {r.operationType && <span className="text-slate-400">· {r.operationType}</span>}
                          </div>
                          {r.notes && (
                            <span className="text-[11px] text-slate-400 font-normal line-clamp-1">
                              {r.notes}
                            </span>
                          )}
                        </td>

                        {/* Distância KM */}
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                          {formatKm(r.distanceKm)}
                        </td>

                        {/* Filial (informativa) */}
                        <td className="py-3 px-3 text-[11px] text-slate-400">{r.branch || '-'}</td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => toggleRouteStatus(r.id)}
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                              r.status === 'Ativo'
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                            }`}
                            title="Clique para alternar status"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                r.status === 'Ativo' ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                            />
                            {r.status}
                          </button>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setRouteToEdit(r);
                                setRouteModalOpen(true);
                              }}
                              title="Editar rota"
                              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Deseja excluir a rota ${r.code} - ${r.name}?`)) {
                                  deleteRoute(r.id);
                                }
                              }}
                              title="Excluir rota"
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CADASTRO DE TIPO DE CARRO */}
      {activeTab === 'vehicleTypes' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por tipo (Truck, Carreta, Bitruck, VUC, 3/4)..."
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-indigo-600"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {filteredTypes.length} tipos cadastrados
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTypes.map((vt) => (
              <div
                key={vt.id}
                className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Truck size={16} className="text-indigo-600" />
                        {vt.name}
                      </h4>
                      <span className="inline-block text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded mt-1">
                        Categoria: {vt.category}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleVehicleTypeStatus(vt.id)}
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                        vt.status === 'Ativo'
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                      }`}
                      title="Alternar Ativo/Inativo"
                    >
                      {vt.status}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                    {vt.description || 'Sem descrição cadastrada'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Capacidade Carga:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {vt.payloadCapacity || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Quantidade Eixos:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {vt.axlesCount} eixos
                      </span>
                    </div>
                  </div>

                  {vt.notes && (
                    <div className="text-[11px] text-slate-400 mt-2 bg-slate-50 p-2 rounded">
                      Obs: {vt.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setTypeToEdit(vt);
                      setTypeModalOpen(true);
                    }}
                    className="p-1.5 text-xs text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1"
                  >
                    <Edit2 size={13} />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Deseja excluir o tipo de veículo "${vt.name}"?`)) {
                        deleteVehicleType(vt.id);
                      }
                    }}
                    className="p-1.5 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={13} />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Modal / Drawer for Price Changes */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Histórico de Reajustes da Tarifa</h3>
                  <p className="text-xs text-slate-500">
                    {historyItem.routeName} · <span className="font-semibold text-blue-700">{historyItem.vehicleTypeName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[11px]">Tarifa Vigente Atual:</span>
                  <span className="font-mono font-bold text-lg text-emerald-700">
                    {formatCurrency(historyItem.freightValue)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Vigência Inicial:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {formatDate(historyItem.validFrom)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Linha do Tempo de Alterações:
                </h4>

                {(!historyItem.history || historyItem.history.length === 0) ? (
                  <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-lg">
                    Nenhum reajuste registrado até o momento. O valor atual permanece o original.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto">
                    {historyItem.history.map((h, i) => (
                      <div
                        key={h.id || i}
                        className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-slate-500 text-[11px]">
                            {formatDate(h.changedAt)}
                          </span>
                          <div className="flex items-center gap-1.5 font-mono font-bold">
                            <span className="line-through text-slate-400">
                              {formatCurrency(h.previousValue)}
                            </span>
                            <ArrowRight size={11} className="text-slate-400" />
                            <span className="text-emerald-700">{formatCurrency(h.newValue)}</span>
                          </div>
                        </div>
                        {h.reason && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded mt-1">
                            <strong>Motivo:</strong> {h.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setHistoryItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <RouteModal
        isOpen={routeModalOpen}
        onClose={() => setRouteModalOpen(false)}
        routeToEdit={routeToEdit}
      />

      <RouteImportModal isOpen={routeImportOpen} onClose={() => setRouteImportOpen(false)} />

      <VehicleTypeModal
        isOpen={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        typeToEdit={typeToEdit}
      />

      <FreightPricingModal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        pricingToEdit={pricingToEdit}
      />
    </div>
  );
};
