import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Driver, DriverType, DriverStatus, CnhCategory } from '../../types';
import { useTransport } from '../../context/TransportContext';
import { INITIAL_BRANCHES } from '../../data/initialData';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverToEdit?: Driver | null;
}

export const DriverModal: React.FC<DriverModalProps> = ({
  isOpen,
  onClose,
  driverToEdit,
}) => {
  const { addDriver, updateDriver, branches } = useTransport();

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [cnh, setCnh] = useState('');
  const [cnhCategory, setCnhCategory] = useState<CnhCategory>('E');
  const [cnhExpiry, setCnhExpiry] = useState('2028-01-01');
  const [driverType, setDriverType] = useState<DriverType>('Funcionário');
  const [branch, setBranch] = useState(branches[0]?.name || 'Matriz São Paulo');
  const [status, setStatus] = useState<DriverStatus>('Ativo');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (driverToEdit) {
      setName(driverToEdit.name);
      setCpf(driverToEdit.cpf);
      setPhone(driverToEdit.phone);
      setCnh(driverToEdit.cnh);
      setCnhCategory(driverToEdit.cnhCategory);
      setCnhExpiry(driverToEdit.cnhExpiry);
      setDriverType(driverToEdit.driverType);
      setBranch(driverToEdit.branch);
      setStatus(driverToEdit.status);
      setNotes(driverToEdit.notes || '');
    } else {
      setName('');
      setCpf('');
      setPhone('');
      setCnh('');
      setCnhCategory('E');
      setCnhExpiry('2028-06-30');
      setDriverType('Funcionário');
      setBranch(branches[0]?.name || 'Matriz São Paulo');
      setStatus('Ativo');
      setNotes('');
    }
  }, [driverToEdit, isOpen, branches]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cpf.trim() || !cnh.trim()) {
      alert('Preencha os campos obrigatórios (Nome, CPF e CNH).');
      return;
    }

    const payload = {
      name,
      cpf,
      phone,
      cnh,
      cnhCategory,
      cnhExpiry,
      driverType,
      branch,
      status,
      notes,
    };

    if (driverToEdit) {
      updateDriver(driverToEdit.id, payload);
    } else {
      addDriver(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {driverToEdit ? 'Editar Motorista' : 'Cadastrar Novo Motorista'}
            </h2>
            <p className="text-xs text-slate-500">
              Controle de habilitação, categorias e vínculo de condutores
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome Completo do Motorista *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Eduardo Mendes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CPF *
              </label>
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-800 focus:outline-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número da CNH *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 04892184910"
                value={cnh}
                onChange={(e) => setCnh(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria CNH *
              </label>
              <select
                value={cnhCategory}
                onChange={(e) => setCnhCategory(e.target.value as CnhCategory)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono font-bold text-slate-800 focus:outline-blue-600"
              >
                <option value="E">E (Carretas/Bitrem)</option>
                <option value="D">D (Ônibus/Truck)</option>
                <option value="C">C (Caminhões)</option>
                <option value="B">B (Vans/Leves)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Validade da CNH *
              </label>
              <input
                type="date"
                required
                value={cnhExpiry}
                onChange={(e) => setCnhExpiry(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Vínculo *
              </label>
              <select
                value={driverType}
                onChange={(e) => setDriverType(e.target.value as DriverType)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                <option value="Funcionário">Funcionário (CLT)</option>
                <option value="Agregado">Agregado</option>
                <option value="Terceiro">Terceiro (Autônomo)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DriverStatus)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo / Férias</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Treinamento MOPP atualizado, exame toxicológico em dia..."
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-xs"
            >
              {driverToEdit ? 'Salvar Motorista' : 'Cadastrar Motorista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
