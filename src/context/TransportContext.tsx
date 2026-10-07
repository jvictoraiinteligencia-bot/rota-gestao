import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Vehicle,
  Driver,
  Trip,
  Expense,
  Branch,
  VehicleTypeModel,
  RouteModel,
  ClientModel,
  BlockModel,
  FreightPricing,
  FreightPriceHistory,
  FilterState,
  ActiveView,
  PeriodFilter,
  ExpenseCategory,
} from '../types';
import { getSupabase, getSupabaseCredentials } from '../lib/supabase';
import { formatMonthLabel, getRecentMonthKeys } from '../utils/formatters';
import { findDuplicateActiveTariff } from '../utils/freightPricing';
import {
  getBranchesOnline,
  insertBranchOnline,
  updateBranchOnline,
  deleteBranchOnline,
  getVehicleTypesOnline,
  insertVehicleTypeOnline,
  updateVehicleTypeOnline,
  deleteVehicleTypeOnline,
  getVehiclesOnline,
  insertVehicleOnline,
  updateVehicleOnline,
  deleteVehicleOnline,
  getDriversOnline,
  insertDriverOnline,
  updateDriverOnline,
  deleteDriverOnline,
  getClientsOnline,
  insertClientOnline,
  updateClientOnline,
  setClientStatusOnline,
  getBlocksOnline,
  insertBlockOnline,
  updateBlockOnline,
  setBlockStatusOnline,
  getRoutesOnline,
  insertRouteOnline,
  updateRouteOnline,
  deleteRouteOnline,
  getFreightPricingOnline,
  insertFreightPricingOnline,
  updateFreightPricingOnline,
  deleteFreightPricingOnline,
  getTripsOnline,
  insertTripOnline,
  updateTripOnline,
  deleteTripOnline,
  getExpensesOnline,
  insertExpenseOnline,
  updateExpenseOnline,
  deleteExpenseOnline,
} from '../services/supabaseService';

// Browser cache keys that must be purged: data is loaded exclusively from Supabase.
const LEGACY_LOCAL_DATA_KEYS = [
  'rotagestao_branches_v1',
  'rotagestao_vehicles_v1',
  'rotagestao_drivers_v1',
  'rotagestao_trips_v1',
  'rotagestao_expenses_v1',
  'rotagestao_vehicle_types_v1',
  'rotagestao_routes_v1',
  'rotagestao_freight_pricing_v1',
];

export interface BranchFinancialStats {
  branch: Branch;
  veiculosCount: number;
  motoristasCount: number;
  viagensCount: number;
  kmTotal: number;
  faturamento: number;
  despesas: number;
  lucro: number;
  margem: number;
}

interface VehicleFinancialStats {
  vehicle: Vehicle;
  faturamento: number;
  despesas: number;
  lucro: number;
  margem: number;
  viagens: number;
  km: number;
  faturamentoPorKm: number;
  custoPorKm: number;
  lucroPorKm: number;
  faturamentoMedioViagem: number;
  despesasPorCategoria: Record<ExpenseCategory, number>;
}

interface DriverFinancialStats {
  driver: Driver;
  viagens: number;
  faturamento: number;
  despesas: number;
  km: number;
  faturamentoMedioViagem: number;
}

interface TransportContextType {
  // Navigation & View
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedVehicleIdForAnalysis: string;
  setSelectedVehicleIdForAnalysis: (id: string) => void;
  navigateToVehicleAnalysis: (plateOrId: string) => void;
  selectedDriverIdForDetail: string | null;
  setSelectedDriverIdForDetail: (id: string | null) => void;

  // Supabase Online Status
  isOnlineConnected: boolean;
  setIsOnlineConnected: (val: boolean) => void;
  isLoadingOnline: boolean;
  loadingMessage: string;
  onlineError: string | null;
  clearOnlineError: () => void;
  reloadOnlineData: () => Promise<void>;
  refreshRoutes: () => Promise<void>;
  supabaseModalOpen: boolean;
  setSupabaseModalOpen: (val: boolean) => void;

  // Data
  branches: Branch[];
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  expenses: Expense[];
  vehicleTypes: VehicleTypeModel[];
  routes: RouteModel[];
  clients: ClientModel[];
  activeClients: ClientModel[];
  blocks: BlockModel[];
  activeBlocks: BlockModel[];
  blocksError: string | null;
  freightPricing: FreightPricing[];

  // Filter State
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;

  // Filtered Data
  filteredTrips: Trip[];
  filteredExpenses: Expense[];

  // Global KPIs based on current filters
  kpis: {
    faturamentoTotal: number;
    totalDespesas: number;
    lucroOperacional: number;
    margemPercent: number;
    quantidadeViagens: number;
    kmTotal: number;
    custoPorKm: number;
    faturamentoPorKm: number;
    faturamentoMedioPorViagem: number;
  };

