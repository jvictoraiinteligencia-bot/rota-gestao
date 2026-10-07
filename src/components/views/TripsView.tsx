import React, { useState } from 'react';
import {
  Navigation,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Download,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { Trip } from '../../types';
import { TripModal } from '../modals/TripModal';
import {
  formatCurrency,
  formatDate,
  formatKm,
  formatNumber,
  downloadCSV,
} from '../../utils/formatters';

export const TripsView: React.FC = () => {
  const { trips, deleteTrip, navigateToVehicleAnalysis, setActiveView } = useTransport();

  const [search, setSearch] = useState('');
  const [filterPlate, setFilterPlate] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);

  // Distinct plates and drivers for filter dropdown
  const plates = Array.from(new Set(trips.map((t) => t.plate))).sort();
  const drivers = Array.from(new Set(trips.map((t) => t.driverName))).sort();

  const filteredTrips = trips.filter((t) => {
    if (filterPlate !== 'all' && t.plate !== filterPlate) return false;
    if (filterDriver !== 'all' && t.driverName !== filterDriver) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        t.plate.toLowerCase().includes(q) ||
        t.client.toLowerCase().includes(q) ||
        t.origin.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleOpenNew = () => {
    setTripToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (t: Trip) => {
    setTripToEdit(t);
    setModalOpen(true);
  };

  const handleDelete = (id: string, plate: string) => {
    if (window.confirm(`Deseja realmente excluir esta viagem da placa ${plate}?`)) {
      deleteTrip(id);
    }
  };

  // Quick stats for top
  const totalFretes = filteredTrips.reduce((acc, t) => acc + (t.freightValue || 0), 0);
  const totalKm = filteredTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
  const mediaPorKm = totalKm > 0 ? totalFretes / totalKm : 0;

  const handleExportCSV = () => {
    const headers = [
      'Data',
      'Placa',
      'Motorista',
      'Cliente',
      'Origem',
      'Destino',
      'Operação',
      'Valor Frete (R$)',
      'KM',
      'Viagens',
      'R$/KM',
      'R$/Viagem',
      'Filial',
    ];
    const rows = filteredTrips.map((t) => [
      t.date,
      t.plate,
      t.driverName,
      t.client,
      t.origin,
      t.destination,
      t.operationType,
      t.freightValue.toFixed(2),
      t.distanceKm,
      t.tripCount || 1,
      (t.distanceKm > 0 ? t.freightValue / t.distanceKm : 0).toFixed(2),
      (t.freightValue / (t.tripCount || 1)).toFixed(2),
      t.branch,
    ]);
    downloadCSV(`relatorio_viagens_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Viagens Listadas</span>
            <span className="text-base font-bold text-slate-900 font-mono">
              {filteredTrips.length} viagens
            </span>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-slate-500 block">Total em Fretes</span>
            <span className="text-base font-bold text-blue-700 font-mono">
              {formatCurrency(totalFretes)}
            </span>
          </div>
          <div className="border-l border-slate-200 pl-4 hidden md:block">
            <span className="text-slate-500 block">Quilometragem Total</span>
            <span className="text-base font-bold text-slate-800 font-mono">
              {formatKm(totalKm)}
            </span>
          </div>
          <div className="border-l border-slate-200 pl-4 hidden lg:block">
            <span className="text-slate-500 block">Média R$/KM</span>
            <span className="text-base font-bold text-emerald-700 font-mono">
              {formatCurrency(mediaPorKm)}/km
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('routes-pricing')}
            title="Acessar rotas e tabela de fretes cadastrada"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors shadow-xs"
          >
            <Compass size={14} />
            <span>Tabela de Fretes</span>
          </button>
          <button
            onClick={handleExportCSV}
            title="Exportar registros filtrados para CSV"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>+ Lançar Viagem</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por placa, cliente, origem, destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-blue-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterPlate}
            onChange={(e) => setFilterPlate(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 font-mono focus:outline-blue-600"
          >
            <option value="all">Todas as Placas</option>
            {plates.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={filterDriver}
            onChange={(e) => setFilterDriver(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-blue-600"
          >
            <option value="all">Todos os Motoristas</option>
            {drivers.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-3">Placa</th>
                <th className="py-3 px-3">Motorista</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Origem → Destino</th>
                <th className="py-3 px-3 text-right">KM</th>
                <th className="py-3 px-3 text-right">Valor Frete</th>
                <th className="py-3 px-3 text-right">R$ / KM</th>
                <th className="py-3 px-3 text-right">R$ / Viagem</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Nenhuma viagem registrada com estes critérios.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((t) => {
                  const faturamentoKm = t.distanceKm > 0 ? t.freightValue / t.distanceKm : 0;
                  const faturamentoViagem = t.freightValue / (t.tripCount || 1);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      {/* Data */}
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {formatDate(t.date)}
                      </td>

                      {/* Placa */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => navigateToVehicleAnalysis(t.plate)}
                          className="font-mono font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                          title="Ver análise completa deste caminhão"
                        >
                          {t.plate}
                        </button>
                      </td>

                      {/* Motorista */}
                      <td className="py-3 px-3 text-slate-800 font-medium">{t.driverName}</td>

                      {/* Cliente */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-900 block">{t.client}</span>
                        <span className="text-[11px] text-slate-400">{t.operationType}</span>
                      </td>

                      {/* Trajeto */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span>{t.origin}</span>
                          <ArrowRight size={11} className="text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-900">{t.destination}</span>
                        </div>
                        {t.routeName && (
                          <div className="text-[10px] text-blue-700 font-semibold mt-0.5 flex items-center gap-1">
                            <span>Rota: {t.routeName}</span>
                          </div>
                        )}
                      </td>

                      {/* KM */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                        {formatKm(t.distanceKm)}
                      </td>

                      {/* Valor Frete */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-blue-700 text-sm">
                        <div>{formatCurrency(t.freightValue)}</div>
                        {t.freightOverrideReason ? (
                          <div
                            className="text-[10px] text-amber-700 font-normal inline-block bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5"
                            title={`Justificativa: ${t.freightOverrideReason}`}
                          >
                            Ajustado manual
                          </div>
                        ) : t.tariffFreightValue ? (
                          <div className="text-[10px] text-emerald-700 font-normal inline-block bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5">
                            Tabelado
                          </div>
                        ) : null}
                      </td>

                      {/* R$/KM (Auto calculado) */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-800">
                        {formatCurrency(faturamentoKm)}/km
                      </td>

                      {/* R$/Viagem (Auto calculado) */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                        {formatCurrency(faturamentoViagem)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(t)}
                            title="Editar lançamento de viagem"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.plate)}
                            title="Excluir viagem"
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
      <TripModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tripToEdit={tripToEdit}
      />
    </div>
  );
};
