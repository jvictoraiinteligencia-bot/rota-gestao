import React from 'react';
import {
  LayoutDashboard,
  Truck,
  Users,
  Building2,
  Compass,
  Navigation,
  Receipt,
  LineChart,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Database,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { ActiveView } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  onOpenTripModal: () => void;
  onOpenExpenseModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onCloseMobile,
  onOpenTripModal,
  onOpenExpenseModal,
}) => {
  const {
    activeView,
    setActiveView,
    vehicles,
    drivers,
    branches,
    trips,
    expenses,
    freightPricing,
    isOnlineConnected,
    setSupabaseModalOpen,
    resetToDefaultData,
  } = useTransport();

  const navItems: Array<{
    id: ActiveView;
    label: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
    badge?: number | string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vehicles', label: 'Veículos & Placas', icon: Truck, badge: vehicles.length },
    { id: 'drivers', label: 'Motoristas', icon: Users, badge: drivers.length },
    { id: 'branches', label: 'Filiais Responsáveis', icon: Building2, badge: branches.length },
    { id: 'routes-pricing', label: 'Rotas & Tabela Fretes', icon: Compass, badge: freightPricing.length },
    { id: 'trips', label: 'Viagens & Fretes', icon: Navigation, badge: trips.length },
    { id: 'expenses', label: 'Lançar Despesas', icon: Receipt, badge: expenses.length },
    { id: 'vehicle-analysis', label: 'Análise por Placa', icon: LineChart },
    { id: 'reports', label: 'Relatórios & Exportar', icon: FileSpreadsheet },
  ];

  const handleNavClick = (viewId: ActiveView) => {
    setActiveView(viewId);
    onCloseMobile();
  };

  const handleResetData = () => {
    if (window.confirm('Deseja restaurar os dados de demonstração iniciais? Isso reiniciará os lançamentos padrão.')) {
      resetToDefaultData();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Truck size={18} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              RotaGestão
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Gestão de Transportadora</p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="p-4 space-y-2 border-b border-slate-800/60">
          <button
            onClick={() => {
              onOpenTripModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-xs"
          >
            <span>+ Nova Viagem</span>
          </button>
          <button
            onClick={() => {
              onOpenExpenseModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60"
          >
            <span>+ Nova Despesa</span>
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navegação Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info & demo reset */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-xs space-y-2">
          {/* Supabase status button */}
          <button
            onClick={() => {
              setSupabaseModalOpen(true);
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors ${
              isOnlineConnected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/50'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/50 hover:bg-amber-900/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database size={13} className={isOnlineConnected ? 'text-emerald-400' : 'text-amber-400'} />
              <span>{isOnlineConnected ? 'Supabase Online' : 'Conectar Banco'}</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                isOnlineConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </button>

          <button
            onClick={handleResetData}
            title="Recarregar dados originais da frota para teste"
            className="w-full flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-medium text-slate-500 hover:text-slate-300 rounded transition-colors"
          >
            <RotateCcw size={11} />
            <span>Restaurar Amostra</span>
          </button>
        </div>
      </aside>
    </>
  );
};
