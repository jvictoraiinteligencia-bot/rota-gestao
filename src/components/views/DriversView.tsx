import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Phone,
  FileBadge,
  ExternalLink,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { Driver } from '../../types';
import { DriverModal } from '../modals/DriverModal';
import { DriverDetailModal } from '../modals/DriverDetailModal';
import {
  formatCurrency,
  formatCpf,
  formatDate,
  formatKm,
} from '../../utils/formatters';

export const DriversView: React.FC = () => {
  const { driversStats, deleteDriver, selectedDriverIdForDetail, setSelectedDriverIdForDetail } =
    useTransport();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);

  const filteredStats = driversStats.filter((item) => {
    const d = item.driver;
    if (filterType !== 'all' && d.driverType !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        d.name.toLowerCase().includes(q) ||
        d.cpf.includes(q) ||
        d.cnh.includes(q) ||
        d.phone.includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleOpenNew = () => {
    setDriverToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (d: Driver, e: React.MouseEvent) => {
    e.stopPropagation();
    setDriverToEdit(d);
    setModalOpen(true);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Deseja realmente excluir o motorista ${name}?`)) {
      deleteDriver(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Quadro de Motoristas & Operadores
          </h3>
          <p className="text-xs text-slate-500">
            Acompanhe o faturamento, viagens e validade de documentação de cada condutor
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
        >
          <Plus size={15} />
          <span>Cadastrar Motorista</span>
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
            placeholder="Buscar por nome, CPF ou CNH..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-blue-600"
          />
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-blue-600"
          >
            <option value="all">Todos os Vínculos</option>
            <option value="Funcionário">Funcionário (CLT)</option>
            <option value="Agregado">Agregado</option>
            <option value="Terceiro">Terceiro</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Nome do Motorista</th>
                <th className="py-3 px-3">CPF</th>
                <th className="py-3 px-3">CNH / Categoria</th>
                <th className="py-3 px-3">Validade CNH</th>
                <th className="py-3 px-3">Vínculo</th>
                <th className="py-3 px-3 text-right">Viagens</th>
                <th className="py-3 px-3 text-right">Faturamento Gerado</th>
                <th className="py-3 px-3 text-right">Despesas Relacionadas</th>
                <th className="py-3 px-3 text-right">Média / Viagem</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Nenhum motorista encontrado.
                  </td>
                </tr>
              ) : (
                filteredStats.map(({ driver, viagens, faturamento, despesas, faturamentoMedioViagem }) => {
                  const isExpiringSoon = driver.cnhExpiry <= '2026-11-30';

                  return (
                    <tr
                      key={driver.id}
                      onClick={() => setSelectedDriverIdForDetail(driver.id)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      title="Clique para ver o perfil completo do motorista"
                    >
                      {/* Nome */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {driver.name}
                          </span>
                          <ExternalLink size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{driver.phone || 'Sem telefone'}</span>
                          <span>·</span>
                          <span>{driver.branch}</span>
                        </div>
                      </td>

                      {/* CPF */}
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-700">
                        {formatCpf(driver.cpf)}
                      </td>

                      {/* CNH */}
                      <td className="py-3 px-3">
                        <span className="font-mono tabular-nums font-medium text-slate-800">
                          {driver.cnh}
                        </span>{' '}
                        <span className="font-mono font-bold text-blue-700 ml-1">
                          (Cat. {driver.cnhCategory})
                        </span>
                      </td>

                      {/* Validade */}
                      <td className="py-3 px-3 font-mono tabular-nums">
                        {isExpiringSoon ? (
                          <span className="text-rose-600 font-semibold flex items-center gap-1">
                            <AlertTriangle size={12} />
                            {formatDate(driver.cnhExpiry)}
                          </span>
                        ) : (
                          <span className="text-slate-700">{formatDate(driver.cnhExpiry)}</span>
                        )}
                      </td>

                      {/* Vínculo */}
                      <td className="py-3 px-3">
                        <span className="text-slate-700 font-medium">{driver.driverType}</span>
                      </td>

                      {/* Viagens */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-slate-800">
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

                      {/* Média */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {formatCurrency(faturamentoMedioViagem)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => handleEdit(driver, e)}
                            title="Editar cadastro"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(driver.id, driver.name, e)}
                            title="Excluir motorista"
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

      {/* Modals */}
      <DriverModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        driverToEdit={driverToEdit}
      />

      <DriverDetailModal
        driverId={selectedDriverIdForDetail}
        onClose={() => setSelectedDriverIdForDetail(null)}
      />
    </div>
  );
};
