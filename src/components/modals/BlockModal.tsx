import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import { BlockModel, CommonStatus } from '../../types';
import { useTransport } from '../../context/TransportContext';
import { findBlockWithSameName, formatBlockName } from '../../utils/blocks';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockToEdit?: BlockModel | null;
}

export const BlockModal: React.FC<BlockModalProps> = ({ isOpen, onClose, blockToEdit }) => {
  const { addBlock, updateBlock, blocks } = useTransport();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<CommonStatus>('Ativo');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (blockToEdit) {
      setCode(blockToEdit.code || '');
      setName(blockToEdit.name);
      setStatus(blockToEdit.status);
    } else {
      setCode('');
      setName('');
      setStatus('Ativo');
    }
    setSaving(false);
  }, [blockToEdit, isOpen]);

  if (!isOpen) return null;

  const duplicate = findBlockWithSameName(blocks, name, blockToEdit?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedName = formatBlockName(name);
    if (!formattedName) {
      alert('Preencha o campo obrigatório (Nome do Bloco).');
      return;
    }
    if (duplicate) {
      alert(`Bloco duplicado: já existe o bloco "${duplicate.name}" (${duplicate.status}).`);
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      name: formattedName,
      status,
    };

    setSaving(true);
    try {
      if (blockToEdit) {
        await updateBlock(blockToEdit.id, payload);
      } else {
        await addBlock(payload);
      }
      onClose();
    } catch {
      // error already reported by the context; keep the form open for correction
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {blockToEdit ? 'Editar Bloco' : 'Cadastrar Novo Bloco'}
              </h2>
              <p className="text-xs text-slate-500">Bloco operacional utilizado no cadastro de rotas</p>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Código</label>
            <input
              type="text"
              placeholder="Ex: B01"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono uppercase text-slate-900 focus:outline-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Bloco *</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: SECOS, FRIOS, HORTIFRUTI"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 uppercase text-slate-900 focus:outline-indigo-600 font-semibold"
            />
            {duplicate && (
              <div className="mt-1.5 p-2 rounded-md text-[11px] border flex items-start gap-1.5 bg-rose-50 border-rose-200 text-rose-800">
                <AlertCircle size={13} className="text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Já existe o bloco "{duplicate.name}" ({duplicate.status}). Maiúsculas, acentos e espaços extras são
                  ignorados na comparação.
                  {duplicate.status === 'Inativo' && ' Reative o bloco existente em vez de cadastrar outro.'}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CommonStatus)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-indigo-600 font-medium"
            >
              <option value="Ativo">Ativo (Disponível para novas rotas)</option>
              <option value="Inativo">Inativo</option>
            </select>
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
              disabled={saving || Boolean(duplicate)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors shadow-xs"
            >
              {saving ? 'Salvando...' : blockToEdit ? 'Salvar Alterações' : 'Cadastrar Bloco'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
