import React, { useState } from 'react';
import { Filter, X, Calendar, ChevronDown, RefreshCcw } from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { PeriodFilter } from '../../types';
import {
  formatMonthLabel,
  getFirstDayOfMonthISO,
  getRecentMonthKeys,
  getTodayISO,
} from '../../utils/formatters';

export const FilterBar: React.FC = () => {
  const { filter, setFilter, resetFilters, vehicles, drivers, branches, vehicleTypes } = useTransport();
  const [isExpanded, setIsExpanded] = useState(false);

  const [lastMonthKey, currentMonthKey] = getRecentMonthKeys(2);
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

  const isFiltered =
    filter.period !== 'all' ||
    filter.branch !== 'all' ||
    filter.plate !== 'all' ||
    filter.driverId !== 'all' ||
    filter.vehicleType !== 'all' ||
    filter.ownershipType !== 'all' ||
    Boolean(filter.searchQuery);

  const handlePeriodChange = (val: PeriodFilter) => {
    setFilter((prev) => ({
      ...prev,
      period: val,
      startDate: val === 'custom' ? prev.startDate || getFirstDayOfMonthISO() : undefined,
      endDate: val === 'custom' ? prev.endDate || getTodayISO() : undefined,
    }));
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 shadow-xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Quick Period Buttons / Segmented control */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar size={13} />
            Período:
          </span>
          {[
            { id: 'all', label: 'Histórico Completo' },
            { id: 'thisMonth', label: `Mês Atual (${formatMonthLabel(currentMonthKey, 'short')})` },
            { id: 'last30days', label: 'Últimos 30 Dias' },
            { id: 'lastMonth', label: `Mês Anterior (${formatMonthLabel(lastMonthKey, 'short')})` },
            { id: 'thisQuarter', label: `${currentQuarter}º Trimestre` },
            { id: 'custom', label: 'Personalizado' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handlePeriodChange(item.id as PeriodFilter)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter.period === item.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Action: Expand more filters or Reset */}
        <div className="flex items-center gap-2">
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md transition-colors"
            >
              <X size={13} />
              Limpar Filtros
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
              isExpanded || isFiltered
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter size={13} />
            <span>Filtros Detalhados</span>
            <ChevronDown
              size={13}
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {filter.period === 'custom' && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">De:</span>
            <input
              type="date"
              value={filter.startDate || ''}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-600"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">Até:</span>
            <input
              type="date"
              value={filter.endDate || ''}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-600"
            />
          </div>
        </div>
      )}

      {/* Expanded Filter Dropdowns */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Filial */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Filial
            </label>
            <select
              value={filter.branch}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, branch: e.target.value }))
              }
              className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:outline-blue-600"
            >
              <option value="all">Todas as Filiais</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Placa */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Placa do Veículo
            </label>
            <select
              value={filter.plate}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, plate: e.target.value }))
              }
              className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-800 font-mono focus:outline-blue-600"
            >
              <option value="all">Todas as Placas</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.plate}>
                  {v.plate} ({v.brandModel.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Motorista */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Motorista
            </label>
            <select
              value={filter.driverId}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, driverId: e.target.value }))
              }
              className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:outline-blue-600"
            >
              <option value="all">Todos os Motoristas</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Veículo */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tipo de Veículo
            </label>
            <select
              value={filter.vehicleType}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, vehicleType: e.target.value }))
              }
              className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:outline-blue-600"
            >
              <option value="all">Todos os Tipos</option>
              {vehicleTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Propriedade (Próprio / Agregado / Terceiro) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Vínculo Operacional
            </label>
            <select
              value={filter.ownershipType}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, ownershipType: e.target.value }))
              }
              className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:outline-blue-600"
            >
              <option value="all">Próprios, Agregados e Terceiros</option>
              <option value="Próprio">Próprio</option>
              <option value="Agregado">Agregado</option>
              <option value="Terceiro">Terceiro</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