  // Aggregated analytics
  branchesStats: BranchFinancialStats[];
  vehiclesStats: VehicleFinancialStats[];
  driversStats: DriverFinancialStats[];
  monthlyPerformance: Array<{
    monthKey: string;
    monthLabel: string;
    faturamento: number;
    despesas: number;
    lucro: number;
    margem: number;
    viagens: number;
  }>;
  expensesByCategory: Array<{
    category: ExpenseCategory;
    total: number;
    percentage: number;
    count: number;
  }>;

  // CRUD Actions
  addBranch: (branch: Omit<Branch, 'id' | 'createdAt'>) => Promise<void>;
  updateBranch: (id: string, branch: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<void>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;

  addDriver: (driver: Omit<Driver, 'id' | 'createdAt'>) => Promise<void>;
  updateDriver: (id: string, driver: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;

  addTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => Promise<void>;
  updateTrip: (id: string, trip: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;

  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addVehicleType: (data: Omit<VehicleTypeModel, 'id' | 'createdAt'>) => Promise<void>;
  updateVehicleType: (id: string, data: Partial<VehicleTypeModel>) => Promise<void>;
  deleteVehicleType: (id: string) => Promise<void>;
  toggleVehicleTypeStatus: (id: string) => Promise<void>;

  addRoute: (data: Omit<RouteModel, 'id' | 'createdAt'>) => Promise<void>;
  updateRoute: (id: string, data: Partial<RouteModel>) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  toggleRouteStatus: (id: string) => Promise<void>;

  addClient: (data: Omit<ClientModel, 'id' | 'createdAt'>) => Promise<void>;
  updateClient: (id: string, data: Partial<ClientModel>) => Promise<void>;
  toggleClientStatus: (id: string) => Promise<void>;

  addBlock: (data: Omit<BlockModel, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBlock: (id: string, data: Partial<BlockModel>) => Promise<void>;
  toggleBlockStatus: (id: string) => Promise<void>;

  addFreightPricing: (data: Omit<FreightPricing, 'id' | 'createdAt' | 'history'>) => Promise<void>;
  updateFreightPricing: (id: string, data: Partial<FreightPricing>, reason?: string) => Promise<void>;
  deleteFreightPricing: (id: string) => Promise<void>;
  toggleFreightPricingStatus: (id: string) => Promise<void>;

  findFreightTariff: (routeIdOrName: string, vehicleTypeNameOrId: string) => FreightPricing | undefined;
}

const defaultFilterState: FilterState = {
  period: 'all',
  branch: 'all',
  plate: 'all',
  driverId: 'all',
  vehicleType: 'all',
  ownershipType: 'all',
  searchQuery: '',
};

const TransportContext = createContext<TransportContextType | undefined>(undefined);

export const TransportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation states
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedVehicleIdForAnalysis, setSelectedVehicleIdForAnalysis] = useState<string>('');
  const [selectedDriverIdForDetail, setSelectedDriverIdForDetail] = useState<string | null>(null);

  // Supabase Online Status & UI states
  const [isOnlineConnected, setIsOnlineConnected] = useState<boolean>(() => {
    return getSupabaseCredentials().isConfigured;
  });
  const [isLoadingOnline, setIsLoadingOnline] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState<boolean>(false);

  // Filters
  const [filter, setFilter] = useState<FilterState>(defaultFilterState);

  // Data loaded from Supabase
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeModel[]>([]);
  const [routes, setRoutes] = useState<RouteModel[]>([]);
  const [clients, setClients] = useState<ClientModel[]>([]);
  const [blocks, setBlocks] = useState<BlockModel[]>([]);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [freightPricing, setFreightPricing] = useState<FreightPricing[]>([]);

  useEffect(() => {
    try {
      LEGACY_LOCAL_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // storage unavailable (private mode)
    }
  }, []);

  // Online Fetch from Supabase
  const reloadOnlineData = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setIsLoadingOnline(true);
    setOnlineError(null);

    try {
      setLoadingMessage('Carregando filiais da nuvem...');
      setBranches(await getBranchesOnline());

      setLoadingMessage('Carregando tipos de veículos...');
      setVehicleTypes(await getVehicleTypesOnline());

      setLoadingMessage('Carregando frota de veículos...');
      setVehicles(await getVehiclesOnline());

      setLoadingMessage('Carregando motoristas...');
      setDrivers(await getDriversOnline());

      setLoadingMessage('Carregando clientes...');
      setClients(await getClientsOnline());

      // Sem a tabela blocos (migration pendente) o restante do sistema continua carregando.
      setLoadingMessage('Carregando blocos...');
      try {
        setBlocks(await getBlocksOnline());
        setBlocksError(null);
      } catch (blockErr: any) {
        console.warn('Erro ao carregar blocos do Supabase:', blockErr);
        setBlocks([]);
        setBlocksError(blockErr?.message || String(blockErr));
      }

      setLoadingMessage('Carregando rotas operacionais...');
      setRoutes(await getRoutesOnline());

      setLoadingMessage('Carregando tabela de fretes...');
      setFreightPricing(await getFreightPricingOnline());

      setLoadingMessage('Carregando lançamentos de viagens...');
      setTrips(await getTripsOnline());

      setLoadingMessage('Carregando despesas operacionais...');
      setExpenses(await getExpensesOnline());

      setIsOnlineConnected(true);
    } catch (err: any) {
      console.warn('Erro ao carregar dados do Supabase:', err);
      // If table doesn't exist yet, invite user to run schema
      if (err.code === '42P01') {
        setOnlineError(
          'Tabelas não encontradas no Supabase. Execute o script "supabase_schema.sql" no SQL Editor do seu projeto.'
        );
      } else {
        setOnlineError(`Aviso de conexão Supabase: ${err.message || 'Verifique sua conexão e tente novamente.'}`);
      }
    } finally {
      setIsLoadingOnline(false);
      setLoadingMessage('');
    }
  }, []);

