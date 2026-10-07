import React, { useMemo, useState } from 'react';
import { Layers, Plus, Search, Edit2, Power, CheckCircle2, XCircle, AlertCircle, Unlink } from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { BlockModel } from '../../types';
import { BlockModal } from '../modals/BlockModal';
import { MetricCard } from '../common/MetricCard';
import { findBlockWithSameName, normalizeBlockKey } from '../../utils/blocks';

export const BlocksView: React.FC = () => {
  const { blocks, activeBlocks, blocksError, routes, toggleBlockStatus } = useTransport();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<BlockModel | null>(null);

  const routesByBlock = useMemo(() => {
    const counts = new Map<string, number>();
    routes.forEach((r) => {
      if (r.blockId) counts.set(r.blockId, (counts.get(r.blockId) || 0) + 1);
    });
    return counts;
  }, [routes]);

  const filteredBlocks = blocks.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search) {
      const q = normalizeBlockKey(search);
      if (!normalizeBlockKey(b.name).includes(q) && !normalizeBlockKey(b.code || '').includes(q)) return false;
    }
    return true;
  });

  const handleOpenNew = () => {
    setBlockToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (b: BlockModel) => {
    setBlockToEdit(b);
    setModalOpen(true);
  };

  const handleToggleStatus = (b: BlockModel) => {
    if (b.status === 'Ativo') {
      if (
        !window.confirm(
          `Deseja inativar o bloco "${b.name}"? Ele deixará de aparecer para novas rotas e na importação. As rotas já vinculadas não são alteradas.`
        )
      ) {
        return;
      }
    } else {
      const activeTwin = findBlockWithSameName(activeBlocks, b.name, b.id);
      if (activeTwin) {
        alert(`Não é possível ativar: já existe o bloco ativo "${activeTwin.name}" com o mesmo nome.`);
        return;
      }
    }
    toggleBlockStatus(b.id).catch(() => undefined);
  };

  const inactiveCount = blocks.length - activeBlocks.length;
  const unlinkedRoutesCount = routes.filter((r) => !r.blockId).length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" />
            Cadastro de Blocos
          </h3>
          <p className="text-xs text-slate-500">
            Somente blocos ativos cadastrados aqui podem ser usados nas rotas (cadastro manual e importação).
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-xs"
        >
          <Plus size={15} />
          <span>+ Novo Bloco</span>
        </button>
      </div>

      {blocksError && (
        <div className="p-3 rounded-md text-xs border flex items-start gap-2 bg-amber-50 border-amber-200 text-amber-800">
          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <span>Não foi possível carregar os blocos: {blocksError}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard
          label="Blocos Ativos"
          value={`${activeBlocks.length}`}
          subLabel={`de ${blocks.length} cadastrados`}
          variant="primary"
          icon={CheckCircle2}
        />
        <MetricCard label="Blocos Inativos" value={`${inactiveCount}`} subLabel="fora de novas rotas" icon={XCircle} />
        <MetricCard
          label="Rotas sem Bloco Vinculado"
          value={`${unlinkedRoutesCount}`}
          subLabel={`de ${routes.length} rotas (texto antigo)`}
          icon={Unlink}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código ou nome do bloco..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-indigo-600"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-indigo-600"
          >
            <option value="all">Todos os Status</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* Table of Blocks */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-32">Código</th>
                <th className="py-3 px-3">Bloco</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBlocks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    {blocks.length === 0
                      ? 'Nenhum bloco cadastrado. Clique em "+ Novo Bloco" para cadastrar o primeiro.'
                      : 'Nenhum bloco encontrado com estes critérios.'}
                  </td>
                </tr>
              ) : (
                filteredBlocks.map((b) => {
                  const linkedRoutes = routesByBlock.get(b.id) || 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      {/* Código */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{b.code || '-'}</td>

                      {/* Bloco */}
                      <td className="py-3 px-3">
                        <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {b.name}
                        </span>
                        <span className="ml-2 text-[11px] text-slate-400">
                          {linkedRoutes === 0
                            ? 'Nenhuma rota vinculada'
                            : `${linkedRoutes} rota${linkedRoutes > 1 ? 's' : ''} vinculada${linkedRoutes > 1 ? 's' : ''}`}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            b.status === 'Ativo' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${b.status === 'Ativo' ? 'bg-emerald-600' : 'bg-slate-400'}`}
                          />
                          {b.status}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(b)}
                            title="Editar bloco"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(b)}
                            title={b.status === 'Ativo' ? 'Inativar bloco' : 'Ativar bloco'}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                              b.status === 'Ativo'
                                ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            <Power size={12} />
                            {b.status === 'Ativo' ? 'Inativar' : 'Ativar'}
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

      <BlockModal isOpen={modalOpen} onClose={() => setModalOpen(false)} blockToEdit={blockToEdit} />
    </div>
  );
};
