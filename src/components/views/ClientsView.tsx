import React, { useMemo, useState } from 'react';
import { Briefcase, Plus, Search, Edit2, UserCheck, UserX, Compass, Power } from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { ClientModel } from '../../types';
import { ClientModal } from '../modals/ClientModal';
import { MetricCard } from '../common/MetricCard';

export const ClientsView: React.FC = () => {
  const { clients, routes, toggleClientStatus } = useTransport();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientModel | null>(null);

  const routesByClient = useMemo(() => {
    const counts = new Map<string, number>();
    routes.forEach((r) => {
      if (r.clientId) counts.set(r.clientId, (counts.get(r.clientId) || 0) + 1);
    });
    return counts;
  }, [routes]);

  const filteredClients = clients.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      const match =
        c.name.toLowerCase().includes(q) ||
        c.document.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (qDigits !== '' && (c.document.replace(/\D/g, '').includes(qDigits) || c.phone.replace(/\D/g, '').includes(qDigits)));
      if (!match) return false;
    }
    return true;
  });

  const handleOpenNew = () => {
    setClientToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (c: ClientModel) => {
    setClientToEdit(c);
    setModalOpen(true);
  };

  const handleToggleStatus = (c: ClientModel) => {
    if (
      c.status === 'Ativo' &&
      !window.confirm(
        `Deseja inativar o cliente "${c.name}"? Ele deixará de aparecer para novas rotas. As rotas já vinculadas não são alteradas.`
      )
    ) {
      return;
    }
    toggleClientStatus(c.id).catch(() => undefined);
  };

  const activeCount = clients.filter((c) => c.status === 'Ativo').length;
  const inactiveCount = clients.length - activeCount;
  const linkedRoutesCount = routes.filter((r) => r.clientId).length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-600" />
            Cadastro de Clientes
          </h3>
          <p className="text-xs text-slate-500">Gerencie os clientes atendidos pela transportadora.</p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
        >
          <Plus size={15} />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard
          label="Clientes Ativos"
          value={`${activeCount}`}
          subLabel={`de ${clients.length} cadastrados`}
          variant="primary"
          icon={UserCheck}
        />
        <MetricCard label="Clientes Inativos" value={`${inactiveCount}`} subLabel="fora de novas rotas" icon={UserX} />
        <MetricCard
          label="Rotas Vinculadas"
          value={`${linkedRoutesCount}`}
          subLabel={`de ${routes.length} rotas cadastradas`}
          icon={Compass}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, documento, telefone ou e-mail..."
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
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* Table of Clients */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Nome / Razão Social</th>
                <th className="py-3 px-3">Documento / CNPJ</th>
                <th className="py-3 px-3">Telefone</th>
                <th className="py-3 px-3">E-mail</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {clients.length === 0
                      ? 'Nenhum cliente cadastrado. Clique em "Novo Cliente" para cadastrar o primeiro.'
                      : 'Nenhum cliente encontrado com estes critérios.'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((c) => {
                  const linkedRoutes = routesByClient.get(c.id) || 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      {/* Nome */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                        <span className="text-[11px] text-slate-400">
                          {linkedRoutes === 0
                            ? 'Nenhuma rota vinculada'
                            : `${linkedRoutes} rota${linkedRoutes > 1 ? 's' : ''} vinculada${linkedRoutes > 1 ? 's' : ''}`}
                        </span>
                      </td>

                      {/* Documento */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">{c.document || '-'}</td>

                      {/* Telefone */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">{c.phone || '-'}</td>

                      {/* E-mail */}
                      <td className="py-3 px-3 text-slate-700">{c.email || '-'}</td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            c.status === 'Ativo' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${c.status === 'Ativo' ? 'bg-emerald-600' : 'bg-slate-400'}`}
                          />
                          {c.status}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(c)}
                            title="Editar cliente"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(c)}
                            title={c.status === 'Ativo' ? 'Inativar cliente' : 'Ativar cliente'}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                              c.status === 'Ativo'
                                ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            <Power size={12} />
                            {c.status === 'Ativo' ? 'Inativar' : 'Ativar'}
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

      <ClientModal isOpen={modalOpen} onClose={() => setModalOpen(false)} clientToEdit={clientToEdit} />
    </div>
  );
};
