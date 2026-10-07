import React, { useState, useEffect } from 'react';
import { X, Truck } from 'lucide-react';
import { VehicleTypeModel, VehicleTypeCategory, CommonStatus } from '../../types';
import { useTransport } from '../../context/TransportContext';

interface VehicleTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  typeToEdit?: VehicleTypeModel | null;
}

const CATEGORIES: VehicleTypeCategory[] = [
  'Leve',
  'Médio',
  'Semipesado',
  'Pesado',
  'Extrapesado',
];

export const VehicleTypeModal: React.FC<VehicleTypeModalProps> = ({
  isOpen,
  onClose,
  typeToEdit,
}) => {
  const { addVehicleType, updateVehicleType } = useTransport();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<VehicleTypeCategory>('Pesado');
  const [description, setDescription] = useState('');
  const [payloadCapacity, setPayloadCapacity] = useState('');
  const [axlesCount, setAxlesCount] = useState<number>(3);
  const [status, setStatus] = useState<CommonStatus>('Ativo');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (typeToEdit) {
      setName(typeToEdit.name);
      setCategory(typeToEdit.category);
      setDescription(typeToEdit.description || '');
      setPayloadCapacity(typeToEdit.payloadCapacity || '');
      setAxlesCount(typeToEdit.axlesCount || 2);
      setStatus(typeToEdit.status);
      setNotes(typeToEdit.notes || '');
    } else {
      setName('');
      setCategory('Pesado');
      setDescription('');
      setPayloadCapacity('14 ton');
      setAxlesCount(3);
      setStatus('Ativo');
      setNotes('');
    }
  }, [typeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome do tipo de carro.');
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      description: description.trim(),
      payloadCapacity: payloadCapacity.trim(),
      axlesCount: Number(axlesCount) || 2,
      status,
      notes: notes.trim(),
    };

    if (typeToEdit) {
      updateVehicleType(typeToEdit.id, payload);
    } else {
      addVehicleType(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Truck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {typeToEdit ? 'Editar Tipo de Carro' : 'Cadastrar Tipo de Carro'}
              </h2>
              <p className="text-xs text-slate-500">
                Classificação da frota para regras de frete e capacidade
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Tipo de Carro *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Truck, Carreta, Bitruck, VUC"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-blue-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VehicleTypeCategory)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Capacidade de Carga (Ton / KG)
              </label>
              <input
                type="text"
                placeholder="Ex: 14 ton, 32 ton, 3.500 kg"
                value={payloadCapacity}
                onChange={(e) => setPayloadCapacity(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Qtd de Eixos
              </label>
              <input
                type="number"
                min="2"
                max="11"
                value={axlesCount}
                onChange={(e) => setAxlesCount(Number(e.target.value) || 2)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição do Veículo
            </label>
            <input
              type="text"
              placeholder="Ex: Caminhão rígido 6x2 com carroceria aberta ou baú"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CommonStatus)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
              >
                <option value="Ativo">Ativo (Habilitado para fretes)</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações
              </label>
              <input
                type="text"
                placeholder="Ex: Restrições de tráfego, balança"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-xs"
            >
              {typeToEdit ? 'Salvar Alterações' : 'Cadastrar Tipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
