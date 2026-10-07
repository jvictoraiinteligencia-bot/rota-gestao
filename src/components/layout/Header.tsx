import React from 'react';
import { Menu, Plus, TrendingUp, Database, Radio, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenTripModal: () => void;
  onOpenExpenseModal: () => void;
}

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard Executivo',
    subtitle: 'Visão geral consolidada de faturamento, despesas e margem operacional',
  },
  vehicles: {
    title: 'Cadastro de Veículos & Placas',
    subtitle: 'Frota ativa, agregados, faturamento e despesas acumuladas por placa',
  },
  drivers: {
    title: 'Cadastro de Motoristas',
    subtitle: 'Desempenho de condutores, CNH, faturamento e despesas relacionadas',
  },
  branches: {
    title: 'Cadastro de Filiais Responsáveis',
    subtitle: 'Gestão de unidades operacionais, gerentes responsáveis e centros de custos',
  },
  clients: {
    title: 'Cadastro de Clientes',
    subtitle: 'Gerencie os clientes atendidos pela transportadora.',
  },
  blocks: {
    title: 'Cadastro de Blocos',
    subtitle: 'Blocos operacionais utilizados na identificação das rotas (CLIENTE + BLOCO + ROTA)',
  },
  'routes-pricing': {
    title: 'Rotas, Tipos de Veículos & Tabela de Fretes',
    subtitle: 'Cadastros operacionais e precificação automática por rota e tipo de carro',
  },
  trips: {
    title: 'Lançamento de Viagens & Fretes',
    subtitle: 'Controle de fretes realizados, quilometragem e indicadores por KM',
  },
  expenses: {
    title: 'Lançamento de Despesas',
    subtitle: 'Custos operacionais por categoria, fornecedor e placa',
  },
  'vehicle-analysis': {
    title: 'Análise Individual por Placa',
    subtitle: 'DRE operacional detalhada, margem e composição de custos do veículo',
  },
  reports: {
    title: 'Relatórios Gerenciais & Exportação',
    subtitle: 'Demonstrativos para tomada de decisão e exportação em CSV/Excel',
  },
};

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  onOpenTripModal,
  onOpenExpenseModal,
}) => {
  const {
    activeView,
    kpis,
    isOnlineConnected,
    isLoadingOnline,
    loadingMessage,
    onlineError,
    clearOnlineError,
    setSupabaseModalOpen,
  } = useTransport();

  const currentViewMeta = VIEW_TITLES[activeView] || VIEW_TITLES.dashboard;

  return (
    <div className="sticky top-0 z-30">
      {/* Online Status / Error Banners */}
      {isLoadingOnline && (
        <div className="bg-blue-600 text-white text-xs px-4 py-1.5 flex items-center justify-center gap-2 font-medium">
          <RefreshCw size={12} className="animate-spin" />
          <span>{loadingMessage || 'Sincronizando dados com Supabase PostgreSQL...'}</span>
        </div>
      )}

      {onlineError && (
        <div className="bg-amber-600 text-white text-xs px-4 py-1.5 flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{onlineError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSupabaseModalOpen(true)}
              className="underline text-[11px] font-bold hover:text-amber-100"
            >
              Configurar Banco
            </button>
            <button onClick={clearOnlineError} className="p-0.5 hover:text-amber-200">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
        {/* Zone 1: Mobile Hamburger & Title / Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>RotaGestão</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">{currentViewMeta.title}</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight hidden sm:block">
              {currentViewMeta.title}
            </h2>
          </div>
        </div>

        {/* Zone 2: Supabase Online Status & Margin Pill */}
        <div className="hidden md:flex items-center gap-3">
          {/* Supabase Status Pill */}
          <button
            onClick={() => setSupabaseModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${
              isOnlineConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
            title="Gerenciar conexão com Supabase PostgreSQL"
          >
            <Database size={13} className={isOnlineConnected ? 'text-emerald-600' : 'text-amber-600'} />
            <span>{isOnlineConnected ? 'Supabase Online' : 'Conectar Supabase'}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isOnlineConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
          </button>

          {/* Quick Profit Pill */}
          <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg">
            <span className="text-slate-500">Resultado Atual:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {formatCurrency(kpis.lucroOperacional)}
            </span>
            <span className="text-slate-300">·</span>
            <span
              className={`font-semibold font-mono tabular-nums ${
                kpis.margemPercent >= 20
                  ? 'text-emerald-700'
                  : kpis.margemPercent > 0
                  ? 'text-blue-700'
                  : 'text-rose-600'
              }`}
            >
              {formatPercent(kpis.margemPercent)} margem
            </span>
          </div>
        </div>

        {/* Zone 3: Primary Action buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile Supabase icon */}
          <button
            onClick={() => setSupabaseModalOpen(true)}
            className="md:hidden p-2 rounded-md text-slate-700 hover:bg-slate-100 border border-slate-200"
            title="Conexão Supabase"
          >
            <Database size={16} className={isOnlineConnected ? 'text-emerald-600' : 'text-amber-600'} />
          </button>

          <button
            onClick={onOpenExpenseModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Plus size={14} className="text-slate-500" />
            <span>Lançar Despesa</span>
          </button>

          <button
            onClick={onOpenTripModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus size={14} />
            <span>Nova Viagem</span>
          </button>
        </div>
      </header>
    </div>
  );
};
