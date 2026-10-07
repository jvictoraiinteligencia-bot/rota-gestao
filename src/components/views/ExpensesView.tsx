import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  Filter,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { Expense, ExpenseCategory } from '../../types';
import { ExpenseModal } from '../modals/ExpenseModal';
import { INITIAL_EXPENSE_CATEGORIES } from '../../data/initialData';
import {
  formatCurrency,
  formatDate,
  formatKm,
  downloadCSV,
} from '../../utils/formatters';

export const ExpensesView: React.FC = () => {
  const { expenses, deleteExpense, navigateToVehicleAnalysis } = useTransport();

  const [search, setSearch] = useState('');
  const [filterPlate, setFilterPlate] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  // Filter options
  const plates = Array.from(new Set(expenses.map((e) => e.plate))).sort();
  const suppliers = Array.from(new Set(expenses.map((e) => e.supplier))).sort();

  const filteredExpenses = expenses.filter((e) => {
    if (filterPlate !== 'all' && e.plate !== filterPlate) return false;
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterSupplier !== 'all' && e.supplier !== filterSupplier) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        e.plate.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.supplier.toLowerCase().includes(q) ||
        (e.driverName && e.driverName.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleOpenNew = () => {
    setExpenseToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (e: Expense) => {
    setExpenseToEdit(e);
    setModalOpen(true);
  };

  const handleDelete = (id: string, desc: string) => {
    if (window.confirm(`Deseja realmente excluir a despesa "${desc}"?`)) {
      deleteExpense(id);
    }
  };

  const totalFiltered = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const handleExportCSV = () => {
    const headers = [
      'Data',
      'Placa',
      'Tipo de Despesa',
      'Descrição',
      'Valor (R$)',
      'Fornecedor',
      'Motorista',
      'Odômetro (KM)',
      'Filial',
    ];
    const rows = filteredExpenses.map((e) => [
      e.date,
      e.plate,
      e.category,
      e.description,
      e.amount.toFixed(2),
      e.supplier,
      e.driverName || 'Geral',
      e.odometerKm || '',
      e.branch,
    ]);
    downloadCSV(
      `relatorio_despesas_${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Summary & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Total de Lançamentos</span>
            <span className="text-base font-bold text-slate-900 font-mono">
              {filteredExpenses.length} custos
            </span>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-slate-500 block">Total de Despesas</span>
            <span className="text-base font-bold text-rose-600 font-mono">
              {formatCurrency(totalFiltered)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>+ Lançar Despesa</span>
          </button>
        </div>
      </div>

      {/* Filter Row: Período, Placa, Tipo de despesa, Fornecedor */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por descrição, fornecedor, placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Placa */}
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

          {/* Categoria */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-blue-600 font-medium"
          >
            <option value="all">Todas as Categorias</option>
            {INITIAL_EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Fornecedor */}
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-blue-600 max-w-[180px] truncate"
          >
            <option value="all">Todos os Fornecedores</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-3">Placa</th>
                <th className="py-3 px-3">Tipo de Despesa</th>
                <th className="py-3 px-3">Descrição do Custo</th>
                <th className="py-3 px-3">Fornecedor / Posto</th>
                <th className="py-3 px-3">Motorista</th>
                <th className="py-3 px-3 text-right">Odômetro</th>
                <th className="py-3 px-3 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhuma despesa registrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    {/* Data */}
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {formatDate(exp.date)}
                    </td>

                    {/* Placa */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => navigateToVehicleAnalysis(exp.plate)}
                        className="font-mono font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                        title="Ver análise completa deste caminhão"
                      >
                        {exp.plate}
                      </button>
                    </td>

                    {/* Categoria */}
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">
                        {exp.category}
                      </span>
                    </td>

                    {/* Descrição */}
                    <td className="py-3 px-3 text-slate-800 font-medium max-w-xs truncate">
                      {exp.description}
                      {exp.notes && (
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {exp.notes}
                        </span>
                      )}
                    </td>

                    {/* Fornecedor */}
                    <td className="py-3 px-3 text-slate-700">{exp.supplier}</td>

                    {/* Motorista */}
                    <td className="py-3 px-3 text-slate-600">
                      {exp.driverName || <span className="text-slate-400 italic">Frota Geral</span>}
                    </td>

                    {/* Odômetro */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      {exp.odometerKm ? formatKm(exp.odometerKm) : '-'}
                    </td>

                    {/* Valor */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(exp)}
                          title="Editar lançamento de despesa"
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id, exp.description)}
                          title="Excluir despesa"
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

      {/* Modal */}
      <ExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        expenseToEdit={expenseToEdit}
      />
    </div>
  );
};
