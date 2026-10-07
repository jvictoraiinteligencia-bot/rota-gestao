import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import { Branch, BranchStatus } from '../../types';
import { useTransport } from '../../context/TransportContext';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchToEdit?: Branch | null;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const BranchModal: React.FC<BranchModalProps> = ({
  isOpen,
  onClose,
  branchToEdit,
}) => {
  const { addBranch, updateBranch } = useTransport();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [manager, setManager] = useState('');
  const [status, setStatus] = useState<BranchStatus>('Ativa');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (branchToEdit) {
      setName(branchToEdit.name);
      setCode(branchToEdit.code || '');
      setCnpj(branchToEdit.cnpj || '');
      setCity(branchToEdit.city || '');
      setState(branchToEdit.state || 'SP');
      setAddress(branchToEdit.address || '');
      setPhone(branchToEdit.phone || '');
      setManager(branchToEdit.manager || '');
      setStatus(branchToEdit.status);
      setNotes(branchToEdit.notes || '');
    } else {
      setName('');
      setCode(`FIL-${Math.floor(Math.random() * 90 + 10)}`);
      setCnpj('');
      setCity('');
      setState('SP');
      setAddress('');
      setPhone('');
      setManager('');
      setStatus('Ativa');
      setNotes('');
    }
  }, [branchToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim() || !manager.trim()) {
      alert('Preencha os campos obrigatórios (Nome da Filial, Cidade e Responsável/Gerente).');
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim() || 'FIL-00',
      cnpj: cnpj.trim(),
      city: city.trim(),
      state,
      address: address.trim(),
      phone: phone.trim(),
      manager: manager.trim(),
      status,
      notes: notes.trim(),
    };

    if (branchToEdit) {
      updateBranch(branchToEdit.id, payload);
    } else {
      addBranch(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {branchToEdit ? 'Editar Filial Responsável' : 'Cadastrar Nova Filial'}
              </h2>
              <p className="text-xs text-slate-500">
                Unidade operacional da transportadora com centro de custos
              </p>
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome da Filial / Unidade *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Filial Campinas, Matriz São Paulo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código Interno
              </label>
              <input
                type="text"
                placeholder="Ex: FIL-05"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono uppercase text-slate-800 focus:outline-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CNPJ da Unidade
              </label>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responsável / Gerente Operacional *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Marcos Aurélio de Souza"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cidade *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Campinas, Curitiba, Santos"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UF / Estado *
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-semibold"
              >
                {BRAZILIAN_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Endereço / Logradouro
              </label>
              <input
                type="text"
                placeholder="Ex: Rodovia Anhanguera, Km 98 - Galpão 03"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / Contato Operacional
              </label>
              <input
                type="text"
                placeholder="(19) 3890-4400"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-800 focus:outline-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status da Filial
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BranchStatus)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
            >
              <option value="Ativa">Ativa (Operando normalmente)</option>
              <option value="Inativa">Inativa (Fechada ou em transição)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações Operacionais
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Pátio com capacidade para 25 carretas, balança rodoviária própria..."
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
              {branchToEdit ? 'Salvar Alterações' : 'Cadastrar Filial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
