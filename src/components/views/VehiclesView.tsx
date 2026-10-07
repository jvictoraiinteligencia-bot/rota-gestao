import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { Vehicle } from '../../types';
import { VehicleModal } from '../modals/VehicleModal';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export const VehiclesView: React.FC = () => {
  const { vehiclesStats, deleteVehicle, navigateToVehicleAnalysis } = useTransport();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterOwnership, setFilterOwnership] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);

  const filteredStats = vehiclesStats.filter((item) => {
    const v = item.vehicle;
    if (filterType !== 'all' && v.vehicleType !== filterType) return false;
    if (filterOwnership !== 'all' && v.ownershipType !== filterOwnership) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        v.plate.toLowerCase().includes(q) ||
        v.brandModel.toLowerCase().includes(q) ||
        v.owner.toLowerCase().includes(q) ||
        v.branch.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleOpenNew = () => {
    setVehicleToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (v: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    setVehicleToEdit(v);
    setModalOpen(true);
  };

  const handleDelete = (id: string, plate: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Deseja realmente excluir o veículo placa ${plate}?`)) {
      deleteVehicle(id);
    }
  };

  // Totals for top bar
  const totalFaturamento = filteredStats.reduce((acc, s) => acc + s.faturamento, 0);
  const totalDespesas = filteredStats.reduce((acc, s) => acc + s.despesas, 0);
  const totalLucro = totalFaturamento - totalDespesas;

  return (
    <div className="space-y-6">
      {/* Top action & summary row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Total de Veículos</span>
            <span className="text-base font-bold text-slate-900 font-mono">
              {filteredStats.length} veículos
            </span>
          </div>
          <div className="border-l border-slate-200 pl-4 hidden md:block">
            <span className="text-slate-500 block">Faturamento Acumulado</span>
            <span className="text-base font-bold text-blue-700 font-mono">
              {formatCurrency(totalFaturamento)}
            </span>
          </div>
          <div className="border-l border-slate-200 pl-4 hidden md:block">
            <span className="text-slate-500 block">Lucro Acumulado</span>
            <span
              className={`text-base font-bold font-mono ${
                totalLucro >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatCurrency(totalLucro)}
            </span>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
        >
          <Plus size={15} />
          <span>Cadastrar Veículo</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por placa, modelo, proprietário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-blue-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterOwnership}
            onChange={(e) => setFilterOwnership(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-blue-600"
          >
            <option value="all">Todos os Vínculos</option>
            <option value="Próprio">Próprio</option>
            <option value="Agregado">Agregado</option>
            <option value="Terceiro">Terceiro</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-blue-600"
          >
            <option value="all">Todos os Tipos</option>
            <option value="Carreta LS">Carreta LS</option>
            <option value="Bitrem">Bitrem</option>
            <option value="Truck">Truck</option>
            <option value="Toco">Toco</option>
            <option value="VUC">VUC</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Placa / Modelo</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Proprietário / Vínculo</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Viagens</th>
                <th className="py-3 px-3 text-right">Faturamento</th>
                <th className="py-3 px-3 text-right">Despesas</th>
                <th className="py-3 px-3 text-right">Lucro Líquido</th>
                <th className="py-3 px-3 text-right">Margem %</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Nenhum veículo encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredStats.map(({ vehicle, faturamento, despesas, lucro, margem, viagens }) => {
                  const isPositive = lucro >= 0;

                  return (
                    <tr
                      key={vehicle.id}
                      onClick={() => navigateToVehicleAnalysis(vehicle.id)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      title="Clique para ver o histórico completo e análise financeira da placa"
                    >
                      {/* Placa & Modelo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                            {vehicle.plate}
                          </span>
                          <ExternalLink size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {vehicle.brandModel} ({vehicle.year})
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-3">
                        <span className="text-slate-700 font-medium">{vehicle.vehicleType}</span>
                        <div className="text-[11px] text-slate-400">{vehicle.branch}</div>
                      </td>

                      {/* Proprietário */}
                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium truncate max-w-[150px]">
                          {vehicle.owner}
                        </div>
                        <span className="text-[11px] text-slate-500 font-sans">
                          {vehicle.ownershipType}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-medium text-[11px] ${
                            vehicle.status === 'Ativo'
                              ? 'text-emerald-700'
                              : 'text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              vehicle.status === 'Ativo' ? 'bg-emerald-600' : 'bg-slate-400'
                            }`}
                          />
                          {vehicle.status}
                        </span>
                      </td>

                      {/* Viagens */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-slate-700">
                        {viagens}
                      </td>

                      {/* Faturamento */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-blue-700">
                        {formatCurrency(faturamento)}
                      </td>

                      {/* Despesas */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatCurrency(despesas)}
                      </td>

                      {/* Lucro */}
                      <td
                        className={`py-3 px-3 text-right font-mono tabular-nums font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(lucro)}
                      </td>

                      {/* Margem */}
                      <td
                        className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                          margem >= 20
                            ? 'text-emerald-700'
                            : margem > 0
                            ? 'text-blue-700'
                            : 'text-rose-600'
                        }`}
                      >
                        {formatPercent(margem)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => handleEdit(vehicle, e)}
                            title="Editar dados cadastrais"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(vehicle.id, vehicle.plate, e)}
                            title="Excluir veículo"
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

      {/* Modal */}
      <VehicleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        vehicleToEdit={vehicleToEdit}
      />
    </div>
  );
};
