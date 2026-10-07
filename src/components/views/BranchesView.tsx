import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Truck,
  Users,
  Navigation,
  DollarSign,
  TrendingUp,
  MapPin,
  Phone,
  UserCheck,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { Branch } from '../../types';
import { BranchModal } from '../modals/BranchModal';
import { MetricCard } from '../common/MetricCard';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCnpj,
  formatKm,
} from '../../utils/formatters';

export const BranchesView: React.FC = () => {
  const { branchesStats, deleteBranch, setActiveView, setFilter } = useTransport();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null);

  const filteredBranches = branchesStats.filter(({ branch }) => {
    if (statusFilter !== 'all' && branch.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        branch.name.toLowerCase().includes(q) ||
        branch.city.toLowerCase().includes(q) ||
        branch.state.toLowerCase().includes(q) ||
        branch.manager.toLowerCase().includes(q) ||
        (branch.code && branch.code.toLowerCase().includes(q)) ||
        (branch.cnpj && branch.cnpj.includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleOpenNew = () => {
    setBranchToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (b: Branch, e: React.MouseEvent) => {
    e.stopPropagation();
    setBranchToEdit(b);
    setModalOpen(true);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Deseja realmente excluir a filial "${name}"? Os lançamentos associados permanecerão no histórico.`)) {
      deleteBranch(id);
    }
  };

  const handleFilterByBranch = (branchName: string) => {
    setFilter((prev) => ({ ...prev, branch: branchName }));
    setActiveView('dashboard');
  };

  // Aggregations
  const totalVeiculos = branchesStats.reduce((acc, s) => acc + s.veiculosCount, 0);
  const totalFaturamento = branchesStats.reduce((acc, s) => acc + s.faturamento, 0);
  const totalLucro = branchesStats.reduce((acc, s) => acc + s.lucro, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={18} className="text-blue-600" />
            Cadastro & Controle de Filiais Responsáveis
          </h3>
          <p className="text-xs text-slate-500">
            Gerencie as unidades da transportadora, gerentes responsáveis e centros de custos
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
        >
          <Plus size={15} />
          <span>Cadastrar Nova Filial</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Filiais Ativas"
          value={`${branchesStats.filter((b) => b.branch.status === 'Ativa').length}`}
          subLabel={`de ${branchesStats.length} unidades`}
          icon={Building2}
        />

        <MetricCard
          label="Frota Alocada"
          value={`${totalVeiculos}`}
          subLabel="veículos distribuídos"
          icon={Truck}
        />

        <MetricCard
          label="Faturamento Geral"
          value={formatCurrency(totalFaturamento)}
          subLabel="receita das filiais"
          variant="primary"
          icon={DollarSign}
        />

        <MetricCard
          label="Lucro Consolidado"
          value={formatCurrency(totalLucro)}
          subLabel="resultado líquido"
          trend={totalLucro >= 0 ? 'positive' : 'negative'}
          variant={totalLucro >= 0 ? 'success' : 'danger'}
          icon={TrendingUp}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por filial, cidade, UF, gerente responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-blue-600"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-blue-600"
          >
            <option value="all">Todos os Status</option>
            <option value="Ativa">Ativa</option>
            <option value="Inativa">Inativa</option>
          </select>
        </div>
      </div>

      {/* Table of Branches */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Filial / Código</th>
                <th className="py-3 px-3">Localização</th>
                <th className="py-3 px-3">Responsável / Gerente</th>
                <th className="py-3 px-3">Contato / CNPJ</th>
                <th className="py-3 px-3 text-center">Veículos</th>
                <th className="py-3 px-3 text-center">Motoristas</th>
                <th className="py-3 px-3 text-right">Viagens</th>
                <th className="py-3 px-3 text-right">Faturamento</th>
                <th className="py-3 px-3 text-right">Lucro Líquido</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Nenhuma filial encontrada com estes critérios.
                  </td>
                </tr>
              ) : (
                filteredBranches.map(
                  ({
                    branch,
                    veiculosCount,
                    motoristasCount,
                    viagensCount,
                    faturamento,
                    lucro,
                    margem,
                  }) => {
                    const isPositive = lucro >= 0;

                    return (
                      <tr
                        key={branch.id}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        {/* Nome & Código */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {branch.name}
                            </span>
                            {branch.code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                {branch.code}
                              </span>
                            )}
                          </div>
                          {branch.notes && (
                            <span className="text-[11px] text-slate-400 line-clamp-1">
                              {branch.notes}
                            </span>
                          )}
                        </td>

                        {/* Localização */}
                        <td className="py-3 px-3 text-slate-700">
                          <div className="font-medium text-slate-900 flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            {branch.city} - {branch.state}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                            {branch.address || 'Sem endereço'}
                          </div>
                        </td>

                        {/* Gerente / Responsável */}
                        <td className="py-3 px-3 text-slate-800 font-medium">
                          <div className="flex items-center gap-1.5">
                            <UserCheck size={13} className="text-blue-600" />
                            <span>{branch.manager}</span>
                          </div>
                        </td>

                        {/* Contato & CNPJ */}
                        <td className="py-3 px-3 text-slate-600">
                          <div className="font-mono text-[11px]">
                            {branch.phone || '-'}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {branch.cnpj ? formatCnpj(branch.cnpj) : '-'}
                          </div>
                        </td>

                        {/* Veículos Alocados */}
                        <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold text-slate-800">
                          {veiculosCount}
                        </td>

                        {/* Motoristas */}
                        <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold text-slate-800">
                          {motoristasCount}
                        </td>

                        {/* Viagens */}
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                          {viagensCount}
                        </td>

                        {/* Faturamento */}
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-blue-700">
                          {formatCurrency(faturamento)}
                        </td>

                        {/* Lucro Líquido & Margem */}
                        <td
                          className={`py-3 px-3 text-right font-mono tabular-nums font-bold ${
                            isPositive ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          <div>{formatCurrency(lucro)}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {formatPercent(margem)} margem
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 font-medium text-[11px] ${
                              branch.status === 'Ativa'
                                ? 'text-emerald-700'
                                : 'text-slate-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                branch.status === 'Ativa'
                                  ? 'bg-emerald-600'
                                  : 'bg-slate-300'
                              }`}
                            />
                            {branch.status}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleFilterByBranch(branch.name)}
                              title="Filtrar Dashboard por esta Filial"
                              className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            >
                              Filtrar
                            </button>
                            <button
                              onClick={(e) => handleEdit(branch, e)}
                              title="Editar Filial"
                              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(branch.id, branch.name, e)}
                              title="Excluir Filial"
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <BranchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        branchToEdit={branchToEdit}
      />
    </div>
  );
};
