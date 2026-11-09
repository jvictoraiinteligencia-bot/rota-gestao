import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FinancingInstallment, FinancingVehicleLink, VehicleFinancing } from '../types';
import { getSupabase } from '../lib/supabase';
import { useTransport } from './TransportContext';
import { allocateFinancingInstallments, InstallmentAllocation } from '../utils/financingAllocation';
import {
  endFinancingVehicleOnline,
  generateFinancingInstallmentsOnline,
  getFinancingInstallmentsOnline,
  getFinancingVehiclesOnline,
  getFinancingsOnline,
  insertFinancingOnline,
  insertFinancingVehicleOnline,
  updateFinancingOnline,
} from '../services/financingService';

// Contexto separado do TransportContext: uma falha nas tabelas de financiamento
// não interrompe o carregamento do restante do sistema.

export interface NewFinancingLink {
  vehicleId: string;
  startDate: string;
}

interface FinancingContextType {
  financings: VehicleFinancing[];
  financingVehicles: FinancingVehicleLink[];
  installments: FinancingInstallment[];
  /** Rateio por KM de cada parcela cobrável, recalculado quando viagens, vínculos ou parcelas mudam. */
  allocations: InstallmentAllocation[];
  isLoadingFinancing: boolean;
  financingError: string | null;
  reloadFinancing: () => Promise<void>;
  /** Cria o contrato e, em seguida, os vínculos. Vínculos que falharem são informados e o contrato é mantido. */
  addFinancing: (
    data: Omit<VehicleFinancing, 'id' | 'createdAt' | 'updatedAt'>,
    links: NewFinancingLink[]
  ) => Promise<VehicleFinancing>;
  updateFinancing: (id: string, data: Partial<VehicleFinancing>) => Promise<void>;
  addFinancingVehicle: (financingId: string, link: NewFinancingLink) => Promise<void>;
  endFinancingVehicle: (linkId: string, endDate: string) => Promise<void>;
  generateInstallments: (financingId: string) => Promise<number>;
}

const FinancingContext = createContext<FinancingContextType | undefined>(undefined);

const ensureOnline = () => {
  if (!getSupabase()) {
    throw new Error('O módulo de financiamentos exige conexão com o Supabase.');
  }
};

