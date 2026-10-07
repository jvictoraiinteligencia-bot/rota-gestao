import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Expense, ExpenseCategory } from '../../types';
import { useTransport } from '../../context/TransportContext';
import { INITIAL_EXPENSE_CATEGORIES, INITIAL_BRANCHES } from '../../data/initialData';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Expense | null;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
}) => {
  const { vehicles, drivers, branches, addExpense, updateExpense } = useTransport();

  const [date, setDate] = useState('2026-10-06');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Combustível');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [supplier, setSupplier] = useState('');
  const [odometerKm, setOdometerKm] = useState<number | ''>('');
  const [branch, setBranch] = useState(branches[0]?.name || 'Matriz São Paulo');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (expenseToEdit) {
      setDate(expenseToEdit.date);
      setVehicleId(expenseToEdit.vehicleId || '');
      setDriverId(expenseToEdit.driverId || '');
      setCategory(expenseToEdit.category);
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount);
      setSupplier(expenseToEdit.supplier);
      setOdometerKm(expenseToEdit.odometerKm ?? '');
      setBranch(expenseToEdit.branch || branches[0]?.name || 'Matriz São Paulo');
      setNotes(expenseToEdit.notes || '');
    } else {
      setDate('2026-10-06');
      setVehicleId(vehicles[0]?.id || '');
      setDriverId('');
      setCategory('Combustível');
      setDescription('');
      setAmount('');
      setSupplier('');
      setOdometerKm('');
      setBranch(branches[0]?.name || 'Matriz São Paulo');
      setNotes('');
    }
  }, [expenseToEdit, isOpen, vehicles, branches]);

  if (!isOpen) return null;

  const numAmount = typeof amount === 'number' ? amount : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !description || !numAmount || !supplier) {
      alert('Por favor, preencha a placa do veículo, descrição, valor e fornecedor.');
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
    const selectedDriver = drivers.find((d) => d.id === driverId);

    const payload = {
      date,
      vehicleId,
      plate: selectedVehicle ? selectedVehicle.plate : 'INDEFINIDO',
      driverId: driverId || undefined,
      driverName: selectedDriver ? selectedDriver.name : undefined,
      category,
      description,
      amount: numAmount,
      supplier,
      odometerKm: typeof odometerKm === 'number' ? odometerKm : undefined,
      branch,
      notes,
    };

    if (expenseToEdit) {
      updateExpense(expenseToEdit.id, payload);
    } else {
      addExpense(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {expenseToEdit ? 'Editar Despesa' : 'Lançar Nova Despesa'}
            </h2>
            <p className="text-xs text-slate-500">
              Controle de custos por veículo, categoria e fornecedor
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data do Pagamento / Lançamento *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Veículo (Placa) *
              </label>
              <select
                required
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-mono focus:outline-blue-600"
              >
                <option value="">Selecione o veículo...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.brandModel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Despesa (Categoria) *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
              >
                {INITIAL_EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motorista (Opcional)
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                <option value="">Sem motorista específico</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição do Custo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Abastecimento 320L Diesel S10, Troca de pastilha de freio"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-900 focus:outline-blue-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fornecedor / Posto / Oficina *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Rede Graal, Concessionária Scania, Sem Parar"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quilometragem do Odômetro (Opcional)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="Ex: 142300"
                value={odometerKm}
                onChange={(e) =>
                  setOdometerKm(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filial
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
              Observações Adicionais
            </label>
            <input
              type="text"
              placeholder="Ex: NF-e 88123, garantia de 6 meses"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-xs"
            >
              {expenseToEdit ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