  const refreshRoutes = useCallback(async () => {
    if (!getSupabase()) return;
    setRoutes(await getRoutesOnline());
  }, []);

  // Initial load when component mounts
  useEffect(() => {
    if (getSupabaseCredentials().isConfigured) {
      reloadOnlineData();
    }
  }, [reloadOnlineData]);

  // Setup Supabase Realtime subscriptions
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !isOnlineConnected) return;

    try {
      const channel = supabase
        .channel('rotagestao_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'viagens' },
          async () => {
            const freshTrips = await getTripsOnline();
            setTrips(freshTrips);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'despesas' },
          async () => {
            const freshExpenses = await getExpensesOnline();
            setExpenses(freshExpenses);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'veiculos' },
          async () => {
            const freshVehicles = await getVehiclesOnline();
            setVehicles(freshVehicles);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tabela_fretes' },
          async () => {
            const freshPricing = await getFreightPricingOnline();
            setFreightPricing(freshPricing);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }, [isOnlineConnected]);

  // Navigation helpers
  const navigateToVehicleAnalysis = (plateOrId: string) => {
    const match = vehicles.find(
      (v) => v.id === plateOrId || v.plate.toUpperCase() === plateOrId.toUpperCase()
    );
    if (match) {
      setSelectedVehicleIdForAnalysis(match.id);
    }
    setActiveView('vehicle-analysis');
  };

  const resetFilters = () => {
    setFilter(defaultFilterState);
  };

  // Filter evaluation helpers
  const isDateInPeriod = (dateStr: string, period: PeriodFilter, start?: string, end?: string): boolean => {
    if (!dateStr) return false;
    if (period === 'all') return true;

    const itemDate = new Date(dateStr);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (period) {
      case 'thisMonth':
        return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
      case 'lastMonth': {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return (
          itemDate.getFullYear() === lastMonthDate.getFullYear() &&
          itemDate.getMonth() === lastMonthDate.getMonth()
        );
      }
      case 'last30days': {
        const diffMs = now.getTime() - itemDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      case 'thisQuarter': {
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        const qStart = new Date(currentYear, quarterStartMonth, 1);
        const qEnd = new Date(currentYear, quarterStartMonth + 3, 0);
        return itemDate >= qStart && itemDate <= qEnd;
      }
      case 'thisYear':
        return itemDate.getFullYear() === currentYear;
      case 'custom':
        if (start && itemDate < new Date(start)) return false;
        if (end && itemDate > new Date(end + 'T23:59:59')) return false;
        return true;
      default:
        return true;
    }
  };

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (!isDateInPeriod(t.date, filter.period, filter.startDate, filter.endDate)) return false;
      if (filter.branch !== 'all' && t.branch !== filter.branch) return false;
      if (filter.plate !== 'all' && t.plate !== filter.plate) return false;
      if (filter.driverId !== 'all' && t.driverId !== filter.driverId) return false;

      const vehicle = vehicles.find((v) => v.plate === t.plate || v.id === t.vehicleId);
      if (filter.vehicleType !== 'all' && vehicle && vehicle.vehicleType !== filter.vehicleType)
        return false;
      if (filter.ownershipType !== 'all' && vehicle && vehicle.ownershipType !== filter.ownershipType)
        return false;

      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        const match =
          t.plate.toLowerCase().includes(q) ||
          t.driverName.toLowerCase().includes(q) ||
          t.client.toLowerCase().includes(q) ||
          t.origin.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [trips, filter, vehicles]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!isDateInPeriod(e.date, filter.period, filter.startDate, filter.endDate)) return false;
      if (filter.branch !== 'all' && e.branch !== filter.branch) return false;
      if (filter.plate !== 'all' && e.plate !== filter.plate) return false;
      if (filter.driverId !== 'all' && e.driverId && e.driverId !== filter.driverId) return false;

      const vehicle = vehicles.find((v) => v.plate === e.plate || v.id === e.vehicleId);
      if (filter.vehicleType !== 'all' && vehicle && vehicle.vehicleType !== filter.vehicleType)
        return false;
      if (filter.ownershipType !== 'all' && vehicle && vehicle.ownershipType !== filter.ownershipType)
        return false;

      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        const match =
          e.plate.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.supplier.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [expenses, filter, vehicles]);

  // Global KPIs
  const kpis = useMemo(() => {
    const faturamentoTotal = filteredTrips.reduce((acc, t) => acc + (t.freightValue || 0), 0);
    const totalDespesas = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const lucroOperacional = faturamentoTotal - totalDespesas;
    const margemPercent = faturamentoTotal > 0 ? (lucroOperacional / faturamentoTotal) * 100 : 0;
    const quantidadeViagens = filteredTrips.reduce((acc, t) => acc + (t.tripCount || 1), 0);
    const kmTotal = filteredTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
    const custoPorKm = kmTotal > 0 ? totalDespesas / kmTotal : 0;
    const faturamentoPorKm = kmTotal > 0 ? faturamentoTotal / kmTotal : 0;
    const faturamentoMedioPorViagem = quantidadeViagens > 0 ? faturamentoTotal / quantidadeViagens : 0;

    return {
      faturamentoTotal,
      totalDespesas,
      lucroOperacional,
      margemPercent,
      quantidadeViagens,
      kmTotal,
      custoPorKm,
      faturamentoPorKm,
      faturamentoMedioPorViagem,
    };
  }, [filteredTrips, filteredExpenses]);

  // Vehicle Financial Stats
  const vehiclesStats = useMemo(() => {
    return vehicles.map((vehicle) => {
      const vTrips = filteredTrips.filter(
        (t) => t.vehicleId === vehicle.id || t.plate.toUpperCase() === vehicle.plate.toUpperCase()
      );
      const vExpenses = filteredExpenses.filter(
        (e) => e.vehicleId === vehicle.id || e.plate.toUpperCase() === vehicle.plate.toUpperCase()
      );

      const faturamento = vTrips.reduce((acc, t) => acc + (t.freightValue || 0), 0);
      const despesas = vExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const lucro = faturamento - despesas;
      const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
      const viagens = vTrips.reduce((acc, t) => acc + (t.tripCount || 1), 0);
      const km = vTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
      const faturamentoPorKm = km > 0 ? faturamento / km : 0;
      const custoPorKm = km > 0 ? despesas / km : 0;
      const lucroPorKm = km > 0 ? lucro / km : 0;
      const faturamentoMedioViagem = viagens > 0 ? faturamento / viagens : 0;

      const despesasPorCategoria = {} as Record<ExpenseCategory, number>;
      vExpenses.forEach((exp) => {
        despesasPorCategoria[exp.category] = (despesasPorCategoria[exp.category] || 0) + exp.amount;
      });

      return {
        vehicle,
        faturamento,
        despesas,
        lucro,
        margem,
        viagens,
        km,
        faturamentoPorKm,
        custoPorKm,
        lucroPorKm,
        faturamentoMedioViagem,
        despesasPorCategoria,
      };
    });
  }, [vehicles, filteredTrips, filteredExpenses]);

  // Driver Financial Stats
  const driversStats = useMemo(() => {
    return drivers.map((driver) => {
      const dTrips = filteredTrips.filter((t) => t.driverId === driver.id);
      const dExpenses = filteredExpenses.filter((e) => e.driverId === driver.id);

      const faturamento = dTrips.reduce((acc, t) => acc + (t.freightValue || 0), 0);
      const despesas = dExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const viagens = dTrips.reduce((acc, t) => acc + (t.tripCount || 1), 0);
      const km = dTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
      const faturamentoMedioViagem = viagens > 0 ? faturamento / viagens : 0;

      return {
        driver,
        viagens,
        faturamento,
        despesas,
        km,
        faturamentoMedioViagem,
      };
    });
  }, [drivers, filteredTrips, filteredExpenses]);

  // Branch Financial Stats
  const branchesStats = useMemo(() => {
    return branches.map((branch) => {
      const bVehicles = vehicles.filter((v) => v.branch === branch.name);
      const bDrivers = drivers.filter((d) => d.branch === branch.name);
      const bTrips = filteredTrips.filter((t) => t.branch === branch.name);
      const bExpenses = filteredExpenses.filter((e) => e.branch === branch.name);

      const faturamento = bTrips.reduce((acc, t) => acc + (t.freightValue || 0), 0);
      const despesas = bExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const lucro = faturamento - despesas;
      const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
      const viagensCount = bTrips.reduce((acc, t) => acc + (t.tripCount || 1), 0);
      const kmTotal = bTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);

      return {
        branch,
        veiculosCount: bVehicles.length,
        motoristasCount: bDrivers.length,
        viagensCount,
        kmTotal,
        faturamento,
        despesas,
        lucro,
        margem,
      };
    });
  }, [branches, vehicles, drivers, filteredTrips, filteredExpenses]);

  // Monthly Performance
  const monthlyPerformance = useMemo(() => {
    const monthsMap = new Map<
      string,
      { label: string; faturamento: number; despesas: number; viagens: number }
    >();

    getRecentMonthKeys(5).forEach((mKey) => {
      monthsMap.set(mKey, {
        label: formatMonthLabel(mKey),
        faturamento: 0,
        despesas: 0,
        viagens: 0,
      });
    });

    filteredTrips.forEach((trip) => {
      const mKey = trip.date.substring(0, 7);
      const existing = monthsMap.get(mKey) || {
        label: formatMonthLabel(mKey),
        faturamento: 0,
        despesas: 0,
        viagens: 0,
      };
      existing.faturamento += trip.freightValue || 0;
      existing.viagens += trip.tripCount || 1;
      monthsMap.set(mKey, existing);
    });

    filteredExpenses.forEach((exp) => {
      const mKey = exp.date.substring(0, 7);
      const existing = monthsMap.get(mKey) || {
        label: formatMonthLabel(mKey),
        faturamento: 0,
        despesas: 0,
        viagens: 0,
      };
      existing.despesas += exp.amount || 0;
      monthsMap.set(mKey, existing);
    });

    return Array.from(monthsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => {
        const lucro = data.faturamento - data.despesas;
        const margem = data.faturamento > 0 ? (lucro / data.faturamento) * 100 : 0;
        return {
          monthKey: key,
          monthLabel: data.label,
          faturamento: data.faturamento,
          despesas: data.despesas,
          lucro,
          margem,
          viagens: data.viagens,
        };
      });
  }, [filteredTrips, filteredExpenses]);

  // Expenses By Category
  const expensesByCategory = useMemo(() => {
    const catMap = new Map<ExpenseCategory, { total: number; count: number }>();
    const totalAll = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    filteredExpenses.forEach((e) => {
      const current = catMap.get(e.category) || { total: 0, count: 0 };
      current.total += e.amount || 0;
      current.count += 1;
      catMap.set(e.category, current);
    });

    return Array.from(catMap.entries())
      .map(([category, val]) => ({
        category,
        total: val.total,
        percentage: totalAll > 0 ? (val.total / totalAll) * 100 : 0,
        count: val.count,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  // CRUD Actions with online Supabase execution
  const addBranch = async (branchData: Omit<Branch, 'id' | 'createdAt'>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        const created = await insertBranchOnline(branchData);
        setBranches((prev) => [created, ...prev]);
      } else {
        const newB: Branch = {
          ...branchData,
          id: `br-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setBranches((prev) => [newB, ...prev]);
      }
    } catch (err: any) {
      alert(`Não foi possível salvar a filial no Supabase: ${err.message || err}. Verifique sua conexão e tente novamente.`);
      throw err;
    }
  };

  const updateBranch = async (id: string, updated: Partial<Branch>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await updateBranchOnline(id, updated);
      }
      setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    } catch (err: any) {
      alert(`Não foi possível atualizar a filial no banco: ${err.message || err}`);
      throw err;
    }
  };

  const deleteBranch = async (id: string) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await deleteBranchOnline(id);
      }
      setBranches((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(`Erro ao excluir filial: ${err.message || err}`);
      throw err;
    }
  };

  const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        const created = await insertVehicleOnline(vehicleData);
        setVehicles((prev) => [created, ...prev]);
      } else {
        const newV: Vehicle = {
          ...vehicleData,
          id: `veh-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setVehicles((prev) => [newV, ...prev]);
      }
    } catch (err: any) {
      alert(`Não foi possível salvar o veículo no Supabase: ${err.message || err}`);
      throw err;
    }
  };

  const updateVehicle = async (id: string, updated: Partial<Vehicle>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await updateVehicleOnline(id, updated);
      }
      setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updated } : v)));
    } catch (err: any) {
      alert(`Erro ao atualizar veículo: ${err.message || err}`);
      throw err;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await deleteVehicleOnline(id);
      }
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (err: any) {
      alert(`Erro ao excluir veículo: ${err.message || err}`);
      throw err;
    }
  };

  const addDriver = async (driverData: Omit<Driver, 'id' | 'createdAt'>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        const created = await insertDriverOnline(driverData);
        setDrivers((prev) => [created, ...prev]);
      } else {
        const newD: Driver = {
          ...driverData,
          id: `drv-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setDrivers((prev) => [newD, ...prev]);
      }
    } catch (err: any) {
      alert(`Não foi possível salvar o motorista no Supabase: ${err.message || err}`);
      throw err;
    }
  };

  const updateDriver = async (id: string, updated: Partial<Driver>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await updateDriverOnline(id, updated);
      }
      setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
    } catch (err: any) {
      alert(`Erro ao atualizar motorista: ${err.message || err}`);
      throw err;
    }
  };

  const deleteDriver = async (id: string) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await deleteDriverOnline(id);
      }
      setDrivers((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(`Erro ao excluir motorista: ${err.message || err}`);
      throw err;
    }
  };

  const addTrip = async (tripData: Omit<Trip, 'id' | 'createdAt'>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        const created = await insertTripOnline(tripData);
        setTrips((prev) => [created, ...prev]);
      } else {
        const newT: Trip = {
          ...tripData,
          id: `trp-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setTrips((prev) => [newT, ...prev]);
      }
    } catch (err: any) {
      alert(`Não foi possível salvar a viagem no Supabase: ${err.message || err}. Os dados foram mantidos no formulário.`);
      throw err;
    }
  };

  const updateTrip = async (id: string, updated: Partial<Trip>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await updateTripOnline(id, updated);
      }
      setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    } catch (err: any) {
      alert(`Erro ao atualizar viagem: ${err.message || err}`);
      throw err;
    }
  };

  const deleteTrip = async (id: string) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await deleteTripOnline(id);
      }
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(`Erro ao excluir viagem: ${err.message || err}`);
      throw err;
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        const created = await insertExpenseOnline(expenseData);
        setExpenses((prev) => [created, ...prev]);
      } else {
        const newE: Expense = {
          ...expenseData,
          id: `exp-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setExpenses((prev) => [newE, ...prev]);
      }
    } catch (err: any) {
      alert(`Não foi possível salvar a despesa no Supabase: ${err.message || err}`);
      throw err;
    }
  };

  const updateExpense = async (id: string, updated: Partial<Expense>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await updateExpenseOnline(id, updated);
      }
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    } catch (err: any) {
      alert(`Erro ao atualizar despesa: ${err.message || err}`);
      throw err;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await deleteExpenseOnline(id);
      }
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(`Erro ao excluir despesa: ${err.message || err}`);
      throw err;
    }
  };

  const addVehicleType = async (data: Omit<VehicleTypeModel, 'id' | 'createdAt'>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        const created = await insertVehicleTypeOnline(data);
        setVehicleTypes((prev) => [created, ...prev]);
      } else {
        const newVT: VehicleTypeModel = {
          ...data,
          id: `vt-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setVehicleTypes((prev) => [newVT, ...prev]);
      }
    } catch (err: any) {
      alert(`Erro ao salvar tipo de carro: ${err.message || err}`);
      throw err;
    }
  };

  const updateVehicleType = async (id: string, updated: Partial<VehicleTypeModel>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await updateVehicleTypeOnline(id, updated);
      }
      setVehicleTypes((prev) => prev.map((vt) => (vt.id === id ? { ...vt, ...updated } : vt)));
    } catch (err: any) {
      alert(`Erro ao atualizar tipo de carro: ${err.message || err}`);
      throw err;
    }
  };

  const deleteVehicleType = async (id: string) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await deleteVehicleTypeOnline(id);
      }
      setVehicleTypes((prev) => prev.filter((vt) => vt.id !== id));
    } catch (err: any) {
      alert(`Erro ao excluir tipo de carro: ${err.message || err}`);
      throw err;
    }
  };

  const toggleVehicleTypeStatus = async (id: string) => {
    const current = vehicleTypes.find((vt) => vt.id === id);
    if (!current) return;
    const newStatus = current.status === 'Ativo' ? 'Inativo' : 'Ativo';
    await updateVehicleType(id, { status: newStatus });
  };

  const addRoute = async (data: Omit<RouteModel, 'id' | 'createdAt'>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        const created = await insertRouteOnline(data);
        setRoutes((prev) => [created, ...prev]);
      } else {
        const newR: RouteModel = {
          ...data,
          id: `rt-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setRoutes((prev) => [newR, ...prev]);
      }
    } catch (err: any) {
      alert(`Erro ao salvar rota no banco: ${err.message || err}`);
      throw err;
    }
  };

  const updateRoute = async (id: string, updated: Partial<RouteModel>) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await updateRouteOnline(id, updated);
      }
      setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    } catch (err: any) {
      alert(`Erro ao atualizar rota: ${err.message || err}`);
      throw err;
    }
  };

  const deleteRoute = async (id: string) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await deleteRouteOnline(id);
      }
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(`Erro ao excluir rota: ${err.message || err}`);
      throw err;
    }
  };

  const toggleRouteStatus = async (id: string) => {
    const current = routes.find((r) => r.id === id);
    if (!current) return;
    const newStatus = current.status === 'Ativo' ? 'Inativo' : 'Ativo';
    await updateRoute(id, { status: newStatus });
  };

  const activeClients = useMemo(() => clients.filter((c) => c.status === 'Ativo'), [clients]);

  const applyClientUpdate = (saved: ClientModel) => {
    setClients((prev) =>
      prev.map((c) => (c.id === saved.id ? saved : c)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    );
    setRoutes((prev) => prev.map((r) => (r.clientId === saved.id ? { ...r, client: saved.name } : r)));
  };

  const addClient = async (data: Omit<ClientModel, 'id' | 'createdAt'>) => {
    try {
      const created: ClientModel =
        isOnlineConnected && getSupabase()
          ? await insertClientOnline(data)
          : { ...data, id: `cl-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] };
      setClients((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    } catch (err: any) {
      alert(`Não foi possível salvar o cliente no Supabase: ${err.message || err}. Verifique sua conexão e tente novamente.`);
      throw err;
    }
  };

  const updateClient = async (id: string, updated: Partial<ClientModel>) => {
    try {
      const current = clients.find((c) => c.id === id);
      if (!current) return;
      const saved =
        isOnlineConnected && getSupabase() ? await updateClientOnline(id, updated) : { ...current, ...updated, id };
      applyClientUpdate(saved);
    } catch (err: any) {
      alert(`Não foi possível atualizar o cliente no banco: ${err.message || err}`);
      throw err;
    }
  };

  const toggleClientStatus = async (id: string) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;
    const newStatus = current.status === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      const saved =
        isOnlineConnected && getSupabase()
          ? await setClientStatusOnline(id, newStatus)
          : { ...current, status: newStatus as ClientModel['status'] };
      applyClientUpdate(saved);
    } catch (err: any) {
      alert(`Não foi possível alterar o status do cliente: ${err.message || err}`);
      throw err;
    }
  };

  const activeBlocks = useMemo(() => blocks.filter((b) => b.status === 'Ativo'), [blocks]);

  const applyBlockUpdate = (saved: BlockModel) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === saved.id ? saved : b)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    );
    setRoutes((prev) => prev.map((r) => (r.blockId === saved.id ? { ...r, block: saved.name } : r)));
  };

  const addBlock = async (data: Omit<BlockModel, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created: BlockModel =
        isOnlineConnected && getSupabase()
          ? await insertBlockOnline(data)
          : { ...data, id: `bl-${Date.now()}`, createdAt: new Date().toISOString() };
      setBlocks((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setBlocksError(null);
    } catch (err: any) {
      alert(`Não foi possível salvar o bloco: ${err.message || err}`);
      throw err;
    }
  };

  const updateBlock = async (id: string, updated: Partial<BlockModel>) => {
    try {
      const current = blocks.find((b) => b.id === id);
      if (!current) return;
      const saved =
        isOnlineConnected && getSupabase() ? await updateBlockOnline(id, updated) : { ...current, ...updated, id };
      applyBlockUpdate(saved);
    } catch (err: any) {
      alert(`Não foi possível atualizar o bloco: ${err.message || err}`);
      throw err;
    }
  };

  const toggleBlockStatus = async (id: string) => {
    const current = blocks.find((b) => b.id === id);
    if (!current) return;
    const newStatus = current.status === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      const saved =
        isOnlineConnected && getSupabase()
          ? await setBlockStatusOnline(id, newStatus)
          : { ...current, status: newStatus as BlockModel['status'] };
      applyBlockUpdate(saved);
    } catch (err: any) {
      alert(`Não foi possível alterar o status do bloco: ${err.message || err}`);
      throw err;
    }
  };

  const assertNoDuplicateTariff = (routeId: string, vehicleTypeId: string, excludeId?: string) => {
    const duplicate = findDuplicateActiveTariff(freightPricing, routeId, vehicleTypeId, excludeId);
    if (duplicate) {
      throw new Error(
        `já existe uma tarifa ativa para a rota "${duplicate.routeName}" com o tipo de carro "${duplicate.vehicleTypeName}".`
      );
    }
  };

  const addFreightPricing = async (data: Omit<FreightPricing, 'id' | 'createdAt' | 'history'>) => {
    try {
      if (data.status === 'Ativo') assertNoDuplicateTariff(data.routeId, data.vehicleTypeId);
      if (isOnlineConnected && getSupabase()) {
        const created = await insertFreightPricingOnline(data);
        setFreightPricing((prev) => [created, ...prev]);
      } else {
        const newFP: FreightPricing = {
          ...data,
          id: `fp-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
          history: [],
        };
        setFreightPricing((prev) => [newFP, ...prev]);
      }
    } catch (err: any) {
      alert(`Erro ao cadastrar tarifa na tabela de fretes: ${err.message || err}`);
      throw err;
    }
  };

  const updateFreightPricing = async (
    id: string,
    updated: Partial<FreightPricing>,
    reason?: string
  ) => {
    try {
      const current = freightPricing.find((fp) => fp.id === id);
      const prevVal = current ? current.freightValue : undefined;

      if (current) {
        const next = { ...current, ...updated };
        if (next.status === 'Ativo') assertNoDuplicateTariff(next.routeId, next.vehicleTypeId, id);
      }

      let persisted: Partial<FreightPricing> = {};
      if (isOnlineConnected && getSupabase()) {
        const saved = await updateFreightPricingOnline(id, updated, prevVal, reason);
        persisted = {
          routeId: saved.routeId,
          routeName: saved.routeName,
          distanceKm: saved.distanceKm,
          vehicleTypeId: saved.vehicleTypeId,
          vehicleTypeName: saved.vehicleTypeName,
        };
      }

      setFreightPricing((prev) =>
        prev.map((fp) => {
          if (fp.id !== id) return fp;

          let history = fp.history ? [...fp.history] : [];
          if (
            updated.freightValue !== undefined &&
            Number(updated.freightValue) !== Number(fp.freightValue)
          ) {
            const historyItem: FreightPriceHistory = {
              id: `fph-${Date.now()}`,
              priceTableId: id,
              previousValue: Number(fp.freightValue),
              newValue: Number(updated.freightValue),
              changedAt: new Date().toISOString().split('T')[0],
              reason: reason || 'Reajuste de valor na tabela de fretes',
            };
            history = [historyItem, ...history];
          }

          return {
            ...fp,
            ...updated,
            ...persisted,
            updatedAt: new Date().toISOString().split('T')[0],
            history,
          };
        })
      );
    } catch (err: any) {
      alert(`Erro ao atualizar tarifa de frete: ${err.message || err}`);
      throw err;
    }
  };

  const deleteFreightPricing = async (id: string) => {
    try {
      if (isOnlineConnected && getSupabase()) {
        await deleteFreightPricingOnline(id);
      }
      setFreightPricing((prev) => prev.filter((fp) => fp.id !== id));
    } catch (err: any) {
      alert(`Erro ao excluir tarifa de frete: ${err.message || err}`);
      throw err;
    }
  };

  const toggleFreightPricingStatus = async (id: string) => {
    const current = freightPricing.find((fp) => fp.id === id);
    if (!current) return;
    const newStatus = current.status === 'Ativo' ? 'Inativo' : 'Ativo';
    await updateFreightPricing(id, { status: newStatus });
  };

  // Helper to find active tariff for combination: ROTA + TIPO DE CARRO = VALOR DO FRETE
  const findFreightTariff = (
    routeIdOrName: string,
    vehicleTypeNameOrId: string
  ): FreightPricing | undefined => {
    if (!routeIdOrName || !vehicleTypeNameOrId) return undefined;
    const cleanRoute = routeIdOrName.trim().toLowerCase();
    const cleanType = vehicleTypeNameOrId.trim().toLowerCase();

    return freightPricing.find((fp) => {
      if (fp.status !== 'Ativo') return false;
      const matchRoute =
        fp.routeId === routeIdOrName ||
        fp.routeName.toLowerCase() === cleanRoute ||
        fp.routeName.toLowerCase().includes(cleanRoute) ||
        cleanRoute.includes(fp.routeName.toLowerCase());

      const matchType =
        fp.vehicleTypeId === vehicleTypeNameOrId ||
        fp.vehicleTypeName.toLowerCase() === cleanType ||
        fp.vehicleTypeName.toLowerCase().includes(cleanType) ||
        cleanType.includes(fp.vehicleTypeName.toLowerCase());

      return matchRoute && matchType;
    });
  };

  return (
    <TransportContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedVehicleIdForAnalysis,
        setSelectedVehicleIdForAnalysis,
        navigateToVehicleAnalysis,
        selectedDriverIdForDetail,
        setSelectedDriverIdForDetail,
        isOnlineConnected,
        setIsOnlineConnected,
        isLoadingOnline,
        loadingMessage,
        onlineError,
        clearOnlineError: () => setOnlineError(null),
        reloadOnlineData,
        refreshRoutes,
        supabaseModalOpen,
        setSupabaseModalOpen,
        branches,
        vehicles,
        drivers,
        trips,
        expenses,
        vehicleTypes,
        routes,
        clients,
        activeClients,
        blocks,
        activeBlocks,
        blocksError,
        freightPricing,
        filter,
        setFilter,
        resetFilters,
        filteredTrips,
        filteredExpenses,
        kpis,
        branchesStats,
        vehiclesStats,
        driversStats,
        monthlyPerformance,
        expensesByCategory,
        addBranch,
        updateBranch,
        deleteBranch,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addDriver,
        updateDriver,
        deleteDriver,
        addTrip,
        updateTrip,
        deleteTrip,
        addExpense,
        updateExpense,
        deleteExpense,
        addVehicleType,
        updateVehicleType,
        deleteVehicleType,
        toggleVehicleTypeStatus,
        addRoute,
        updateRoute,
        deleteRoute,
        toggleRouteStatus,
        addClient,
        updateClient,
        toggleClientStatus,
        addBlock,
        updateBlock,
        toggleBlockStatus,
        addFreightPricing,
        updateFreightPricing,
        deleteFreightPricing,
        toggleFreightPricingStatus,
        findFreightTariff,
      }}
    >
      {children}
    </TransportContext.Provider>
  );
};

export const useTransport = (): TransportContextType => {
  const context = useContext(TransportContext);
  if (!context) {
    throw new Error('useTransport must be used within a TransportProvider');
  }
  return context;
};