export const FinancingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnlineConnected, trips } = useTransport();

  const [financings, setFinancings] = useState<VehicleFinancing[]>([]);
  const [financingVehicles, setFinancingVehicles] = useState<FinancingVehicleLink[]>([]);
  const [installments, setInstallments] = useState<FinancingInstallment[]>([]);
  const [isLoadingFinancing, setIsLoadingFinancing] = useState(false);
  const [financingError, setFinancingError] = useState<string | null>(null);

  const reloadFinancing = useCallback(async () => {
    if (!getSupabase()) return;
    setIsLoadingFinancing(true);
    try {
      const [contracts, links, parcelas] = await Promise.all([
        getFinancingsOnline(),
        getFinancingVehiclesOnline(),
        getFinancingInstallmentsOnline(),
      ]);
      setFinancings(contracts);
      setFinancingVehicles(links);
      setInstallments(parcelas);
      setFinancingError(null);
    } catch (err: any) {
      console.warn('Erro ao carregar financiamentos do Supabase:', err);
      setFinancingError(err?.message || String(err));
    } finally {
      setIsLoadingFinancing(false);
    }
  }, []);

  useEffect(() => {
    if (isOnlineConnected) reloadFinancing();
  }, [isOnlineConnected, reloadFinancing]);

  // Viagens chegam do TransportContext (com realtime próprio); vínculos e parcelas, deste contexto.
  const allocations = useMemo(
    () => allocateFinancingInstallments({ financings, links: financingVehicles, installments, trips }),
    [financings, financingVehicles, installments, trips]
  );

  // Realtime: recarrega apenas a tabela alterada
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !isOnlineConnected) return;

    const reloadSafely = async (load: () => Promise<void>) => {
      try {
        await load();
      } catch (err) {
        console.warn('Erro ao atualizar financiamentos em tempo real:', err);
      }
    };

    try {
      const channel = supabase
        .channel('rotagestao_financiamentos_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'financiamentos' }, () =>
          reloadSafely(async () => setFinancings(await getFinancingsOnline()))
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'financiamento_veiculos' }, () =>
          reloadSafely(async () => setFinancingVehicles(await getFinancingVehiclesOnline()))
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'financiamento_parcelas' }, () =>
          reloadSafely(async () => setInstallments(await getFinancingInstallmentsOnline()))
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime de financiamentos indisponível:', err);
    }
  }, [isOnlineConnected]);

  const upsertLink = (saved: FinancingVehicleLink) =>
    setFinancingVehicles((prev) =>
      prev.some((l) => l.id === saved.id) ? prev.map((l) => (l.id === saved.id ? saved : l)) : [...prev, saved]
    );

  const addFinancing: FinancingContextType['addFinancing'] = async (data, links) => {
    let created: VehicleFinancing;
    try {
      ensureOnline();
      created = await insertFinancingOnline(data);
      setFinancings((prev) => [created, ...prev.filter((f) => f.id !== created.id)]);
    } catch (err: any) {
      alert(`Não foi possível salvar o financiamento: ${err.message || err}`);
      throw err;
    }

    const failures: string[] = [];
    for (const link of links) {
      try {
        upsertLink(await insertFinancingVehicleOnline({ financingId: created.id, ...link }));
      } catch (err: any) {
        failures.push(err.message || String(err));
      }
    }
    if (failures.length > 0) {
      alert(
        `O contrato foi salvo, mas ${failures.length} placa(s) não puderam ser vinculadas:\n- ${failures.join(
          '\n- '
        )}\n\nVincule as placas novamente pelos detalhes do contrato.`
      );
    }
    return created;
  };

  const updateFinancing: FinancingContextType['updateFinancing'] = async (id, data) => {
    try {
      ensureOnline();
      const saved = await updateFinancingOnline(id, data);
      setFinancings((prev) => prev.map((f) => (f.id === id ? saved : f)));
    } catch (err: any) {
      alert(`Não foi possível atualizar o financiamento: ${err.message || err}`);
      throw err;
    }
  };

  const addFinancingVehicle: FinancingContextType['addFinancingVehicle'] = async (financingId, link) => {
    try {
      ensureOnline();
      upsertLink(await insertFinancingVehicleOnline({ financingId, ...link }));
    } catch (err: any) {
      alert(`Não foi possível vincular a placa: ${err.message || err}`);
      throw err;
    }
  };

  const endFinancingVehicle: FinancingContextType['endFinancingVehicle'] = async (linkId, endDate) => {
    try {
      ensureOnline();
      upsertLink(await endFinancingVehicleOnline(linkId, endDate));
    } catch (err: any) {
      alert(`Não foi possível encerrar o vínculo: ${err.message || err}`);
      throw err;
    }
  };

  const generateInstallments: FinancingContextType['generateInstallments'] = async (financingId) => {
    try {
      ensureOnline();
      const generated = await generateFinancingInstallmentsOnline(financingId);
      setInstallments((prev) => [...prev.filter((p) => p.financingId !== financingId), ...generated]);
      return generated.length;
    } catch (err: any) {
      alert(`Não foi possível gerar as parcelas: ${err.message || err}`);
      throw err;
    }
  };

  return (
    <FinancingContext.Provider
      value={{
        financings,
        financingVehicles,
        installments,
        allocations,
        isLoadingFinancing,
        financingError,
        reloadFinancing,
        addFinancing,
        updateFinancing,
        addFinancingVehicle,
        endFinancingVehicle,
        generateInstallments,
      }}
    >
      {children}
    </FinancingContext.Provider>
  );
};

export const useFinancing = (): FinancingContextType => {
  const context = useContext(FinancingContext);
  if (!context) {
    throw new Error('useFinancing must be used within a FinancingProvider');
  }
  return context;
};
