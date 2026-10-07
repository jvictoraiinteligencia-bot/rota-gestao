import React, { useState, useEffect } from 'react';
import { X, Briefcase, AlertCircle } from 'lucide-react';
import { ClientModel, CommonStatus } from '../../types';
import { useTransport } from '../../context/TransportContext';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: ClientModel | null;
}

const normalizeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, clientToEdit }) => {
  const { addClient, updateClient, clients } = useTransport();

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<CommonStatus>('Ativo');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clientToEdit) {
      setName(clientToEdit.name);
      setDocument(clientToEdit.document || '');
      setPhone(clientToEdit.phone || '');
      setEmail(clientToEdit.email || '');
      setStatus(clientToEdit.status);
    } else {
      setName('');
      setDocument('');
      setPhone('');
      setEmail('');
      setStatus('Ativo');
    }
    setSaving(false);
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const normalizedName = normalizeName(name);
  const sameNameCount = normalizedName
    ? clients.filter((c) => c.id !== clientToEdit?.id && normalizeName(c.name) === normalizedName).length
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Preencha o campo obrigatório (Nome / Razão Social).');
      return;
    }

    const payload = {
      name: name.replace(/\s+/g, ' ').trim(),
      document: document.trim(),
      phone: phone.trim(),
      email: email.trim(),
      status,
    };

    setSaving(true);
    try {
      if (clientToEdit) {
        await updateClient(clientToEdit.id, payload);
      } else {
        await addClient(payload);
      }
      onClose();
    } catch {
      // error already reported by the context; keep the form open for correction
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Briefcase size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {clientToEdit ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
              </h2>
              <p className="text-xs text-slate-500">Dados cadastrais do cliente atendido pela transportadora</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome / Razão Social *</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Razão social ou nome do cliente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-blue-600 font-semibold"
            />
            {sameNameCount > 0 && (
              <div className="mt-1.5 p-2 rounded-md text-[11px] border flex items-start gap-1.5 bg-amber-50 border-amber-200 text-amber-800">
                <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Já existe {sameNameCount === 1 ? 'outro cliente' : `${sameNameCount} clientes`} com este nome. O
                  cadastro é permitido, mas a importação de rotas por nome acusará ambiguidade para este cliente.
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Documento / CNPJ</label>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone</label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-800 focus:outline-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                placeholder="contato@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CommonStatus)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
              >
                <option value="Ativo">Ativo (Disponível para novas rotas)</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
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
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-xs"
            >
              {saving ? 'Salvando...' : clientToEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
